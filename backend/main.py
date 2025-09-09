# En: backend/main.py
import os
import io
import textwrap
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import speech
import google.generativeai as genai
from sqlalchemy.orm import Session
from typing import List

from database import create_db_and_tables, User, Expense, ChatMessage
from schemas import TextInput, AIChatInput, OnboardingData, ChatMessageResponse
from dependencies import get_db, get_user_or_create, parse_expense_with_gemini
from routers import finance, cultivation, family

app = FastAPI(title="Resi API", version="3.4.0")

create_db_and_tables()

origins = [
    "http://localhost:3000",
    "https://resi-argentina.vercel.app",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(finance.router)
app.include_router(finance.goals_router)
app.include_router(cultivation.router)
app.include_router(family.router)

speech_client = speech.SpeechClient()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

system_prompt_chat = textwrap.dedent("""
    Eres "Resi", un asistente de IA amigable, empático y experto en resiliencia económica y alimentaria para usuarios en Argentina. Tu propósito es empoderar a las personas para que tomen el control de sus finanzas y bienestar.

    Tu personalidad:
    - Tono: Cercano, motivador y práctico. Usá un lenguaje coloquial argentino (ej: "vos" en lugar de "tú", "plata" en lugar de "dinero").
    - Enfoque: Siempre positivo y orientado a soluciones. No juzgues, solo ayudá.
    - Conocimiento: Experto en finanzas personales, ahorro, presupuesto, cultivo orgánico/hidropónico casero y planificación familiar, todo adaptado al contexto argentino (inflación, UVA, etc.).

    Tus reglas:
    1.  Siempre relacioná tus respuestas con los temas centrales de Resi: ahorro, finanzas, presupuesto, cultivo, planificación y bienestar.
    2.  Si el usuario pregunta algo fuera de estos temas (ej: "¿quién ganó el partido de ayer?"), responde amablemente que no es tu área de especialización y redirige la conversación a tus temas centrales. Ejemplo: "No estoy al tanto de los resultados deportivos, ¡pero sí te puedo contar cómo ahorrar para ir a la cancha!"
    3.  Sé conciso y andá al grano. La gente busca soluciones rápidas.
    4.  Utilizá el contexto financiero y el historial de chat que se te proporciona para personalizar tus respuestas y recordar conversaciones pasadas.
    5.  NUNCA uses formato Markdown. No uses asteriscos para negrita, ni guiones para listas, ni ningún otro tipo de formato. Responde siempre en texto plano y natural.
""")

model_chat = genai.GenerativeModel(
    model_name="gemini-1.5-flash-latest",
    system_instruction=system_prompt_chat
)

@app.get("/")
def read_root():
    return {"status": "ok", "version": "3.4.0"}

@app.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        wav_audio_content = await audio_file.read()
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

@app.get("/chat/history", response_model=List[ChatMessageResponse])
def get_chat_history(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    history = db.query(ChatMessage).filter(ChatMessage.user_email == user.email).order_by(ChatMessage.timestamp.asc()).all()
    return history

@app.post("/chat")
async def ai_chat(request: AIChatInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    db.add(ChatMessage(user_email=user.email, sender="user", message=request.question))
    db.commit()

    summary_data = finance.get_dashboard_summary(db=db, user=user)
    summary_text = f"Contexto financiero actual del usuario: Su ingreso es de ${summary_data['income']:,.0f} y ya gastó ${summary_data['total_spent']:,.0f} este mes."
    
    chat_history_db = db.query(ChatMessage).filter(ChatMessage.user_email == user.email).order_by(ChatMessage.timestamp.desc()).limit(10).all()
    chat_history_db.reverse()

    history_for_ia = [
        {"role": "user", "parts": [summary_text]},
        {"role": "model", "parts": ["¡Entendido! Tengo el resumen financiero del usuario. Estoy listo para ayudar."]}
    ]
    for msg in chat_history_db:
        role = "user" if msg.sender == "user" else "model"
        history_for_ia.append({"role": role, "parts": [msg.message]})

    chat = model_chat.start_chat(history=history_for_ia)
    
    try:
        response_model = await chat.send_message_async(request.question)
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
async def onboarding_complete(onboarding_data: OnboardingData, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    user.has_completed_onboarding = True
    db.commit()
    return {"status": "Información guardada con éxito"}