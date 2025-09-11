import os
import io
import textwrap
import json
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import speech
import google.generativeai as genai
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from database import create_db_and_tables, User, Expense, ChatMessage, BudgetItem, FamilyPlan, GameProfile, Achievement, UserAchievement, CultivationPlan
from schemas import TextInput, AIChatInput, OnboardingData, ChatMessageResponse
from dependencies import get_db, get_user_or_create, parse_expense_with_gemini, award_achievement
from routers import finance, cultivation, family, market_data, gamification

app = FastAPI(title="Resi API", version="4.0.0")

@app.on_event("startup")
async def startup_event():
    await create_db_and_tables()

# CORRECCIÓN: Se añade la URL del frontend a los orígenes permitidos
origins = [
    "http://localhost:3000",
    "https://resi-argentina.vercel.app",  # <-- AÑADIDO
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(finance.router)
app.include_router(finance.goals_router)
app.include_router(cultivation.router)
app.include_router(family.router)
app.include_router(market_data.router)
app.include_router(gamification.router)

speech_client = speech.SpeechClient()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
system_prompt_chat = textwrap.dedent("""
    Eres "Resi", un asistente de IA amigable, empático y experto en resiliencia económica y alimentaria para usuarios en Argentina. Tu propósito es empoderar a las personas para que tomen el control de sus finanzas y bienestar.

    Tu personalidad:
    - Tono: Cercano, motivador y práctico. Usá un lenguaje coloquial argentino (ej: "vos" en lugar de "tú", "plata" en lugar de "dinero").
    - Enfoque: Siempre positivo y orientado a soluciones. No juzgues, solo ayudá.
    - Conocimiento: Experto en finanzas personales, ahorro, presupuesto, cultivo casero y planificación familiar, todo adaptado al contexto argentino.

    Herramientas Internas de Resi (Tus propias herramientas):
    - "Módulo Financiero": Incluye un "Planificador" para asignar presupuestos, "Metas de Ahorro" para fijar objetivos, un "Historial" para ver gastos pasados y una sección de "Análisis" con gráficos.
    - "Módulo de Cultivo": Un planificador para que los usuarios creen su propio huerto casero (hidropónico u orgánico) y así puedan producir sus alimentos y ahorrar dinero.
    - "Módulo de Planificación Familiar": Una herramienta que genera planes de comidas, ahorro y ocio adaptados a la familia del usuario.
    - "Registro de Gastos": El usuario puede registrar gastos por voz o texto a través de un botón flotante.

    Ahora tienes acceso a información más profunda del usuario. Úsala para dar consejos increíblemente personalizados:
    - `risk_profile`: Perfil de riesgo del usuario (Conservador, Moderado, Audaz). Adapta tus sugerencias de ahorro e inversión a esto.
    - `long_term_goals`: Metas a largo plazo del usuario (ej: "comprar una casa", "jubilarme a los 60"). Ayúdalo a alinear sus decisiones diarias con estas metas.
    - `last_family_plan`: El último plan familiar que generó. Si pregunta sobre comidas o actividades, básate en este plan.
    - `last_cultivation_plan`: El último plan de cultivo que generó. Si pregunta sobre su huerta, utiliza este plan como base.

    NUEVA CAPACIDAD: CONTEXTO EN TIEMPO REAL
    Al inicio de cada conversación, recibirás un bloque de "CONTEXTO EN TIEMPO REAL" con datos económicos actuales. DEBES usar esta información para que tus consejos sean precisos y valiosos.
    Ejemplo de cómo usar el contexto:
    - Si el usuario pregunta si le conviene comprar dólares, tu respuesta DEBE basarse en la cotización del Dólar Blue que te fue proporcionada.
    - Si un usuario quiere invertir, DEBES mencionar la tasa de plazo fijo actual (próximamente) y compararla con la inflación (próximamente) para evaluar si es una buena opción.
    - MUY IMPORTANTE: Antes de sugerir cualquier herramienta o solución externa, SIEMPRE priorizá y recomendá las "Herramientas Internas de Resi".
""")

model_chat = genai.GenerativeModel(
    model_name="gemini-1.5-flash-latest",
    system_instruction=system_prompt_chat
)

@app.get("/")
def read_root():
    return {"status": "ok", "version": "4.0.0"}

@app.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...), db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
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
            await db.commit()
            await db.refresh(new_expense)
            await award_achievement(user, "first_expense", db)
            return {"status": "Gasto registrado con éxito", "data": parsed_data}
        else:
            return {"status": "No se pudo categorizar el gasto", "data": {"description": full_transcript}}
    except Exception as e:
        print(f"Error detallado en la transcripción: {e}")
        raise HTTPException(status_code=400, detail=f"Error en la transcripción: No se pudo procesar el audio.")

@app.post("/process-text")
async def process_text(input_data: TextInput, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    parsed_data = await parse_expense_with_gemini(input_data.text, db, user.email)
    if parsed_data:
        new_expense = Expense(user_email=user.email, **parsed_data)
        db.add(new_expense)
        await db.commit()
        await db.refresh(new_expense)
        await award_achievement(user, "first_expense", db)
        return {"status": "Gasto registrado con éxito", "data": parsed_data}
    else:
        return {"status": "No se pudo categorizar el gasto", "data": {"description": input_data.text}}

@app.get("/chat/history", response_model=List[ChatMessageResponse])
async def get_chat_history(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    result = await db.execute(select(ChatMessage).where(ChatMessage.user_email == user.email).order_by(ChatMessage.timestamp.asc()))
    history = result.scalars().all()
    return history

@app.post("/chat")
async def ai_chat(request: AIChatInput, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    db.add(ChatMessage(user_email=user.email, sender="user", message=request.question))
    await db.commit()

    try:
        dolar_data = await market_data.get_dolar_prices()
        real_time_context = f"CONTEXTO EN TIEMPO REAL: El Dólar Blue está a ${dolar_data['blue']['venta']} para la venta. El Dólar Oficial está a ${dolar_data['oficial']['venta']}."
    except Exception as e:
        real_time_context = "CONTEXTO EN TIEMPO REAL: No se pudo obtener la cotización del dólar en este momento."

    summary_data = await finance.get_dashboard_summary(db=db, user=user)
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

    result = await db.execute(select(ChatMessage).where(ChatMessage.user_email == user.email).order_by(ChatMessage.timestamp.desc()).limit(10))
    chat_history_db = result.scalars().all()
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
        response_model = await chat.send_message_async(request.question)
        ai_response_text = response_model.text
        db.add(ChatMessage(user_email=user.email, sender="ai", message=ai_response_text))
        await db.commit()
        return {"response": ai_response_text}
    except Exception as e:
        print(f"Error al procesar la solicitud con la IA: {e}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la solicitud con la IA: {e}")

@app.get("/check-onboarding")
async def check_onboarding_status(db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    return {"onboarding_completed": user.has_completed_onboarding if user else False}

@app.post("/onboarding-complete")
async def onboarding_complete(onboarding_data: OnboardingData, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    user.has_completed_onboarding = True
    user.risk_profile = onboarding_data.risk_profile
    user.long_term_goals = onboarding_data.long_term_goals
    
    result = await db.execute(select(BudgetItem).where(BudgetItem.user_email == user.email, BudgetItem.category == "_income"))
    income_item = result.scalars().first()
    if income_item:
        income_item.allocated_amount = onboarding_data.income
    else:
        db.add(BudgetItem(category="_income", allocated_amount=onboarding_data.income, user_email=user.email))
    
    await db.commit()
    
    return {"status": "Información guardada con éxito"}
