# En: backend/routers/cultivation.py
from fastapi import APIRouter, Depends, HTTPException
import random
from sqlalchemy.orm import Session
import json
from typing import Optional 

from database import User, CultivationPlan
from schemas import CultivationPlanRequest, AIChatInput, ValidateParamsRequest, CultivationPlanResponse, CultivationPlanResult
from dependencies import get_db, get_user_or_create, generate_plan_with_gemini, award_achievement, validate_parameters_with_gemini

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
    # CORRECCIÓN: Se pasa el argumento 'db' y 'user' a la función de la IA.
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