# En: backend/dependencies.py
from fastapi import Depends, HTTPException, Header, status, Request
from sqlalchemy.orm import Session
from typing import Optional
import json
import textwrap
import google.generativeai as genai

from .database import SessionLocal, User, BudgetItem
from .schemas import ExpenseData

# Dependencia para obtener la sesión de la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependencia para obtener y verificar el email del usuario desde el token
def get_current_user_email(request: Request, authorization: Optional[str] = Header(None)):
    if request.method == "OPTIONS": return None
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de autorización faltante o inválido.")
    return authorization.split(" ")[1]

# Dependencia para obtener el objeto User de la base de datos o crearlo si no existe
def get_user_or_create(user_email: str = Depends(get_current_user_email), db: Session = Depends(get_db)):
    if user_email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se pudo verificar el email del usuario.")
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        new_user = User(email=user_email, has_completed_onboarding=False)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    return user

# Lógica de categorización de gastos con Gemini
async def parse_expense_with_gemini(text: str, db: Session, user_email: str) -> Optional[dict]:
    budget_items = db.query(BudgetItem.category).filter(BudgetItem.user_email == user_email, BudgetItem.category != "_income").all()
    user_categories = [item[0] for item in budget_items]
    valid_categories = list(set([
        "Vivienda", "Servicios Básicos", "Supermercado", "Kioscos", "Transporte", "Salud",
        "Deudas", "Préstamos", "Entretenimiento", "Hijos", "Mascotas", "Cuidado Personal",
        "Vestimenta", "Ahorro", "Inversión", "Otros"
    ] + user_categories))

    system_prompt_expense = textwrap.dedent(f"""
        Eres un asistente experto en finanzas para un usuario en Argentina.
        Tu tarea es analizar una frase que describe un gasto y extraer los detalles en un formato JSON estricto.
        La descripción debe ser la frase original del usuario, sin alteraciones.
        El monto debe ser un número, sin símbolos de moneda.
        La categoría DEBE ser una de la siguiente lista: {valid_categories}.
        Si la frase no encaja claramente en ninguna categoría, DEBES usar "Otros". No inventes categorías nuevas.
    """)

    model_expense = genai.GenerativeModel(
        model_name="gemini-1.5-flash-latest",
        system_instruction=system_prompt_expense,
        generation_config={"response_mime_type": "application/json"}
    )
    try:
        response = await model_expense.generate_content_async(f"Analiza: '{text}'")
        expense_data = json.loads(response.text)
        validated_data = ExpenseData(**expense_data)
        validated_data.description = text
        return validated_data.dict()
    except Exception as e:
        print(f"Error al procesar con Gemini para gastos: {e}")
        return None