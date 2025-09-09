# En: backend/main.py
# VERSIÓN FINAL MODULARIZADA Y CON IMPORTACIONES ABSOLUTAS
import os
import io
import textwrap
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import speech
import google.generativeai as genai
from sqlalchemy.orm import Session

# --- Importaciones de nuestros nuevos módulos ---
from database import create_db_and_tables, User, Expense
from schemas import TextInput, AIChatInput, OnboardingData
from dependencies import get_db, get_user_or_create, parse_expense_with_gemini
from routers import finance, cultivation, family

# --- Creación de la aplicación FastAPI ---
app = FastAPI(title="Resi API", version="3.4.0")

# Creamos las tablas de la base de datos al iniciar
create_db_and_tables()

# --- Middlewares ---
origins = [
    "http://localhost:3000",
    "https://resi-argentina.vercel.app",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Incluimos los routers de los módulos ---
app.include_router(finance.router)
app.include_router(finance.goals_router)
app.include_router(cultivation.router)
app.include_router(family.router)

# --- Configuración de IA (Solo lo que necesita el main) ---
speech_client = speech.SpeechClient()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model_chat = genai.GenerativeModel(model_name="gemini-1.5-flash-latest")

# --- ENDPOINTS GLOBALES (No pertenecen a un módulo específico) ---
@app.get("/")
def read_root():
    return {"status": "ok", "version": "3.4.0"}


@app.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        # El backend ahora asume que SIEMPRE recibirá un audio en formato WAV.
        wav_audio_content = await audio_file.read()

        # La configuración para WAV (LINEAR16) es la más robusta.
        # La frecuencia de muestreo la obtendremos del propio archivo WAV, pero 44100 es un estándar seguro.
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=44100, # Usamos un estándar de alta calidad
            language_code="es-AR",
            audio_channel_count=1 # Especificamos que es mono canal
        )

        audio_source = speech.RecognitionAudio(content=wav_audio_content)

        response = speech_client.recognize(config=config, audio=audio_source)
        transcripts = [result.alternatives[0].transcript for result in response.results]

        if not transcripts:
            raise HTTPException(status_code=400, detail="No se pudo entender el audio.")

        full_transcript = " ".join(transcripts)
        parsed_data = await parse_expense_with_gemini(full_transcript, db, user.email)

        if parsed_data:
            new_expense = Expense(user_email=user.email, **parsed_data)
            db.add(new_expense)
            db.commit()
            db.refresh(new_expense)
            return {"status": "Gasto registrado con éxito", "data": parsed_data}
        else:
            return {"status": "No se pudo categorizar el gasto", "data": {"description": full_transcript}}

    except Exception as e:
        print(f"Error detallado en la transcripción: {e}")
        raise HTTPException(status_code=400, detail=f"Error en la transcripción: No se pudo procesar el audio.")

@app.post("/process-text")
async def process_text(input_data: TextInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    parsed_data = await parse_expense_with_gemini(input_data.text, db, user.email)
    if parsed_data:
        new_expense = Expense(user_email=user.email, **parsed_data)
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        return {"status": "Gasto registrado con éxito", "data": parsed_data}
    else:
        return {"status": "No se pudo categorizar el gasto", "data": {"description": input_data.text}}

@app.post("/chat")
async def ai_chat(request: AIChatInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    summary_data = finance.get_dashboard_summary(db=db, user=user)
    summary_text = f"Resumen financiero del usuario: Ingreso ${summary_data['income']:,.0f}, gastó ${summary_data['total_spent']:,.0f}."
    chat = model_chat.start_chat(history=[
        {"role": "user", "parts": [summary_text]},
        {"role": "model", "parts": ["Entendido. ¿En qué puedo ayudarte?"]}
    ])
    try:
        response_model = await chat.send_message_async(request.question)
        return {"response": response_model.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar la solicitud con la IA: {e}")

@app.get("/check-onboarding")
def check_onboarding_status(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    return {"onboarding_completed": user.has_completed_onboarding if user else False}

@app.post("/onboarding-complete")
async def onboarding_complete(onboarding_data: OnboardingData, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    user.has_completed_onboarding = True
    # Lógica para guardar datos de onboarding si es necesario
    db.commit()
    return {"status": "Información guardada con éxito"}