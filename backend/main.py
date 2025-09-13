# En: backend/main.py
import os
import io
import textwrap
import json
import asyncio
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import speech
from sqlalchemy.orm import Session
from typing import List

from database import create_db_and_tables, User, Expense, ChatMessage, BudgetItem, FamilyPlan, GameProfile, Achievement, UserAchievement, CultivationPlan
from schemas import TextInput, AIChatInput, OnboardingData, ChatMessageResponse, CultivationPlanResponse, CultivationPlanResult, HarvestLogInput, HarvestLogResponse, CultivationTaskInput, CultivationTaskResponse, FamilyPlanRequest, FamilyPlanResponse
from dependencies import get_db, get_user_or_create, parse_expense_with_gemini, award_achievement, generate_plan_with_gemini, validate_parameters_with_gemini, generate_family_plan_with_gemini
from dependencies import model_chat
from routers import finance, cultivation, family, market_data, gamification, community, marketplace, subscription # IMPORTAMOS NUEVOS ROUTERS
from fastapi.staticfiles import StaticFiles # <-- Añade esta línea
import routers.services as services

app = FastAPI(title="Resi API", version="6.0.0") # Versión actualizada

# --- Variables Globales para los Clientes ---
speech_client = None

@app.on_event("startup")
def startup_event():
    """
    Esta función se ejecuta una sola vez cuando la aplicación arranca.
    """
    global speech_client
    
    # 1. Crear tablas de la base de datos
    create_db_and_tables()
    
    # 2. Inicializar cliente de Google Speech
    speech_client = speech.SpeechClient()

    os.makedirs("static/images", exist_ok=True)

# Montar directorio estático después de la inicialización de la app
app.mount("/static", StaticFiles(directory="static"), name="static")

origins = [
    "http://localhost:3000",
    "https://resi-argentina.vercel.app",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(finance.router)
app.include_router(finance.goals_router)
app.include_router(cultivation.router)
app.include_router(family.router)
app.include_router(market_data.router)
app.include_router(gamification.router)
app.include_router(community.router) # AÑADIMOS EL NUEVO ROUTER AQUÍ
app.include_router(marketplace.router) # AÑADIDO
app.include_router(subscription.router) # AÑADIDO

@app.get("/")
def read_root():
    return {"status": "ok", "version": "5.0.0"}

# ... (el resto del archivo main.py permanece sin cambios, incluyendo transcribe_audio, process_text, ai_chat, etc.)
@app.post("/transcribe")
def transcribe_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        wav_audio_content = audio_file.read()
        
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=44100,
            language_code="es-AR",
            audio_channel_count=1
        )
        audio_source = speech.RecognitionAudio(content=wav_audio_content)
        
        response = speech_client.recognize(config=config, audio=audio_source)
        
        transcripts = [result.alternatives[0].transcript for result in response.results]
        if not transcripts:
            raise HTTPException(status_code=400, detail="No se pudo entender el audio.")
            
        full_transcript = " ".join(transcripts)
        parsed_data = parse_expense_with_gemini(full_transcript, db, user.email)
        
        if parsed_data:
            new_expense = Expense(user_email=user.email, **parsed_data)
            db.add(new_expense)
            db.commit()
            db.refresh(new_expense)
            award_achievement(user, "first_expense", db)
            return {"status": "Gasto registrado con éxito", "data": parsed_data}
        else:
            return {"status": "No se pudo categorizar el gasto", "data": {"description": full_transcript}}
            
    except Exception as e:
        print(f"Error detallado en la transcripción: {e}")
        raise HTTPException(status_code=400, detail=f"Error en la transcripción: No se pudo procesar el audio.")

@app.post("/process-text")
def process_text(input_data: TextInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    parsed_data = parse_expense_with_gemini(input_data.text, db, user.email)
    if parsed_data:
        new_expense = Expense(user_email=user.email, **parsed_data)
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        award_achievement(user, "first_expense", db)
        return {"status": "Gasto registrado con éxito", "data": parsed_data}
    else:
        return {"status": "No se pudo categorizar el gasto", "data": {"description": input_data.text}}

@app.get("/chat/history", response_model=List[ChatMessageResponse])
def get_chat_history(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    history = db.query(ChatMessage).filter(ChatMessage.user_email == user.email).order_by(ChatMessage.timestamp.asc()).all()
    return history

@app.post("/chat")
def ai_chat(request: AIChatInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    db.add(ChatMessage(user_email=user.email, sender="user", message=request.question))
    db.commit()

    try:
        dolar_data = market_data.get_dolar_prices()
        real_time_context = f"CONTEXTO EN TIEMPO REAL: El Dólar Blue está a ${dolar_data['blue']['venta']} para la venta. El Dólar Oficial está a ${dolar_data['oficial']['venta']}."
    except Exception as e:
        print(f"ALERTA: No se pudo obtener datos del dólar. Causa: {e}")
        real_time_context = "CONTEXTO EN TIEMPO REAL: La cotización del dólar no está disponible en este momento."

    summary_data = finance.get_dashboard_summary(db=db, user=user)
    financial_context = f"Contexto financiero del usuario: Su ingreso es de ${summary_data['income']:,.0f} y ya gastó ${summary_data['total_spent']:,.0f} este mes."
    risk_profile = user.risk_profile or "no definido"
    long_term_goals = user.long_term_goals or "no definidas"
    last_family_plan = user.last_family_plan or "no se ha generado un plan familiar"
    last_cultivation_plan = user.last_cultivation_plan or "no se ha generado un plan de cultivo"

    profile_context = f"""
    Perfil del usuario:
    - Perfil de riesgo: '{risk_profile}'
    - Metas a largo plazo: '{long_term_goals}'
    - Último plan familiar: {last_family_plan}
    - Último plan de cultivo: {last_cultivation_plan}
    """

    full_context = f"{real_time_context}\n{financial_context}\n{profile_context}"

    chat_history_db = db.query(ChatMessage).filter(ChatMessage.user_email == user.email).order_by(ChatMessage.timestamp.desc()).limit(10).all()
    chat_history_db.reverse()
    history_for_ia = [
        {"role": "user", "parts": [full_context]},
        {"role": "model", "parts": ["Entendido. Tengo el contexto económico y del usuario. Estoy listo para ayudar."]}
    ]
    for msg in chat_history_db:
        role = "user" if msg.sender == "user" else "model"
        history_for_ia.append({"role": role, "parts": [msg.message]})

    chat = model_chat.start_chat(history=history_for_ia)
    
    try:
        response_model = chat.send_message(request.question)
        ai_response_text = response_model.text
        db.add(ChatMessage(user_email=user.email, sender="ai", message=ai_response_text))
        db.commit()
        return {"response": ai_response_text}
    except Exception as e:
        print(f"Error al procesar la solicitud con la IA: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la solicitud con la IA: {e}")

@app.get("/check-onboarding")
def check_onboarding_status(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    return {"onboarding_completed": user.has_completed_onboarding if user else False}

@app.post("/onboarding-complete")
def onboarding_complete(onboarding_data: OnboardingData, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    user.has_completed_onboarding = True
    user.risk_profile = onboarding_data.risk_profile
    user.long_term_goals = onboarding_data.long_term_goals
    
    income_item = db.query(BudgetItem).filter(BudgetItem.user_email == user.email, BudgetItem.category == "_income").first()
    if income_item:
        income_item.allocated_amount = onboarding_data.income
    else:
        db.add(BudgetItem(category="_income", allocated_amount=onboarding_data.income, user_email=user.email))
    
    db.commit()
    
    return {"status": "Información guardada con éxito"}