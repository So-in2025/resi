# En: backend/routers/gamification.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

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
async def get_game_profile(user: User = Depends(get_user_or_create), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.game_profile),
            selectinload(User.user_achievements).selectinload(UserAchievement.achievement_ref)
        )
        .filter(User.email == user.email)
    )
    # CORRECCIÓN: .first() debe ser esperado (awaited)
    user_with_data = await result.scalars().first()

    if not user_with_data.game_profile:
        new_profile = GameProfile(user_email=user_with_data.email)
        db.add(new_profile)
        await db.commit()
        await db.refresh(new_profile)
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
async def earn_coins(coins_to_add: int, user: User = Depends(get_user_or_create), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GameProfile).filter(GameProfile.user_email == user.email))
    # CORRECCIÓN: .first() debe ser esperado (awaited)
    profile = await result.scalars().first()
    
    if profile:
        profile.resilient_coins += coins_to_add
        profile.resi_score += coins_to_add * 2
        await db.commit()
        await db.refresh(profile)
        return {"message": f"Ganaste {coins_to_add} monedas y tu ResiScore aumentó."}
    return {"message": "Perfil de juego no encontrado."}