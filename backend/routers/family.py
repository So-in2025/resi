# En: backend/routers/family.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import json
import random

from database import User, FamilyPlan
from schemas import FamilyPlanRequest, FamilyPlanResponse, MealPlanItem, LeisureSuggestion
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/family-plan",
    tags=["Family Plan"]
)

# CORRECCIÓN: Convertido a async
@router.get("/latest", response_model=FamilyPlanResponse)
async def get_latest_family_plan(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    result = await db.execute(
        select(FamilyPlan).filter(FamilyPlan.user_email == user.email).order_by(FamilyPlan.created_at.desc())
    )
    latest_plan = result.scalars().first()
    
    if not latest_plan or not latest_plan.plan_data:
        return None 
    
    plan_data = json.loads(latest_plan.plan_data)
    
    return FamilyPlanResponse(
        mealPlan=[MealPlanItem(**item) for item in plan_data.get("mealPlan", [])],
        budgetSuggestion=plan_data.get("budgetSuggestion", ""),
        leisureSuggestion=LeisureSuggestion(**plan_data.get("leisureSuggestion", {}))
    )

# CORRECCIÓN: Convertido a async
@router.post("/generate", response_model=FamilyPlanResponse)
async def generate_family_plan(request: FamilyPlanRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    recipes = [
        {"meal": "Guiso de Lentejas Power", "tags": ["económico", "rinde mucho"]},
        {"meal": "Tarta de Espinaca y Ricota", "tags": ["vegetariano", "fácil"]},
        {"meal": "Pollo al Horno con Papas", "tags": ["clásico", "finde"]},
        {"meal": "Milanesas de Berenjena con Puré", "tags": ["saludable", "vegetariano"]},
        {"meal": "Pastel de Papa", "tags": ["clásico", "contundente"]},
        {"meal": "Fideos con Brócoli y Ajo", "tags": ["rápido", "fácil"]},
        {"meal": "Risotto de Hongos", "tags": ["gourmet", "especial"]},
        {"meal": "Empanadas de Humita", "tags": ["regional", "vegetariano"]},
    ]
    
    available_recipes = recipes.copy()
    if "Vegetariano" in request.dietaryPreferences:
        available_recipes = [r for r in available_recipes if "vegetariano" in r["tags"]]
    if request.cookingStyle == "Rápido y Fácil":
        available_recipes = [r for r in available_recipes if "rápido" in r["tags"] or "fácil" in r["tags"]]

    days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
    meal_plan = []
    for day in days:
        if available_recipes:
            chosen_recipe = random.choice(available_recipes)
            available_recipes.remove(chosen_recipe)
            meal_plan.append(MealPlanItem(day=day, meal=chosen_recipe["meal"], tags=chosen_recipe["tags"]))
        else:
            meal_plan.append(MealPlanItem(day=day, meal="Ensalada completa", tags=["rápido", "saludable"]))

    budget_suggestion = "Para empezar, te sugiero crear una categoría de 'Ahorro Familiar' en tu Planificador con un 10% de tus ingresos. ¡Cada peso cuenta!"
    if "vacaciones" in request.financialGoals.lower():
        budget_suggestion = "Para tu meta de 'Vacaciones', creá esa categoría en tu Planificador. Si lográs reducir un 15% los 'Gastos Hormiga' (delivery, kiosco), podrías acelerar el objetivo significativamente."
    elif "saldar" in request.financialGoals.lower():
        budget_suggestion = "Para 'Saldar la tarjeta', atacá siempre más del pago mínimo. Te sugiero asignar un monto fijo en el Planificador para la tarjeta, ¡la constancia es clave para liberarte de esa deuda!"

    leisure_suggestion = LeisureSuggestion(activity="Noche de Pelis en Casa", cost="Casi nulo", description="Una maratón de películas con pochoclos caseros es un planazo que no falla y no cuesta casi nada.")
    if "Aire Libre (parques, bici)" in request.leisureActivities:
        leisure_suggestion = LeisureSuggestion(activity="Bicicleteada y Picnic en la Costanera", cost="Bajo", description="Preparen sandwiches y salgan a pedalear. Es una excelente forma de disfrutar el día en familia sin gastar de más.")
    elif "Juegos de Mesa" in request.leisureActivities:
        leisure_suggestion = LeisureSuggestion(activity="Torneo de Juegos de Mesa", cost="Casi nulo", description="Desempolven el TEG, el Burako o las cartas. Un buen torneo con premios simbólicos puede ser más divertido que cualquier salida.")

    response_data = FamilyPlanResponse(
        mealPlan=meal_plan,
        budgetSuggestion=budget_suggestion,
        leisureSuggestion=leisure_suggestion
    )

    new_plan = FamilyPlan(
        user_email=user.email,
        plan_data=response_data.json() 
    )
    db.add(new_plan)
    
    user.last_family_plan = response_data.json()
    
    await db.commit()

    return response_data