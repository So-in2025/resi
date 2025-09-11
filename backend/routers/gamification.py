# En: backend/routers/gamification.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json

from database import User, GameProfile
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/gamification",
    tags=["Gamification"]
)

class GameProfileResponse(BaseModel):
    resi_score: int
    resilient_coins: int
    financial_points: int
    cultivation_points: int
    community_points: int
    achievements: list # Usaremos un tipo genérico por ahora

    class Config:
        from_attributes = True

@router.get("/", response_model=GameProfileResponse)
def get_game_profile(user: User = Depends(get_user_or_create), db: Session = Depends(get_db)):
    profile = db.query(GameProfile).filter(GameProfile.user_email == user.email).first()
    if not profile:
        profile = GameProfile(user_email=user.email)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Aquí simulamos los logros que el frontend espera
    # En una versión real, esto se obtendría de la base de datos
    mock_achievements = [
        {"achievement": {"id": "first_expense", "name": "Primer Gasto", "description": "Registra tu primer gasto.", "icon": "📝", "points": 1, "type": "finance"}, "progress": 1, "is_completed": True},
        {"achievement": {"id": "five_expenses", "name": "Gasto Constante", "description": "Registra 5 gastos en un mes.", "icon": "🗓️", "points": 5, "type": "finance"}, "progress": 3, "is_completed": False},
        {"achievement": {"id": "first_goal", "name": "Meta de Ahorro", "description": "Crea tu primera meta.", "icon": "🎯", "points": 1, "type": "finance"}, "progress": 1, "is_completed": True},
        {"achievement": {"id": "first_plan", "name": "Planificador de Resi", "description": "Crea tu primer presupuesto.", "icon": "💰", "points": 1, "type": "finance"}, "progress": 1, "is_completed": True},
        {"achievement": {"id": "hydroponics_starter", "name": "Hidroponía Junior", "description": "Inicia un plan de cultivo hidropónico.", "icon": "💧", "points": 1, "type": "cultivation"}, "progress": 0, "is_completed": False},
    ]

    return GameProfileResponse(
        resi_score=profile.resi_score,
        resilient_coins=profile.resilient_coins,
        financial_points=profile.financial_points,
        cultivation_points=profile.cultivation_points,
        community_points=profile.community_points,
        achievements=mock_achievements
    )

@router.post("/earn-coins")
def earn_coins(coins_to_add: int, user: User = Depends(get_user_or_create), db: Session = Depends(get_db)):
    profile = db.query(GameProfile).filter(GameProfile.user_email == user.email).first()
    if profile:
        profile.resilient_coins += coins_to_add
        profile.resi_score += coins_to_add * 2
        db.commit()
        return {"message": f"Ganaste {coins_to_add} monedas y tu ResiScore aumentó."}
    return {"message": "Perfil de juego no encontrado."}