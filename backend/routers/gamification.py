# En: backend/routers/gamification.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
# CORRECCIÓN: Importamos la función 'select' para consultas asíncronas
from sqlalchemy.future import select
# CORRECCIÓN: Importamos el objeto 'aliased' para las relaciones
from sqlalchemy.orm import selectinload

# Importaciones del proyecto
from database import User, GameProfile, Achievement, UserAchievement
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/gamification",
    tags=["Gamification"]
)

# --- SCHEMAS DE RESPUESTA, ajustados para la base de datos real ---

class AchievementSchema(BaseModel):
    id: str
    name: str
    description: str
    icon: Optional[str] = None
    points: int
    type: str
    
class UserAchievementSchema(BaseModel):
    achievement: AchievementSchema
    progress: int
    is_completed: bool
    completion_date: Optional[str] = None

class GameProfileResponse(BaseModel):
    resi_score: int
    resilient_coins: int
    financial_points: int
    cultivation_points: int
    community_points: int
    achievements: List[UserAchievementSchema] = []

    class Config:
        from_attributes = True

# --- ENDPOINTS REALES CON CONSULTAS A LA BASE DE DATOS ---

# CORRECCIÓN: La función ahora es asíncrona (async def)
@router.get("/", response_model=GameProfileResponse)
async def get_game_profile(user: User = Depends(get_user_or_create), db: AsyncSession = Depends(get_db)):
    # Ejecutamos una consulta para obtener el usuario junto con su perfil de juego y logros
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.game_profile),
            selectinload(User.user_achievements).selectinload(UserAchievement.achievement_ref)
        )
        .filter(User.email == user.email)
    )
    user_with_data = result.scalars().first()

    # Si por alguna razón no tiene perfil de juego, se lo creamos
    if not user_with_data.game_profile:
        new_profile = GameProfile(user_email=user_with_data.email)
        db.add(new_profile)
        await db.commit()
        # Es crucial recargar el perfil en la sesión después de crearlo
        await db.refresh(new_profile)
        user_with_data.game_profile = new_profile

    profile = user_with_data.game_profile

    # Mapeamos los logros a su schema de respuesta
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

# CORRECCIÓN: La función ahora es asíncrona (async def)
@router.post("/earn-coins")
async def earn_coins(coins_to_add: int, user: User = Depends(get_user_or_create), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GameProfile).filter(GameProfile.user_email == user.email))
    profile = result.scalars().first()
    
    if profile:
        profile.resilient_coins += coins_to_add
        profile.resi_score += coins_to_add * 2
        await db.commit()
        await db.refresh(profile)
        return {"message": f"Ganaste {coins_to_add} monedas y tu ResiScore aumentó."}
    return {"message": "Perfil de juego no encontrado."}