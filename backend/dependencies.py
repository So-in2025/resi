# En: backend/dependencies.py
from fastapi import Depends, HTTPException, Header, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import json
import textwrap
import google.generativeai as genai
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime

from database import SessionLocal, User, BudgetItem, GameProfile, Achievement, UserAchievement, Expense, SavingGoal
from schemas import ExpenseData, GoalInput, BudgetInput

async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        await db.close()

def get_current_user_email(request: Request, authorization: Optional[str] = Header(None)):
    if request.method == "OPTIONS": return None
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de autorización faltante o inválido.")
    return authorization.split(" ")[1]

async def get_user_or_create(user_email: str = Depends(get_current_user_email), db: AsyncSession = Depends(get_db)):
    if user_email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se pudo verificar el email del usuario.")
    
    result = await db.execute(select(User).where(User.email == user_email))
    user = result.scalars().first()
    
    if not user:
        new_user = User(email=user_email, has_completed_onboarding=False)
        db.add(new_user)
        new_profile = GameProfile(user_email=user_email)
        db.add(new_profile)
        await db.commit()
        await db.refresh(new_user)
        return new_user
    return user

async def award_achievement(user: User, achievement_id: str, db: AsyncSession, progress_to_add: int = 1):
    """
    Función para otorgar y actualizar el progreso de un logro.
    Devuelve un mensaje si el logro fue desbloqueado.
    """
    result = await db.execute(select(Achievement).where(Achievement.id == achievement_id))
    achievement = result.scalars().first()
    if not achievement:
        print(f"Advertencia: Logro '{achievement_id}' no encontrado en la base de datos.")
        return None

    result_user_achiev = await db.execute(
        select(UserAchievement)
        .filter(UserAchievement.user_email == user.email, UserAchievement.achievement_id == achievement_id)
    )
    user_achiev = result_user_achiev.scalars().first()

    if not user_achiev:
        user_achiev = UserAchievement(user_email=user.email, achievement_id=achievement_id)
        db.add(user_achiev)
        await db.flush()

    if not user_achiev.is_completed:
        user_achiev.progress += progress_to_add
        
        result_profile = await db.execute(select(GameProfile).filter(GameProfile.user_email == user.email))
        profile = result_profile.scalars().first()

        if user_achiev.progress >= achievement.points:
            user_achiev.is_completed = True
            user_achiev.completion_date = datetime.utcnow()
            
            if profile:
                if achievement.type == "finance":
                    profile.financial_points += achievement.points
                elif achievement.type == "cultivation":
                    profile.cultivation_points += achievement.points
                elif achievement.type == "community":
                    profile.community_points += achievement.points
                profile.resi_score += achievement.points * 2
                profile.resilient_coins += achievement.points * 5

            await db.commit()
            return f"¡Logro desbloqueado: '{achievement.name}'!"
    
    await db.commit()
    return None

async def parse_expense_with_gemini(text: str, db: AsyncSession, user_email: str) -> Optional[dict]:
    result = await db.execute(select(BudgetItem.category).filter(BudgetItem.user_email == user_email, BudgetItem.category != "_income"))
    budget_items = result.scalars().all()
    user_categories = [item for item in budget_items]
    valid_categories = list(set([
        "Vivienda", "Servicios Básicos", "Supermercado", "Kioscos", "Transporte", "Salud",
        "Deudas", "Préstamos", "Entretenimiento", "Hijos", "Mascotas", "Cuidado Personal",
        "Vestimenta", "Ahorro", "Inversión", "Otros"
    ] + user_categories))

    system_prompt_expense = textwrap.dedent(f"""
        Tu única tarea es analizar una frase de un usuario en Argentina sobre un gasto y devolver un objeto JSON con dos claves: "amount" y "category".
        
        - El "amount" debe ser un número (float o int), sin símbolos de moneda.
        - La "category" DEBE ser una de esta lista: {valid_categories}. No inventes categorías. Si no estás seguro, usa "Otros".
        - NO incluyas la clave "description" en tu respuesta JSON.
        - Responde únicamente con el JSON y nada más.

        Ejemplo de respuesta perfecta:
        {{
          "amount": 5000,
          "category": "Supermercado"
        }}
    """)

    model_expense = genai.GenerativeModel(
        model_name="gemini-1.5-flash-latest",
        system_instruction=system_prompt_expense,
        generation_config={"response_mime_type": "application/json"}
    )
    
    try:
        response = await model_expense.generate_content_async(f"Analiza esta frase: '{text}'")
        parsed_json = json.loads(response.text)

        expense_data = {
            "amount": parsed_json.get("amount"),
            "category": parsed_json.get("category"),
            "description": text
        }
        
        validated_data = ExpenseData(**expense_data)
        
        return validated_data.dict()
        
    except Exception as e:
        print(f"Error al procesar con Gemini o validar los datos: {e}")
        return None