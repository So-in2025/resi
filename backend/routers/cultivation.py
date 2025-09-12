# En: backend/routers/cultivation.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
import random
import json
from typing import Optional, List 

from database import User, CultivationPlan, HarvestLog, CultivationTask
from schemas import CultivationPlanRequest, AIChatInput, ValidateParamsRequest, CultivationPlanResponse, CultivationPlanResult, HarvestLogInput, HarvestLogResponse, CultivationTaskInput, CultivationTaskResponse
from dependencies import get_db, get_user_or_create, generate_plan_with_gemini, award_achievement, validate_parameters_with_gemini
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/cultivation",
    tags=["Cultivation"]
)

@router.get("/latest", response_model=Optional[CultivationPlanResponse])
def get_latest_plan(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """
    Obtiene el último plan de cultivo guardado por el usuario.
    """
    latest_plan = db.query(CultivationPlan).filter(CultivationPlan.user_email == user.email).order_by(CultivationPlan.created_at.desc()).first()
    if not latest_plan:
        return None
    
    plan_data = json.loads(latest_plan.plan_data)
    
    return CultivationPlanResponse(plan_data=plan_data, created_at=latest_plan.created_at)

@router.post("/generate-plan", response_model=CultivationPlanResult)
def generate_cultivation_plan(request: CultivationPlanRequest, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    ai_plan_result = generate_plan_with_gemini(request, db, user)

    new_plan = CultivationPlan(user_email=user.email, plan_data=ai_plan_result.json())
    db.add(new_plan)
    user.last_cultivation_plan = ai_plan_result.json()
    db.commit()
    db.refresh(new_plan)
    
    award_achievement(user, "first_cultivation_plan", db)

    return ai_plan_result

@router.post("/chat")
def cultivation_chat(request: AIChatInput, user: User = Depends(get_user_or_create)):
    question = request.question.lower()
    response, image_prompt = "", ""
    if "plaga" in question or "bicho" in question:
        response = "Para plagas como el pulgón, una solución de agua con jabón potásico es muy efectiva y orgánica. Aplicálo cada 3 días al atardecer."
        image_prompt = "Fotografía macro de pulgones en una hoja de tomate."
    elif "nutrientes" in question or "abono" in question:
        response = "La clave está en el balance. Para crecimiento, más Nitrógeno (N). Para fruto, más Fósforo (P) y Potasio (K). Un compost bien maduro es ideal para orgánico."
        image_prompt = "Gráfico simple mostrando los macronutrientes NPK."
    elif "luz" in question or "sol" in question:
        response = "Hortalizas de fruto como tomates necesitan 6-8 horas de sol directo. Si no las tenés, considerá cultivos de hoja como lechuga o espinaca."
        image_prompt = "Ilustración de un balcón con mucho sol vs uno con poco sol."
    else:
        response = "Es una excelente pregunta. Para darte una respuesta más precisa, ¿podrías darme más detalle sobre tu planta?"
        image_prompt = "Icono de un cerebro de IA con signos de pregunta."
    return {"response": response, "imagePrompt": image_prompt}

@router.post("/validate-parameters")
def validate_cultivation_parameters(request: ValidateParamsRequest, user: User = Depends(get_user_or_create)):
    return validate_parameters_with_gemini(request)

# --- RUTAS PARA EL REGISTRO DE COSECHAS ---
@router.get("/harvests", response_model=List[HarvestLogResponse])
def get_harvest_logs(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    logs = db.query(HarvestLog).filter(HarvestLog.user_email == user.email).order_by(HarvestLog.harvest_date.desc()).all()
    return logs

@router.post("/harvests", response_model=HarvestLogResponse)
def create_harvest_log(log_input: HarvestLogInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    new_log = HarvestLog(user_email=user.email, crop_name=log_input.crop_name, quantity=log_input.quantity, unit=log_input.unit)
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    # Ejemplo de logro: si se registra la primera cosecha
    award_achievement(user, "first_harvest", db)
    return new_log

@router.delete("/harvests/{log_id}")
def delete_harvest_log(log_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    log = db.query(HarvestLog).filter(HarvestLog.id == log_id, HarvestLog.user_email == user.email).first()
    if not log:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro de cosecha no encontrado.")
    db.delete(log)
    db.commit()
    return {"status": "Registro de cosecha eliminado con éxito."}

# --- RUTAS PARA EL CALENDARIO DE TAREAS ---
@router.get("/tasks", response_model=List[CultivationTaskResponse])
def get_cultivation_tasks(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    tasks = db.query(CultivationTask).filter(CultivationTask.user_email == user.email).order_by(CultivationTask.due_date.asc()).all()
    return tasks

@router.post("/tasks", response_model=CultivationTaskResponse)
def create_cultivation_task(task_input: CultivationTaskInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    new_task = CultivationTask(
        user_email=user.email,
        task_name=task_input.task_name,
        crop_name=task_input.crop_name,
        due_date=task_input.due_date
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.patch("/tasks/{task_id}/toggle")
def toggle_task_completion(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    task = db.query(CultivationTask).filter(CultivationTask.id == task_id, CultivationTask.user_email == user.email).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada.")
    task.is_completed = not task.is_completed
    db.commit()
    db.refresh(task)
    return {"status": "Tarea actualizada con éxito.", "is_completed": task.is_completed}

# --- RUTA PARA EL ANÁLISIS DE RENDIMIENTO ---
@router.get("/analysis/monthly-data")
def get_monthly_analysis_data(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    today = datetime.utcnow()
    data = []
    
    for i in range(5, -1, -1): # Últimos 6 meses
        start_of_month = (today - timedelta(days=30*i)).replace(day=1)
        month_name = start_of_month.strftime("%b")
        
        monthly_yield = db.query(func.sum(HarvestLog.quantity)).filter(
            HarvestLog.user_email == user.email,
            HarvestLog.harvest_date >= start_of_month,
            HarvestLog.harvest_date < start_of_month.replace(month=start_of_month.month + 1)
        ).scalar() or 0
        
        # Simulación de ahorro (se podría hacer más complejo)
        monthly_savings = monthly_yield * 2000 # Valor ficticio
        
        data.append({"month": month_name, "yield": monthly_yield, "savings": monthly_savings})
        
    return data