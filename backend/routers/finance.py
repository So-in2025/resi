# En: backend/routers/finance.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from typing import List, Optional
from datetime import datetime, timedelta

from database import User, Expense, BudgetItem, SavingGoal
from schemas import BudgetInput, GoalInput, ResilienceSummary
from dependencies import get_db, get_user_or_create

router = APIRouter(prefix="/finance", tags=["Finance"])
goals_router = APIRouter(prefix="/finance/goals", tags=["Goals"])

@router.get("/budget")
async def get_budget(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    result = await db.execute(select(BudgetItem).where(BudgetItem.user_email == user.email))
    items = result.scalars().all()
    income_item = next((item for item in items if item.category == "_income"), None)
    income = income_item.allocated_amount if income_item else 0
    budget_items = [item for item in items if item.category != "_income"]
    return {"income": income, "items": budget_items}

@router.post("/budget")
async def update_budget(budget_input: BudgetInput, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    if not user.has_completed_onboarding:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Por favor, complete el onboarding primero.")
    
    await db.execute(delete(BudgetItem).where(BudgetItem.user_email == user.email))
    
    db.add(BudgetItem(category="_income", allocated_amount=budget_input.income, user_email=user.email))
    for item_data in budget_input.items:
        db.add(BudgetItem(category=item_data.category, allocated_amount=item_data.allocated_amount, is_custom=item_data.is_custom, user_email=user.email))
    await db.commit()
    return {"status": "Presupuesto guardado con éxito"}

@router.get("/expenses")
async def get_expenses(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    result = await db.execute(select(Expense).where(Expense.user_email == user.email).order_by(Expense.date.desc()))
    return result.scalars().all()

@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    expense = await db.get(Expense, expense_id)
    if not expense or expense.user_email != user.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gasto no encontrado")
    
    await db.delete(expense)
    await db.commit()
    return {"status": "Gasto eliminado con éxito"}

@router.get("/dashboard-summary")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        result_budget = await db.execute(select(BudgetItem).where(BudgetItem.user_email == user.email))
        budget_items = result_budget.scalars().all()
        income = next((item.allocated_amount for item in budget_items if item.category == "_income"), 0)
        today = datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        result_expenses = await db.execute(select(Expense).where(Expense.date >= start_of_month, Expense.user_email == user.email))
        expenses_this_month = result_expenses.scalars().all()
        total_spent = sum(expense.amount for expense in expenses_this_month)
        summary = {}
        icons = {'Vivienda': '🏠', 'Servicios Básicos': '💡', 'Supermercado': '🛒', 'Kioscos': '🍫', 'Transporte': '🚗', 'Salud': '⚕️', 'Deudas': '💳', 'Préstamos': '🏦', 'Entretenimiento': '🎬', 'Hijos': '🧑‍🍼', 'Mascotas': '🐾', 'Cuidado Personal': '🧴', 'Vestimenta': '👕', 'Ahorro': '💰', 'Inversión': '📈', 'Otros': '💸'}
        for budget_item in budget_items:
            if budget_item.category == "_income": continue
            summary[budget_item.category] = { "category": budget_item.category, "allocated": budget_item.allocated_amount, "spent": 0, "icon": icons.get(budget_item.category, '💸')}
        for expense in expenses_this_month:
            cat_capitalized = expense.category.capitalize()
            if cat_capitalized in summary:
                summary[cat_capitalized]["spent"] += expense.amount
        return {"income": income, "total_spent": total_spent, "summary": list(summary.values()), "has_completed_onboarding": user.has_completed_onboarding}
    except Exception:
        return {"income": 0, "total_spent": 0, "summary": [], "has_completed_onboarding": user.has_completed_onboarding}

@router.get("/analysis/resilience-summary", response_model=ResilienceSummary)
async def get_resilience_summary(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        result_budget = await db.execute(select(BudgetItem).where(BudgetItem.user_email == user.email))
        budget_items = result_budget.scalars().all()
        income = next((item.allocated_amount for item in budget_items if item.category == "_income"), 0)
        today = datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        result_expenses = await db.execute(select(Expense).where(Expense.date >= start_of_month, Expense.user_email == user.email))
        expenses_this_month = result_expenses.scalars().all()
        total_spent = sum(expense.amount for expense in expenses_this_month)
        title = "¡Felicitaciones!"
        message = "Tus finanzas están bajo control este mes."
        suggestion = "Seguí así y considerá aumentar tu meta de ahorro en el planificador."
        if income > 0:
            spending_ratio = total_spent / income
            if spending_ratio > 0.9:
                title = "¡Alerta Roja!"
                message = f"Ya gastaste más del 90% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Es momento de revisar tus gastos variables en el 'Historial' para frenar a tiempo."
            elif spending_ratio > 0.7:
                title = "Atención, Zona Amarilla"
                message = f"Estás en un 70% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Moderá los gastos no esenciales por el resto del mes para asegurar que llegues a tu meta de ahorro."
        if expenses_this_month:
            category_spending = {}
            for expense in expenses_this_month:
                category_spending[expense.category] = category_spending.get(expense.category, 0) + expense.amount
            non_actionable_categories = ["Ahorro", "Inversión", "Vivienda", "Servicios Básicos", "Deudas", "Préstamos"]
            actionable_spending = {k: v for k, v in category_spending.items() if k not in non_actionable_categories}
            if actionable_spending:
                top_category = max(actionable_spending, key=actionable_spending.get)
                suggestion += f" Tu mayor gasto variable es en '{top_category}'. ¿Hay alguna oportunidad de optimizarlo?"
        supermarket_spending = sum(e.amount for e in expenses_this_month if e.category == "Supermercado")
        return {"title": title, "message": message, "suggestion": suggestion, "supermarket_spending": supermarket_spending}
    except Exception:
        return {"title": "Sin datos", "message": "Aún no tienes suficiente información para un resumen.", "suggestion": "Completa tu presupuesto y registra tus primeros gastos.", "supermarket_spending": 0}

@router.get("/analysis/monthly-distribution")
async def get_monthly_distribution(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    today = datetime.utcnow()
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(select(Expense.category, func.sum(Expense.amount).label('total_spent')).where(Expense.user_email == user.email, Expense.date >= start_of_month).group_by(Expense.category))
    distribution = result.all()
    return [{"name": item.category, "value": item.total_spent} for item in distribution]

@router.get("/analysis/spending-trend")
async def get_spending_trend(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    spending_trend = []
    today = datetime.utcnow()
    for i in range(3, -1, -1): 
        month_start = (today - timedelta(days=30*i)).replace(day=1)
        month_end = month_start.replace(month=month_start.month + 1) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1)
        month_name = month_start.strftime("%b")
        result = await db.execute(select(Expense.category, func.sum(Expense.amount).label('total_spent')).where(Expense.user_email == user.email, Expense.date >= month_start, Expense.date < month_end).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).limit(5))
        expenses_in_month = result.all()
        month_data = {"name": month_name}
        for expense in expenses_in_month:
            month_data[expense.category] = expense.total_spent
        spending_trend.append(month_data)
    return spending_trend

@goals_router.get("/", response_model=List[dict])
async def get_goals(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    result = await db.execute(select(SavingGoal).where(SavingGoal.user_email == user.email))
    goals = result.scalars().all()
    return [{"id": goal.id, "name": goal.name, "target_amount": goal.target_amount, "current_amount": goal.current_amount} for goal in goals]

@goals_router.post("/")
async def create_goal(goal: GoalInput, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    new_goal = SavingGoal(name=goal.name, target_amount=goal.target_amount, user_email=user.email)
    db.add(new_goal)
    await db.commit()
    await db.refresh(new_goal)
    return new_goal

@goals_router.get("/projection/{goal_id}")
async def get_goal_projection(goal_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    result_budget = await db.execute(select(BudgetItem).where(BudgetItem.user_email == user.email, BudgetItem.category == "Ahorro"))
    ahorro_budget = result_budget.scalars().first()
    monthly_saving = ahorro_budget.allocated_amount if ahorro_budget else 0
    if monthly_saving <= 0:
        return {"months_remaining": -1, "suggestion": "No tenés un monto asignado para 'Ahorro' en tu presupuesto. ¡Andá al Planificador para agregarlo!"}
    
    result_goal = await db.execute(select(SavingGoal).where(SavingGoal.id == goal_id, SavingGoal.user_email == user.email))
    goal = result_goal.scalars().first()
    
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada")
    
    remaining_amount = goal.target_amount - goal.current_amount
    if remaining_amount <= 0:
        return {"months_remaining": 0, "suggestion": "¡Felicitaciones! Ya alcanzaste esta meta."}
    
    months_remaining = round(remaining_amount / monthly_saving)
    suggestion = f"Si seguís ahorrando ${monthly_saving:,.0f} por mes, vas a alcanzar tu meta en aproximadamente {months_remaining} meses."
    
    result_high_expense = await db.execute(select(Expense.category, func.sum(Expense.amount).label('total')).where(Expense.user_email == user.email, Expense.category.notin_(['Ahorro', 'Inversión'])).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).limit(1))
    high_expense_category = result_high_expense.first()
    
    if high_expense_category:
        cut_amount = high_expense_category.total * 0.10
        new_monthly_saving = monthly_saving + cut_amount
        if new_monthly_saving > 0:
            new_months_remaining = round(remaining_amount / new_monthly_saving)
            if new_months_remaining < months_remaining:
                suggestion += f" Pero si lograras reducir un 10% tus gastos en '{high_expense_category.category}', podrías acelerar tu meta a {new_months_remaining} meses. ¿Te animás a intentarlo en el Planificador?"
    
    return {"months_remaining": months_remaining, "suggestion": suggestion}