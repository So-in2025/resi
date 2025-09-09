# En: backend/main.py
# VERSIÓN FINAL MODULARIZADA
import os
import io
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import speech
from pydub import AudioSegment
import google.generativeai as genai

# --- Importaciones de nuestros nuevos módulos ---
from .database import create_db_and_tables, User, Expense
from .schemas import TextInput, AIChatInput
from .dependencies import get_db, get_user_or_create, parse_expense_with_gemini
from .routers import finance, cultivation, family
from sqlalchemy.orm import Session

# --- Creación de la aplicación FastAPI ---
app = FastAPI(title="Resi API", version="3.4.0") # Nueva versión modular

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
app.include_router(finance.goals_router) # Router específico para metas
app.include_router(cultivation.router)
app.include_router(family.router)

# --- Configuración de IA (Solo lo que necesita el main) ---
speech_client = speech.SpeechClient()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model_chat = genai.GenerativeModel(model_name="gemini-1.5-flash-latest")

# --- ENDPOINTS GLOBALES ---
@app.get("/")
def read_root():
    return {"status": "ok", "version": "3.4.0"}

@app.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        webm_audio = await audio_file.read()
        audio = AudioSegment.from_file(io.BytesIO(webm_audio), format="webm")
        wav_audio_content = io.BytesIO()
        audio.export(wav_audio_content, format="wav")
        wav_audio_content.seek(0)

        config = speech.RecognitionConfig(encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16, sample_rate_hertz=audio.frame_rate, language_code="es-AR")
        audio_source = speech.RecognitionAudio(content=wav_audio_content.read())
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
        raise HTTPException(status_code=400, detail=f"Error en la transcripción: {e}")

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
    # Lógica del chat...
    pass

