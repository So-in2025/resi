# En: backend/dependencies.py
from fastapi import Depends, HTTPException, Header, status, Request
# CORRECCIÓN: Importamos AsyncSession y select para consultas asíncronas
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import json
import textwrap
import google.generativeai as genai
from sqlalchemy.future import select

# CORRECCIÓN: Las importaciones ahora son absolutas desde la raíz del 'backend'.
from database import SessionLocal, User, BudgetItem
from schemas import ExpenseData

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

# CORRECCIÓN: La función es asíncrona y usa la nueva sintaxis
async def get_user_or_create(user_email: str = Depends(get_current_user_email), db: AsyncSession = Depends(get_db)):
    if user_email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se pudo verificar el email del usuario.")
    
    # CORRECCIÓN: Se reemplaza db.query por await db.execute(select(User)...)
    result = await db.execute(select(User).where(User.email == user_email))
    user = result.scalars().first()
    
    if not user:
        new_user = User(email=user_email, has_completed_onboarding=False)
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user
    return user

# --- FUNCIÓN ACTUALIZADA ---
async def parse_expense_with_gemini(text: str, db: AsyncSession, user_email: str) -> Optional[dict]:
    # CORRECCIÓN: Se reemplaza db.query por await db.execute(select(BudgetItem)...)
    result = await db.execute(select(BudgetItem.category).filter(BudgetItem.user_email == user_email, BudgetItem.category != "_income"))
    budget_items = result.scalars().all()
    user_categories = [item for item in budget_items]
    valid_categories = list(set([
        "Vivienda", "Servicios Básicos", "Supermercado", "Kioscos", "Transporte", "Salud",
        "Deudas", "Préstamos", "Entretenimiento", "Hijos", "Mascotas", "Cuidado Personal",
        "Vestimenta", "Ahorro", "Inversión", "Otros"
    ] + user_categories))

    # ---- PROMPT MEJORADO Y MÁS ESTRICTO ----
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

        # Creamos el diccionario de datos nosotros mismos para máxima seguridad
        expense_data = {
            "amount": parsed_json.get("amount"),
            "category": parsed_json.get("category"),
            "description": text
        }
        
        # Validamos con Pydantic
        validated_data = ExpenseData(**expense_data)
        
        return validated_data.dict()
        
    except Exception as e:
        print(f"Error al procesar con Gemini o validar los datos: {e}")
        return None