# En: backend/routers/gamification.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import List, Optional

from database import User, GameProfile, Achievement, UserAchievement
from schemas import GameProfileResponse, UserAchievementSchema, AchievementSchema
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/gamification",
    tags=["Gamification"]
)

class AchievementSchema(BaseModel):
    id: str
    name: str
    description: str
    icon: Optional[str] = None
    points: int
    type: str
    class Config:
        from_attributes = True
    
class UserAchievementSchema(BaseModel):
    achievement: AchievementSchema
    progress: int
    is_completed: bool
    completion_date: Optional[str] = None
    class Config:
        from_attributes = True

class GameProfileResponse(BaseModel):
    resi_score: int
    resilient_coins: int
    financial_points: int
    cultivation_points: int
    community_points: int
    achievements: List[UserAchievementSchema] = []

    class Config:
        from_attributes = True

@router.get("/", response_model=GameProfileResponse)
def get_game_profile(user: User = Depends(get_user_or_create), db: Session = Depends(get_db)):
    user_with_data = db.query(User).options(
        joinedload(User.game_profile),
        joinedload(User.user_achievements).joinedload(UserAchievement.achievement_ref)
    ).filter(User.email == user.email).first()

    if not user_with_data:
        raise HTTPException(status_code=404, detail="User not found while fetching game profile")

    if not user_with_data.game_profile:
        # Si el usuario es nuevo y no tiene perfil, se crea uno.
        new_profile = GameProfile(user_email=user.email)
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        user_with_data.game_profile = new_profile

    profile = user_with_data.game_profile

    achievements_list = [
        UserAchievementSchema(
            achievement=AchievementSchema.from_orm(ua.achievement_ref),
            progress=ua.progress,
            is_completed=ua.is_completed,
            completion_date=ua.completion_date.isoformat() if ua.completion_date else None
        )
        for ua in user_with_data.user_achievements
    ]

    return GameProfileResponse(
        resi_score=profile.resi_score,
        resilient_coins=profile.resilient_coins,
        financial_points=profile.financial_points,
        cultivation_points=profile.cultivation_points,
        community_points=profile.community_points,
        achievements=achievements_list
    )

@router.post("/earn-coins")
def earn_coins(coins_to_add: int, user: User = Depends(get_user_or_create), db: Session = Depends(get_db)):
    profile = db.query(GameProfile).filter(GameProfile.user_email == user.email).first()
    
    if profile:
        profile.resilient_coins += coins_to_add
        profile.resi_score += coins_to_add * 2
        db.commit()
        db.refresh(profile)
        return {"message": f"Ganaste {coins_to_add} monedas y tu ResiScore aumentó."}
    return {"message": "Perfil de juego no encontrado."}