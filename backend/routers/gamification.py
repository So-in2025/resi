# En: backend/routers/gamification.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List
# NUEVO: Importamos la función 'select' para consultas asíncronas
from sqlalchemy.future import select
# NUEVO: Importamos el objeto 'aliased' para las relaciones
from sqlalchemy.orm import aliased, selectinload

# Importaciones del proyecto
from database import User, GameProfile, Achievement, UserAchievement
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/gamification",
    tags=["Gamification"]
)

# --- NUEVOS SCHEMAS DE RESPUESTA, ajustados para la base de datos real ---

class AchievementSchema(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    points: int
    type: str
    
class UserAchievementSchema(BaseModel):
    achievement: AchievementSchema
    progress: int
    is_completed: bool
    completion_date: str | None

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

@router.get("/", response_model=GameProfileResponse)
async def get_game_profile(user: User = Depends(get_user_or_create), db: AsyncSession = Depends(get_db)):
    # CORRECCIÓN: Usamos 'select' con 'selectinload' para cargar los logros
    # Esto es más eficiente que hacer múltiples consultas
    result = await db.execute(
        select(GameProfile)
        .options(selectinload(GameProfile.user_achievements).selectinload(UserAchievement.achievement_ref))
        .filter(GameProfile.user_email == user.email)
    )
    profile = result.scalars().first()

    if not profile:
        # Crea un perfil por defecto si no existe
        profile = GameProfile(user_email=user.email)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    
    # Creamos un diccionario para el esquema de respuesta
    response_data = profile.dict()
    response_data['achievements'] = [
        UserAchievementSchema(
            achievement=AchievementSchema.from_orm(ua.achievement_ref),
            progress=ua.progress,
            is_completed=ua.is_completed,
            completion_date=ua.completion_date.isoformat() if ua.completion_date else None
        )
        for ua in profile.user_achievements
    ]

    return GameProfileResponse(**response_data)


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