# En: backend/routers/family.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from typing import Optional 

from database import User, FamilyPlan
from schemas import FamilyPlanRequest, FamilyPlanResponse, MealPlanItem, LeisureSuggestion
from dependencies import get_db, get_user_or_create, generate_family_plan_with_gemini

router = APIRouter(
    prefix="/family-plan",
    tags=["Family Plan"]
)

@router.get("/latest", response_model=Optional[FamilyPlanResponse])
def get_latest_family_plan(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    latest_plan = db.query(FamilyPlan).filter(FamilyPlan.user_email == user.email).order_by(FamilyPlan.created_at.desc()).first()
    
    if not latest_plan or not latest_plan.plan_data:
        return None 
    
    plan_data = json.loads(latest_plan.plan_data)
    
    return FamilyPlanResponse(
        mealPlan=[MealPlanItem(**item) for item in plan_data.get("mealPlan", [])],
        budgetSuggestion=plan_data.get("budgetSuggestion", ""),
        leisureSuggestion=LeisureSuggestion(**plan_data.get("leisureSuggestion", {}))
    )

@router.post("/generate", response_model=FamilyPlanResponse)
def generate_family_plan(request: FamilyPlanRequest, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    response_data = generate_family_plan_with_gemini(request, db, user)

    new_plan = FamilyPlan(
        user_email=user.email,
        plan_data=response_data.json() 
    )
    db.add(new_plan)
    
    user.last_family_plan = response_data.json()
    
    db.commit()

    return response_data