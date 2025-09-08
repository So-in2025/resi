# En: backend/main.py
# Modificado para una máxima productividad, solidez y fiabilidad.

import spacy
import re
import random
# IMPORTANTE: Añadimos la librería 'os' para leer variables de entorno
import os
import io # Agregado para trabajar con bytes de audio
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header, status, Request
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import speech
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, func, ForeignKey
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional
# Agregamos pydub para procesar el audio
from pydub import AudioSegment 

# --- CONFIGURACIÓN DE LA BASE DE DATOS (Producción y Local) ---
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL is None:
    print("No se encontró DATABASE_URL, usando SQLite local.")
    DATABASE_URL = "sqlite:///./resi.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    print("Usando base de datos PostgreSQL de producción.")
    # Corrección para la URL de Render
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Definición de los modelos de la base de datos
class User(Base):
    __tablename__ = "users"
    email = Column(String, primary_key=True, index=True)
    has_completed_onboarding = Column(Boolean, default=False)
    expenses = relationship("Expense", back_populates="owner")
    budget_items = relationship("BudgetItem", back_populates="owner")
    saving_goals = relationship("SavingGoal", back_populates="owner")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String, default="General")
    date = Column(DateTime, default=datetime.utcnow)
    user_email = Column(String, ForeignKey("users.email"))
    owner = relationship("User", back_populates="expenses")

class BudgetItem(Base):
    __tablename__ = "budget_items"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)
    allocated_amount = Column(Float, default=0.0)
    is_custom = Column(Boolean, default=False)
    user_email = Column(String, ForeignKey("users.email"))
    owner = relationship("User", back_populates="budget_items")

class SavingGoal(Base):
    __tablename__ = "saving_goals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    user_email = Column(String, ForeignKey("users.email"))
    owner = relationship("User", back_populates="saving_goals")

Base.metadata.create_all(bind=engine)

# --- CONFIGURACIÓN DE IA Y FASTAPI ---
nlp = spacy.load("es_core_news_sm")
speech_client = speech.SpeechClient()
app = FastAPI(title="Resi API", version="3.1.0")
origins = [
    "http://localhost:3000",
    "https://resi-argentina.vercel.app",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- MODELOS DE DATOS DE ENTRADA (Pydantic) ---
class TextInput(BaseModel): text: str
class BudgetItemInput(BaseModel): category: str; allocated_amount: float; is_custom: bool
class BudgetInput(BaseModel): income: float; items: List[BudgetItemInput]
class OnboardingData(BaseModel): income: float; occupation: str; age: int; familyGroup: int
class GoalInput(BaseModel): name: str; target_amount: float
class CultivationPlanRequest(BaseModel):
    method: str
    space: str
    experience: str
    light: Optional[str] = None
    soilType: Optional[str] = None
    location: str
    initialBudget: float
    supermarketSpending: Optional[float] = 0
class AIChatInput(BaseModel):
    question: str
    method: str
class ValidateParamsRequest(BaseModel):
    method: str
    ph: Optional[float] = None
    ec: Optional[float] = None
    temp: Optional[float] = None
    soilMoisture: Optional[float] = None
class ResilienceSummary(BaseModel):
    title: str
    message: str
    suggestion: str
    supermarket_spending: float
class FamilyMember(BaseModel):
    age: str
    role: str
class FamilyPlanRequest(BaseModel):
    familyMembers: List[FamilyMember]
    dietaryPreferences: List[str]
    financialGoals: str
    leisureActivities: List[str]

# --- DEPENDENCIAS Y AUTENTICACIÓN ---
def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_current_user_email(request: Request, authorization: Optional[str] = Header(None)):
    if request.method == "OPTIONS":
        return None
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autorización faltante o inválido.")
    return authorization.split(" ")[1]

def get_user_or_create(user_email: str = Depends(get_current_user_email), db: Session = Depends(get_db)):
    if user_email is None:
        raise HTTPException(status_code=204, detail="No Content") 
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        print(f"Usuario '{user_email}' no encontrado. Creando nuevo registro.")
        new_user = User(email=user_email, has_completed_onboarding=False)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    return user


# --- LÓGICA DE PROCESAMIENTO DE TEXTO (NLP) ---
def parse_expense_from_text(text: str, db: Session, user_email: str):
    doc = nlp(text.lower())
    amount = None
    determined_category = "Otros"
    for ent in doc.ents:
        if ent.label_ == "MONEY":
            amount_text = re.findall(r'\d+\.?\d*', ent.text)
            if amount_text:
                amount = float(amount_text[0])
                break
    if amount is None:
        for token in doc:
            if token.pos_ == "NUM":
                try:
                    amount = float(token.text)
                    break
                except ValueError:
                    continue
    
    category_keywords = {
        "Vivienda": ["vivienda", "alquiler", "expensas", "abl", "inmobiliaria", "mantenimiento"],
        "Servicios Básicos": ["servicios", "luz", "edesur", "edenor", "gas", "metrogas", "agua", "aysa", "internet", "celular", "telefono"],
        "Supermercado": ["supermercado", "super", "compras", "almacen", "verduleria", "carniceria"],
        "Kioscos": ["kiosco", "quiosco", "cigarrillos", "bebida"],
        "Transporte": ["transporte", "nafta", "sube", "bondi", "colectivo", "taxi", "uber", "tren", "subte"],
        "Salud": ["salud", "obra social", "prepaga", "medicamentos", "farmacia", "medico"],
        "Deudas": ["deudas", "tarjeta", "visa", "mastercard", "amex", "resumen"],
        "Préstamos": ["prestamos", "préstamo", "credito", "crédito", "cuota"],
        "Entretenimiento": ["entretenimiento", "ocio", "cine", "bar", "restaurante", "salida", "delivery"],
        "Hijos": ["hijos", "colegio", "cuota escolar", "utiles", "juguetes", "pañales"],
        "Mascotas": ["mascotas", "alimento de mascota", "veterinario", "pet shop"],
        "Cuidado Personal": ["cuidado personal", "peluqueria", "gimnasio", "gym", "cosmeticos"],
        "Vestimenta": ["vestimenta", "ropa", "zapatillas", "indumentaria", "shopping", "calzado"],
        "Ahorro": ["ahorro", "dolares", "dolar"],
        "Inversión": ["inversion", "inversión", "plazo fijo", "cedear", "acciones", "crypto"]
    }

    custom_categories = [item.category.lower() for item in db.query(BudgetItem).filter(BudgetItem.is_custom == True, BudgetItem.user_email == user_email).all()]
    for cat in custom_categories:
        category_keywords[cat.capitalize()] = [cat]

    for cat, keywords in category_keywords.items():
        if any(keyword in text.lower() for keyword in keywords):
            determined_category = cat.capitalize()
            break
            
    if amount is not None:
        return {"description": text, "amount": amount, "category": determined_category}
    return None

# --- ENDPOINTS GENERALES Y MÓDULO 1: FINANZAS ---
@app.get("/")
def read_root():
    return {"status": "ok", "version": "3.1.0"}

@app.get("/check-onboarding")
def check_onboarding_status(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    return {"onboarding_completed": user.has_completed_onboarding if user else False}

@app.post("/onboarding-complete")
async def onboarding_complete(onboarding_data: OnboardingData, db: Session = Depends(get_db), user_email: str = Depends(get_current_user_email)):
    user = db.query(User).filter(User.email == user_email).first()
    if not user:
        user = User(email=user_email, has_completed_onboarding=True)
        db.add(user)
    else:
        user.has_completed_onboarding = True
        
    income_item = db.query(BudgetItem).filter(BudgetItem.category == "_income", BudgetItem.user_email == user_email).first()

    if income_item:
        income_item.allocated_amount = onboarding_data.income
    else:
        new_income_item = BudgetItem(category="_income", allocated_amount=onboarding_data.income, user_email=user_email)
        db.add(new_income_item)
    
    db.commit()
    return {"status": "Información guardada con éxito"}

@app.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...), db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    # --- CORRECCIÓN: Convertir WEBM a WAV antes de enviar a Google Cloud ---
    try:
        # Leer el contenido del archivo subido (WebM)
        webm_audio = await audio_file.read()

        # Convertir de WebM a WAV en memoria
        audio = AudioSegment.from_file(io.BytesIO(webm_audio), format="webm") # <-- CAMBIO CLAVE
        wav_audio_content = io.BytesIO()
        audio.export(wav_audio_content, format="wav")

        # Rewind the stream to the beginning
        wav_audio_content.seek(0)

        # Crear una instancia de la API de voz con el audio WAV
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=audio.frame_rate,
            language_code="es-AR",
            enable_automatic_punctuation=True
        )
        audio_source = speech.RecognitionAudio(content=wav_audio_content.read())

        # Llama a la API de Google Cloud Speech-to-Text
        response = speech_client.recognize(config=config, audio=audio_source)
        transcripts = [result.alternatives[0].transcript for result in response.results]

        if not transcripts:
            raise HTTPException(status_code=400, detail="No se pudo entender el audio.")
        full_transcript = " ".join(transcripts)

        parsed_data = parse_expense_from_text(full_transcript, db, user.email)
        if parsed_data:
            new_expense = Expense(user_email=user.email, **parsed_data)
            db.add(new_expense)
            db.commit()
            db.refresh(new_expense)
            return {"status": "Gasto registrado con éxito", "data": parsed_data}
        else:
            return {"status": "Texto entendido, pero no se pudo registrar como gasto", "data": {"description": full_transcript}}

    except Exception as e:
        print(f"Error en la transcripción: {e}")
        raise HTTPException(status_code=400, detail="Error en el formato de audio o en la transcripción.")

@app.post("/process-text")
async def process_text(input_data: TextInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    parsed_data = parse_expense_from_text(input_data.text, db, user.email)
    if parsed_data:
        new_expense = Expense(user_email=user.email, **parsed_data)
        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)
        return {"status": "Gasto registrado con éxito", "data": parsed_data}
    else:
        return {"status": "Texto entendido, pero no se pudo registrar como gasto", "data": {"description": input_data.text}}

@app.get("/budget")
def get_budget(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    items = db.query(BudgetItem).filter(BudgetItem.user_email == user.email).all()
    income_item = next((item for item in items if item.category == "_income"), None)
    income = income_item.allocated_amount if income_item else 0
    budget_items = [item for item in items if item.category != "_income"]
    return {"income": income, "items": budget_items}

@app.post("/budget")
def update_budget(budget_input: BudgetInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    if not user.has_completed_onboarding:
        raise HTTPException(status_code=400, detail="Por favor, complete el onboarding primero.")
    
    db.query(BudgetItem).filter(BudgetItem.user_email == user.email).delete()
    income_item = BudgetItem(category="_income", allocated_amount=budget_input.income, user_email=user.email)
    db.add(income_item)
    for item_data in budget_input.items:
        new_item = BudgetItem(category=item_data.category, allocated_amount=item_data.allocated_amount, is_custom=item_data.is_custom, user_email=user.email)
        db.add(new_item)
    db.commit()
    return {"status": "Presupuesto guardado con éxito"}

@app.get("/expenses")
def get_expenses(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    return db.query(Expense).filter(Expense.user_email == user.email).order_by(Expense.date.desc()).all()

@app.get("/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    budget_items = db.query(BudgetItem).filter(BudgetItem.user_email == user.email).all()
    income = next((item.allocated_amount for item in budget_items if item.category == "_income"), 0)
    
    has_completed_onboarding = user.has_completed_onboarding
    
    today = datetime.utcnow()
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    expenses_this_month = db.query(Expense).filter(Expense.date >= start_of_month, Expense.user_email == user.email).all()
    total_spent = sum(expense.amount for expense in expenses_this_month)
    summary = {}
    
    icons = {
        'Vivienda': '🏠', 'Servicios Básicos': '💡', 'Supermercado': '🛒', 'Kioscos': '🍫',
        'Transporte': '🚗', 'Salud': '⚕️', 'Deudas': '💳', 'Préstamos': '🏦',
        'Entretenimiento': '🎬', 'Hijos': '🧑‍🍼', 'Mascotas': '🐾', 'Cuidado Personal': '🧴',
        'Vestimenta': '👕', 'Ahorro': '💰', 'Inversión': '📈', 'Otros': '💸'
    }

    for budget_item in budget_items:
        if budget_item.category == "_income":
            continue
        summary[budget_item.category] = { "category": budget_item.category, "allocated": budget_item.allocated_amount, "spent": 0, "icon": icons.get(budget_item.category, '💸')}
    for expense in expenses_this_month:
        cat_capitalized = expense.category.capitalize()
        if cat_capitalized in summary:
            summary[cat_capitalized]["spent"] += expense.amount
    return { 
        "income": income, 
        "total_spent": total_spent, 
        "summary": list(summary.values()),
        "has_completed_onboarding": has_completed_onboarding
    }

# --- ENDPOINTS DEL MÓDULO 2: CULTIVO ---
@app.post("/cultivation/generate-plan")
def generate_cultivation_plan(request: CultivationPlanRequest, user: User = Depends(get_user_or_create)):
    crop, system, materials, tips = "", "", "", ""

    if request.experience == 'principiante':
        tips += "Como estás empezando, nos enfocaremos en cultivos resistentes y de rápido crecimiento. ¡El éxito inicial es clave para la motivación! "
        if request.initialBudget < 15000:
            system = "Sistema DWC (burbujeo) casero con materiales reciclados" if request.method == 'hydroponics' else "Huerto en macetas o cajones de verdulería"
            materials = "Contenedores plásticos, bomba de aire de acuario económica, semillas de estación (lechuga, rúcula)."
            crop = "Lechuga, Rúcula y Hierbas aromáticas"
        else:
            system = "Kit de inicio NFT (tubos de PVC)" if request.method == 'hydroponics' else "Bancales elevados de madera"
            materials = "Kit completo de tubos, bomba de agua, temporizador, sustrato de calidad y compost."
            crop = "Tomates Cherry, Acelga y Frutillas"
    else:
        tips += "Con tu experiencia, podemos apuntar a cultivos de mayor rendimiento y valor económico. "
        system = "Sistema NFT vertical para optimizar espacio" if request.method == 'hydroponics' else "Huerto en tierra con sistema de riego por goteo"
        materials = "Estructura vertical, bomba de mayor caudal, medidores de pH/EC digitales, abonos orgánicos específicos."
        crop = "Pimientos, Tomates premium, Pepinos"

    if request.location in ['mendoza', 'cordoba']:
        tips += f"En {request.location.capitalize()}, el sol es fuerte. Asegurá una media sombra para las horas de mayor insolación en verano."
    else:
        tips += f"En {request.location.capitalize()}, la humedad puede ser un factor. Garantizá una buena ventilación para prevenir la aparición de hongos."
        
    response_plan = {
        "crop": crop, "system": system, "materials": materials,
        "projectedSavings": f"Con este plan, podrías ahorrar un estimado de ${random.randint(5000, 15000):,} al mes en la verdulería.",
        "tips": tips,
        "imagePrompt": f"Diseño de un {system} con {crop} para un usuario {request.experience} en {request.location}"
    }
    return response_plan

@app.post("/cultivation/chat")
def cultivation_chat(request: AIChatInput, user: User = Depends(get_user_or_create)):
    question = request.question.lower()
    response, image_prompt = "", ""

    if "plaga" in question or "bicho" in question:
        response = "Para plagas como el pulgón, una solución de agua con jabón potásico es muy efectiva y orgánica. Aplicálo cada 3 días al atardecer."
        image_prompt = "Fotografía macro de pulgones en una hoja de tomate."
    elif "nutrientes" in question or "abono" in question:
        response = "La clave está en el balance. Para crecimiento, más Nitrógeno (N). Para fruto, más Fósforo (P) y Potasio (K). Un compost bien maduro es ideal para orgánico."
        image_prompt = "Gráfico simple mostrando los macronutrientes NPK."
    elif "luz" in question or "sol" in question:
        response = "Hortalizas de fruto como tomates necesitan 6-8 horas de sol directo. Si no las tenés, considerá cultivos de hoja como lechuga o espinaca."
        image_prompt = "Ilustración de un balcón con mucho sol vs uno con poco sol."
    else:
        response = "Es una excelente pregunta. Para darte una respuesta más precisa, ¿podrías darme más detalle sobre tu planta?"
        image_prompt = "Icono de un cerebro de IA con signos de pregunta."

    return {"response": response, "imagePrompt": image_prompt}

@app.post("/cultivation/validate-parameters")
def validate_cultivation_parameters(request: ValidateParamsRequest, user: User = Depends(get_user_or_create)):
    is_valid = True
    advice = "¡Tus parámetros están excelentes! Sigue así para un crecimiento óptimo."

    if request.method == 'hydroponics':
        if request.ph is not None and not (5.5 <= request.ph <= 6.5):
            is_valid = False
            advice = "Resi: El pH está fuera del rango óptimo (5.5-6.5). Un pH incorrecto bloquea la absorción de nutrientes. Te recomiendo usar un regulador."
        elif request.ec is not None and request.ec <= 0:
            is_valid = False
            advice = "Resi: La conductividad (EC) es muy baja. Tus plantas no están recibiendo suficientes nutrientes. Asegúrate de añadir la solución nutritiva."
        elif request.temp is not None and not (18 <= request.temp <= 24):
            is_valid = False
            advice = "Resi: La temperatura de la solución no es la ideal (18-24°C). Temperaturas altas reducen el oxígeno y favorecen enfermedades."
    
    elif request.method == 'organic':
        if request.ph is not None and not (6.0 <= request.ph <= 7.0):
            is_valid = False
            advice = "Resi: El pH del suelo está fuera del rango óptimo (6.0-7.0). Ajusta con abonos orgánicos como el compost para una mejor absorción de nutrientes."
        elif request.soilMoisture is not None and not (30 <= request.soilMoisture <= 60):
            is_valid = False
            advice = "Resi: La humedad del suelo no es la ideal (30%-60%). Asegúrate de regar correctamente para evitar estrés hídrico o pudrición de raíces."

    return {"isValid": is_valid, "advice": advice}

# --- ENDPOINTS DE ANÁLISIS Y METAS ---
@app.get("/analysis/resilience-summary", response_model=ResilienceSummary)
def get_resilience_summary(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        budget_items = db.query(BudgetItem).filter(BudgetItem.user_email == user.email).all()
        income = next((item.allocated_amount for item in budget_items if item.category == "_income"), 0)
        
        today = datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        expenses_this_month = db.query(Expense).filter(Expense.date >= start_of_month, Expense.user_email == user.email).all()
        total_spent = sum(expense.amount for expense in expenses_this_month)

        title = "¡Felicitaciones!"
        message = "Tus finanzas están bajo control este mes."
        suggestion = "Seguí así y considerá aumentar tu meta de ahorro en el planificador."
        
        if income > 0:
            spending_ratio = total_spent / income
            if spending_ratio > 0.9:
                title = "¡Alerta Roja!"
                message = f"Ya gastaste más del 90% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Es momento de revisar tus gastos variables en el 'Historial' para frenar a tiempo."
            elif spending_ratio > 0.7:
                title = "Atención, Zona Amarilla"
                message = f"Estás en un 70% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Moderá los gastos no esenciales por el resto del mes para asegurar que llegues a tu meta de ahorro."

        if expenses_this_month:
            category_spending = {}
            for expense in expenses_this_month:
                category_spending[expense.category] = category_spending.get(expense.category, 0) + expense.amount
            
            non_actionable_categories = ["Ahorro", "Inversión", "Vivienda", "Servicios Básicos", "Deudas", "Préstamos"]
            actionable_spending = {k: v for k, v in category_spending.items() if k not in non_actionable_categories}
            
            if actionable_spending:
                top_category = max(actionable_spending, key=actionable_spending.get)
                suggestion += f" Tu mayor gasto variable es en '{top_category}'. ¿Hay alguna oportunidad de optimizarlo?"

        supermarket_spending = sum(e.amount for e in expenses_this_month if e.category == "Supermercado")

        return {
            "title": title,
            "message": message,
            "suggestion": suggestion,
            "supermarket_spending": supermarket_spending
        }
    except Exception as e:
        print(f"Error en get_resilience_summary: {e}")
        return {
            "title": "Sin datos",
            "message": "Aún no tienes suficiente información para un resumen.",
            "suggestion": "Completa tu presupuesto y registra tus primeros gastos.",
            "supermarket_spending": 0
        }

@app.get("/analysis/monthly-distribution")
def get_monthly_distribution(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    today = datetime.utcnow()
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    distribution = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total_spent')
    ).filter(
        Expense.user_email == user.email,
        Expense.date >= start_of_month
    ).group_by(Expense.category).all()
    
    return [{"name": item.category, "value": item.total_spent} for item in distribution]

@app.get("/analysis/spending-trend")
def get_spending_trend(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    spending_trend = []
    
    today = datetime.utcnow()
    for i in range(3, -1, -1): 
        month_start = (today - timedelta(days=30*i)).replace(day=1)
        month_end = month_start.replace(month=month_start.month + 1) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1)
        
        month_name = month_start.strftime("%b")
        
        expenses_in_month = db.query(
            Expense.category,
            func.sum(Expense.amount).label('total_spent')
        ).filter(
            Expense.user_email == user.email,
            Expense.date >= month_start,
            Expense.date < month_end
        ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).limit(5).all()
        
        month_data = {"name": month_name}
        for expense in expenses_in_month:
            month_data[expense.category] = expense.total_spent
        
        spending_trend.append(month_data)
        
    return spending_trend

@app.get("/goals", response_model=List[dict])
def get_goals(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    goals = db.query(SavingGoal).filter(SavingGoal.user_email == user.email).all()
    return [{"id": goal.id, "name": goal.name, "target_amount": goal.target_amount, "current_amount": goal.current_amount} for goal in goals]

@app.post("/goals")
def create_goal(goal: GoalInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    new_goal = SavingGoal(name=goal.name, target_amount=goal.target_amount, user_email=user.email)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@app.get("/goals/projection/{goal_id}")
def get_goal_projection(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    ahorro_budget = db.query(BudgetItem).filter(BudgetItem.user_email == user.email, BudgetItem.category == "Ahorro").first()
    monthly_saving = ahorro_budget.allocated_amount if ahorro_budget else 0
    if monthly_saving <= 0:
        return {"months_remaining": -1, "suggestion": "No tenés un monto asignado para 'Ahorro' en tu presupuesto. ¡Andá al Planificador para agregarlo!"}

    goal = db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_email == user.email).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    remaining_amount = goal.target_amount - goal.current_amount
    if remaining_amount <= 0:
        return {"months_remaining": 0, "suggestion": "¡Felicitaciones! Ya alcanzaste esta meta."}
        
    months_remaining = round(remaining_amount / monthly_saving)

    suggestion = f"Si seguís ahorrando ${monthly_saving:,.0f} por mes, vas a alcanzar tu meta en aproximadamente {months_remaining} meses."
    
    high_expense_category = db.query(Expense.category, func.sum(Expense.amount).label('total')).filter(
        Expense.user_email == user.email, Expense.category.notin_(['Ahorro', 'Inversión'])
    ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).first()

    if high_expense_category:
        cut_amount = high_expense_category.total * 0.10
        new_monthly_saving = monthly_saving + cut_amount
        if new_monthly_saving > 0:
            new_months_remaining = round(remaining_amount / new_monthly_saving)
            if new_months_remaining < months_remaining:
                suggestion += f" Pero si lograras reducir un 10% tus gastos en '{high_expense_category.category}', podrías acelerar tu meta a {new_months_remaining} meses. ¿Te animás a intentarlo en el Planificador?"

    return {"months_remaining": months_remaining, "suggestion": suggestion}

# --- ENDPOINTS DEL MÓDULO 2: CULTIVO ---
@app.post("/cultivation/generate-plan")
def generate_cultivation_plan(request: CultivationPlanRequest, user: User = Depends(get_user_or_create)):
    crop, system, materials, tips = "", "", "", ""

    if request.experience == 'principiante':
        tips += "Como estás empezando, nos enfocaremos en cultivos resistentes y de rápido crecimiento. ¡El éxito inicial es clave para la motivación! "
        if request.initialBudget < 15000:
            system = "Sistema DWC (burbujeo) casero con materiales reciclados" if request.method == 'hydroponics' else "Huerto en macetas o cajones de verdulería"
            materials = "Contenedores plásticos, bomba de aire de acuario económica, semillas de estación (lechuga, rúcula)."
            crop = "Lechuga, Rúcula y Hierbas aromáticas"
        else:
            system = "Kit de inicio NFT (tubos de PVC)" if request.method == 'hydroponics' else "Bancales elevados de madera"
            materials = "Kit completo de tubos, bomba de agua, temporizador, sustrato de calidad y compost."
            crop = "Tomates Cherry, Acelga y Frutillas"
    else:
        tips += "Con tu experiencia, podemos apuntar a cultivos de mayor rendimiento y valor económico. "
        system = "Sistema NFT vertical para optimizar espacio" if request.method == 'hydroponics' else "Huerto en tierra con sistema de riego por goteo"
        materials = "Estructura vertical, bomba de mayor caudal, medidores de pH/EC digitales, abonos orgánicos específicos."
        crop = "Pimientos, Tomates premium, Pepinos"

    if request.location in ['mendoza', 'cordoba']:
        tips += f"En {request.location.capitalize()}, el sol es fuerte. Asegurá una media sombra para las horas de mayor insolación en verano."
    else:
        tips += f"En {request.location.capitalize()}, la humedad puede ser un factor. Garantizá una buena ventilación para prevenir la aparición de hongos."
        
    response_plan = {
        "crop": crop, "system": system, "materials": materials,
        "projectedSavings": f"Con este plan, podrías ahorrar un estimado de ${random.randint(5000, 15000):,} al mes en la verdulería.",
        "tips": tips,
        "imagePrompt": f"Diseño de un {system} con {crop} para un usuario {request.experience} en {request.location}"
    }
    return response_plan

@app.post("/cultivation/chat")
def cultivation_chat(request: AIChatInput, user: User = Depends(get_user_or_create)):
    question = request.question.lower()
    response, image_prompt = "", ""

    if "plaga" in question or "bicho" in question:
        response = "Para plagas como el pulgón, una solución de agua con jabón potásico es muy efectiva y orgánica. Aplicálo cada 3 días al atardecer."
        image_prompt = "Fotografía macro de pulgones en una hoja de tomate."
    elif "nutrientes" in question or "abono" in question:
        response = "La clave está en el balance. Para crecimiento, más Nitrógeno (N). Para fruto, más Fósforo (P) y Potasio (K). Un compost bien maduro es ideal para orgánico."
        image_prompt = "Gráfico simple mostrando los macronutrientes NPK."
    elif "luz" in question or "sol" in question:
        response = "Hortalizas de fruto como tomates necesitan 6-8 horas de sol directo. Si no las tenés, considerá cultivos de hoja como lechuga o espinaca."
        image_prompt = "Ilustración de un balcón con mucho sol vs uno con poco sol."
    else:
        response = "Es una excelente pregunta. Para darte una respuesta más precisa, ¿podrías darme más detalle sobre tu planta?"
        image_prompt = "Icono de un cerebro de IA con signos de pregunta."

    return {"response": response, "imagePrompt": image_prompt}

@app.post("/cultivation/validate-parameters")
def validate_cultivation_parameters(request: ValidateParamsRequest, user: User = Depends(get_user_or_create)):
    is_valid = True
    advice = "¡Tus parámetros están excelentes! Sigue así para un crecimiento óptimo."

    if request.method == 'hydroponics':
        if request.ph is not None and not (5.5 <= request.ph <= 6.5):
            is_valid = False
            advice = "Resi: El pH está fuera del rango óptimo (5.5-6.5). Un pH incorrecto bloquea la absorción de nutrientes. Te recomiendo usar un regulador."
        elif request.ec is not None and request.ec <= 0:
            is_valid = False
            advice = "Resi: La conductividad (EC) es muy baja. Tus plantas no están recibiendo suficientes nutrientes. Asegúrate de añadir la solución nutritiva."
        elif request.temp is not None and not (18 <= request.temp <= 24):
            is_valid = False
            advice = "Resi: La temperatura de la solución no es la ideal (18-24°C). Temperaturas altas reducen el oxígeno y favorecen enfermedades."
    
    elif request.method == 'organic':
        if request.ph is not None and not (6.0 <= request.ph <= 7.0):
            is_valid = False
            advice = "Resi: El pH del suelo está fuera del rango óptimo (6.0-7.0). Ajusta con abonos orgánicos como el compost para una mejor absorción de nutrientes."
        elif request.soilMoisture is not None and not (30 <= request.soilMoisture <= 60):
            is_valid = False
            advice = "Resi: La humedad del suelo no es la ideal (30%-60%). Asegúrate de regar correctamente para evitar estrés hídrico o pudrición de raíces."

    return {"isValid": is_valid, "advice": advice}

# --- ENDPOINTS DE ANÁLISIS Y METAS ---
@app.get("/analysis/resilience-summary", response_model=ResilienceSummary)
def get_resilience_summary(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        budget_items = db.query(BudgetItem).filter(BudgetItem.user_email == user.email).all()
        income = next((item.allocated_amount for item in budget_items if item.category == "_income"), 0)
        
        today = datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        expenses_this_month = db.query(Expense).filter(Expense.date >= start_of_month, Expense.user_email == user.email).all()
        total_spent = sum(expense.amount for expense in expenses_this_month)

        title = "¡Felicitaciones!"
        message = "Tus finanzas están bajo control este mes."
        suggestion = "Seguí así y considerá aumentar tu meta de ahorro en el planificador."
        
        if income > 0:
            spending_ratio = total_spent / income
            if spending_ratio > 0.9:
                title = "¡Alerta Roja!"
                message = f"Ya gastaste más del 90% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Es momento de revisar tus gastos variables en el 'Historial' para frenar a tiempo."
            elif spending_ratio > 0.7:
                title = "Atención, Zona Amarilla"
                message = f"Estás en un 70% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Moderá los gastos no esenciales por el resto del mes para asegurar que llegues a tu meta de ahorro."

        if expenses_this_month:
            category_spending = {}
            for expense in expenses_this_month:
                category_spending[expense.category] = category_spending.get(expense.category, 0) + expense.amount
            
            non_actionable_categories = ["Ahorro", "Inversión", "Vivienda", "Servicios Básicos", "Deudas", "Préstamos"]
            actionable_spending = {k: v for k, v in category_spending.items() if k not in non_actionable_categories}
            
            if actionable_spending:
                top_category = max(actionable_spending, key=actionable_spending.get)
                suggestion += f" Tu mayor gasto variable es en '{top_category}'. ¿Hay alguna oportunidad de optimizarlo?"

        supermarket_spending = sum(e.amount for e in expenses_this_month if e.category == "Supermercado")

        return {
            "title": title,
            "message": message,
            "suggestion": suggestion,
            "supermarket_spending": supermarket_spending
        }
    except Exception as e:
        print(f"Error en get_resilience_summary: {e}")
        return {
            "title": "Sin datos",
            "message": "Aún no tienes suficiente información para un resumen.",
            "suggestion": "Completa tu presupuesto y registra tus primeros gastos.",
            "supermarket_spending": 0
        }

@app.get("/analysis/monthly-distribution")
def get_monthly_distribution(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    today = datetime.utcnow()
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    distribution = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total_spent')
    ).filter(
        Expense.user_email == user.email,
        Expense.date >= start_of_month
    ).group_by(Expense.category).all()
    
    return [{"name": item.category, "value": item.total_spent} for item in distribution]

@app.get("/analysis/spending-trend")
def get_spending_trend(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    spending_trend = []
    
    today = datetime.utcnow()
    for i in range(3, -1, -1): 
        month_start = (today - timedelta(days=30*i)).replace(day=1)
        month_end = month_start.replace(month=month_start.month + 1) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1)
        
        month_name = month_start.strftime("%b")
        
        expenses_in_month = db.query(
            Expense.category,
            func.sum(Expense.amount).label('total_spent')
        ).filter(
            Expense.user_email == user.email,
            Expense.date >= month_start,
            Expense.date < month_end
        ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).limit(5).all()
        
        month_data = {"name": month_name}
        for expense in expenses_in_month:
            month_data[expense.category] = expense.total_spent
        
        spending_trend.append(month_data)
        
    return spending_trend

@app.get("/goals", response_model=List[dict])
def get_goals(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    goals = db.query(SavingGoal).filter(SavingGoal.user_email == user.email).all()
    return [{"id": goal.id, "name": goal.name, "target_amount": goal.target_amount, "current_amount": goal.current_amount} for goal in goals]

@app.post("/goals")
def create_goal(goal: GoalInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    new_goal = SavingGoal(name=goal.name, target_amount=goal.target_amount, user_email=user.email)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@app.get("/goals/projection/{goal_id}")
def get_goal_projection(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    ahorro_budget = db.query(BudgetItem).filter(BudgetItem.user_email == user.email, BudgetItem.category == "Ahorro").first()
    monthly_saving = ahorro_budget.allocated_amount if ahorro_budget else 0
    if monthly_saving <= 0:
        return {"months_remaining": -1, "suggestion": "No tenés un monto asignado para 'Ahorro' en tu presupuesto. ¡Andá al Planificador para agregarlo!"}

    goal = db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_email == user.email).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    remaining_amount = goal.target_amount - goal.current_amount
    if remaining_amount <= 0:
        return {"months_remaining": 0, "suggestion": "¡Felicitaciones! Ya alcanzaste esta meta."}
        
    months_remaining = round(remaining_amount / monthly_saving)

    suggestion = f"Si seguís ahorrando ${monthly_saving:,.0f} por mes, vas a alcanzar tu meta en aproximadamente {months_remaining} meses."
    
    high_expense_category = db.query(Expense.category, func.sum(Expense.amount).label('total')).filter(
        Expense.user_email == user.email, Expense.category.notin_(['Ahorro', 'Inversión'])
    ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).first()

    if high_expense_category:
        cut_amount = high_expense_category.total * 0.10
        new_monthly_saving = monthly_saving + cut_amount
        if new_monthly_saving > 0:
            new_months_remaining = round(remaining_amount / new_monthly_saving)
            if new_months_remaining < months_remaining:
                suggestion += f" Pero si lograras reducir un 10% tus gastos en '{high_expense_category.category}', podrías acelerar tu meta a {new_months_remaining} meses. ¿Te animás a intentarlo en el Planificador?"

    return {"months_remaining": months_remaining, "suggestion": suggestion}

# --- ENDPOINTS DEL MÓDULO 2: CULTIVO ---
@app.post("/cultivation/generate-plan")
def generate_cultivation_plan(request: CultivationPlanRequest, user: User = Depends(get_user_or_create)):
    crop, system, materials, tips = "", "", "", ""

    if request.experience == 'principiante':
        tips += "Como estás empezando, nos enfocaremos en cultivos resistentes y de rápido crecimiento. ¡El éxito inicial es clave para la motivación! "
        if request.initialBudget < 15000:
            system = "Sistema DWC (burbujeo) casero con materiales reciclados" if request.method == 'hydroponics' else "Huerto en macetas o cajones de verdulería"
            materials = "Contenedores plásticos, bomba de aire de acuario económica, semillas de estación (lechuga, rúcula)."
            crop = "Lechuga, Rúcula y Hierbas aromáticas"
        else:
            system = "Kit de inicio NFT (tubos de PVC)" if request.method == 'hydroponics' else "Bancales elevados de madera"
            materials = "Kit completo de tubos, bomba de agua, temporizador, sustrato de calidad y compost."
            crop = "Tomates Cherry, Acelga y Frutillas"
    else:
        tips += "Con tu experiencia, podemos apuntar a cultivos de mayor rendimiento y valor económico. "
        system = "Sistema NFT vertical para optimizar espacio" if request.method == 'hydroponics' else "Huerto en tierra con sistema de riego por goteo"
        materials = "Estructura vertical, bomba de mayor caudal, medidores de pH/EC digitales, abonos orgánicos específicos."
        crop = "Pimientos, Tomates premium, Pepinos"

    if request.location in ['mendoza', 'cordoba']:
        tips += f"En {request.location.capitalize()}, el sol es fuerte. Asegurá una media sombra para las horas de mayor insolación en verano."
    else:
        tips += f"En {request.location.capitalize()}, la humedad puede ser un factor. Garantizá una buena ventilación para prevenir la aparición de hongos."
        
    response_plan = {
        "crop": crop, "system": system, "materials": materials,
        "projectedSavings": f"Con este plan, podrías ahorrar un estimado de ${random.randint(5000, 15000):,} al mes en la verdulería.",
        "tips": tips,
        "imagePrompt": f"Diseño de un {system} con {crop} para un usuario {request.experience} en {request.location}"
    }
    return response_plan

@app.post("/cultivation/chat")
def cultivation_chat(request: AIChatInput, user: User = Depends(get_user_or_create)):
    question = request.question.lower()
    response, image_prompt = "", ""

    if "plaga" in question or "bicho" in question:
        response = "Para plagas como el pulgón, una solución de agua con jabón potásico es muy efectiva y orgánica. Aplicálo cada 3 días al atardecer."
        image_prompt = "Fotografía macro de pulgones en una hoja de tomate."
    elif "nutrientes" in question or "abono" in question:
        response = "La clave está en el balance. Para crecimiento, más Nitrógeno (N). Para fruto, más Fósforo (P) y Potasio (K). Un compost bien maduro es ideal para orgánico."
        image_prompt = "Gráfico simple mostrando los macronutrientes NPK."
    elif "luz" in question or "sol" in question:
        response = "Hortalizas de fruto como tomates necesitan 6-8 horas de sol directo. Si no las tenés, considerá cultivos de hoja como lechuga o espinaca."
        image_prompt = "Ilustración de un balcón con mucho sol vs uno con poco sol."
    else:
        response = "Es una excelente pregunta. Para darte una respuesta más precisa, ¿podrías darme más detalle sobre tu planta?"
        image_prompt = "Icono de un cerebro de IA con signos de pregunta."

    return {"response": response, "imagePrompt": image_prompt}

@app.post("/cultivation/validate-parameters")
def validate_cultivation_parameters(request: ValidateParamsRequest, user: User = Depends(get_user_or_create)):
    is_valid = True
    advice = "¡Tus parámetros están excelentes! Sigue así para un crecimiento óptimo."

    if request.method == 'hydroponics':
        if request.ph is not None and not (5.5 <= request.ph <= 6.5):
            is_valid = False
            advice = "Resi: El pH está fuera del rango óptimo (5.5-6.5). Un pH incorrecto bloquea la absorción de nutrientes. Te recomiendo usar un regulador."
        elif request.ec is not None and request.ec <= 0:
            is_valid = False
            advice = "Resi: La conductividad (EC) es muy baja. Tus plantas no están recibiendo suficientes nutrientes. Asegúrate de añadir la solución nutritiva."
        elif request.temp is not None and not (18 <= request.temp <= 24):
            is_valid = False
            advice = "Resi: La temperatura de la solución no es la ideal (18-24°C). Temperaturas altas reducen el oxígeno y favorecen enfermedades."
    
    elif request.method == 'organic':
        if request.ph is not None and not (6.0 <= request.ph <= 7.0):
            is_valid = False
            advice = "Resi: El pH del suelo está fuera del rango óptimo (6.0-7.0). Ajusta con abonos orgánicos como el compost para una mejor absorción de nutrientes."
        elif request.soilMoisture is not None and not (30 <= request.soilMoisture <= 60):
            is_valid = False
            advice = "Resi: La humedad del suelo no es la ideal (30%-60%). Asegúrate de regar correctamente para evitar estrés hídrico o pudrición de raíces."

    return {"isValid": is_valid, "advice": advice}

# --- ENDPOINTS DE ANÁLISIS Y METAS ---
@app.get("/analysis/resilience-summary", response_model=ResilienceSummary)
def get_resilience_summary(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        budget_items = db.query(BudgetItem).filter(BudgetItem.user_email == user.email).all()
        income = next((item.allocated_amount for item in budget_items if item.category == "_income"), 0)
        
        today = datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        expenses_this_month = db.query(Expense).filter(Expense.date >= start_of_month, Expense.user_email == user.email).all()
        total_spent = sum(expense.amount for expense in expenses_this_month)

        title = "¡Felicitaciones!"
        message = "Tus finanzas están bajo control este mes."
        suggestion = "Seguí así y considerá aumentar tu meta de ahorro en el planificador."
        
        if income > 0:
            spending_ratio = total_spent / income
            if spending_ratio > 0.9:
                title = "¡Alerta Roja!"
                message = f"Ya gastaste más del 90% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Es momento de revisar tus gastos variables en el 'Historial' para frenar a tiempo."
            elif spending_ratio > 0.7:
                title = "Atención, Zona Amarilla"
                message = f"Estás en un 70% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Moderá los gastos no esenciales por el resto del mes para asegurar que llegues a tu meta de ahorro."

        if expenses_this_month:
            category_spending = {}
            for expense in expenses_this_month:
                category_spending[expense.category] = category_spending.get(expense.category, 0) + expense.amount
            
            non_actionable_categories = ["Ahorro", "Inversión", "Vivienda", "Servicios Básicos", "Deudas", "Préstamos"]
            actionable_spending = {k: v for k, v in category_spending.items() if k not in non_actionable_categories}
            
            if actionable_spending:
                top_category = max(actionable_spending, key=actionable_spending.get)
                suggestion += f" Tu mayor gasto variable es en '{top_category}'. ¿Hay alguna oportunidad de optimizarlo?"

        supermarket_spending = sum(e.amount for e in expenses_this_month if e.category == "Supermercado")

        return {
            "title": title,
            "message": message,
            "suggestion": suggestion,
            "supermarket_spending": supermarket_spending
        }
    except Exception as e:
        print(f"Error en get_resilience_summary: {e}")
        return {
            "title": "Sin datos",
            "message": "Aún no tienes suficiente información para un resumen.",
            "suggestion": "Completa tu presupuesto y registra tus primeros gastos.",
            "supermarket_spending": 0
        }

@app.get("/analysis/monthly-distribution")
def get_monthly_distribution(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    today = datetime.utcnow()
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    distribution = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total_spent')
    ).filter(
        Expense.user_email == user.email,
        Expense.date >= start_of_month
    ).group_by(Expense.category).all()
    
    return [{"name": item.category, "value": item.total_spent} for item in distribution]

@app.get("/analysis/spending-trend")
def get_spending_trend(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    spending_trend = []
    
    today = datetime.utcnow()
    for i in range(3, -1, -1): 
        month_start = (today - timedelta(days=30*i)).replace(day=1)
        month_end = month_start.replace(month=month_start.month + 1) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1)
        
        month_name = month_start.strftime("%b")
        
        expenses_in_month = db.query(
            Expense.category,
            func.sum(Expense.amount).label('total_spent')
        ).filter(
            Expense.user_email == user.email,
            Expense.date >= month_start,
            Expense.date < month_end
        ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).limit(5).all()
        
        month_data = {"name": month_name}
        for expense in expenses_in_month:
            month_data[expense.category] = expense.total_spent
        
        spending_trend.append(month_data)
        
    return spending_trend

@app.get("/goals", response_model=List[dict])
def get_goals(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    goals = db.query(SavingGoal).filter(SavingGoal.user_email == user.email).all()
    return [{"id": goal.id, "name": goal.name, "target_amount": goal.target_amount, "current_amount": goal.current_amount} for goal in goals]

@app.post("/goals")
def create_goal(goal: GoalInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    new_goal = SavingGoal(name=goal.name, target_amount=goal.target_amount, user_email=user.email)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@app.get("/goals/projection/{goal_id}")
def get_goal_projection(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    ahorro_budget = db.query(BudgetItem).filter(BudgetItem.user_email == user.email, BudgetItem.category == "Ahorro").first()
    monthly_saving = ahorro_budget.allocated_amount if ahorro_budget else 0
    if monthly_saving <= 0:
        return {"months_remaining": -1, "suggestion": "No tenés un monto asignado para 'Ahorro' en tu presupuesto. ¡Andá al Planificador para agregarlo!"}

    goal = db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_email == user.email).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    remaining_amount = goal.target_amount - goal.current_amount
    if remaining_amount <= 0:
        return {"months_remaining": 0, "suggestion": "¡Felicitaciones! Ya alcanzaste esta meta."}
        
    months_remaining = round(remaining_amount / monthly_saving)

    suggestion = f"Si seguís ahorrando ${monthly_saving:,.0f} por mes, vas a alcanzar tu meta en aproximadamente {months_remaining} meses."
    
    high_expense_category = db.query(Expense.category, func.sum(Expense.amount).label('total')).filter(
        Expense.user_email == user.email, Expense.category.notin_(['Ahorro', 'Inversión'])
    ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).first()

    if high_expense_category:
        cut_amount = high_expense_category.total * 0.10
        new_monthly_saving = monthly_saving + cut_amount
        if new_monthly_saving > 0:
            new_months_remaining = round(remaining_amount / new_monthly_saving)
            if new_months_remaining < months_remaining:
                suggestion += f" Pero si lograras reducir un 10% tus gastos en '{high_expense_category.category}', podrías acelerar tu meta a {new_months_remaining} meses. ¿Te animás a intentarlo en el Planificador?"

    return {"months_remaining": months_remaining, "suggestion": suggestion}

# --- ENDPOINTS DEL MÓDULO 2: CULTIVO ---
@app.post("/cultivation/generate-plan")
def generate_cultivation_plan(request: CultivationPlanRequest, user: User = Depends(get_user_or_create)):
    crop, system, materials, tips = "", "", "", ""

    if request.experience == 'principiante':
        tips += "Como estás empezando, nos enfocaremos en cultivos resistentes y de rápido crecimiento. ¡El éxito inicial es clave para la motivación! "
        if request.initialBudget < 15000:
            system = "Sistema DWC (burbujeo) casero con materiales reciclados" if request.method == 'hydroponics' else "Huerto en macetas o cajones de verdulería"
            materials = "Contenedores plásticos, bomba de aire de acuario económica, semillas de estación (lechuga, rúcula)."
            crop = "Lechuga, Rúcula y Hierbas aromáticas"
        else:
            system = "Kit de inicio NFT (tubos de PVC)" if request.method == 'hydroponics' else "Bancales elevados de madera"
            materials = "Kit completo de tubos, bomba de agua, temporizador, sustrato de calidad y compost."
            crop = "Tomates Cherry, Acelga y Frutillas"
    else:
        tips += "Con tu experiencia, podemos apuntar a cultivos de mayor rendimiento y valor económico. "
        system = "Sistema NFT vertical para optimizar espacio" if request.method == 'hydroponics' else "Huerto en tierra con sistema de riego por goteo"
        materials = "Estructura vertical, bomba de mayor caudal, medidores de pH/EC digitales, abonos orgánicos específicos."
        crop = "Pimientos, Tomates premium, Pepinos"

    if request.location in ['mendoza', 'cordoba']:
        tips += f"En {request.location.capitalize()}, el sol es fuerte. Asegurá una media sombra para las horas de mayor insolación en verano."
    else:
        tips += f"En {request.location.capitalize()}, la humedad puede ser un factor. Garantizá una buena ventilación para prevenir la aparición de hongos."
        
    response_plan = {
        "crop": crop, "system": system, "materials": materials,
        "projectedSavings": f"Con este plan, podrías ahorrar un estimado de ${random.randint(5000, 15000):,} al mes en la verdulería.",
        "tips": tips,
        "imagePrompt": f"Diseño de un {system} con {crop} para un usuario {request.experience} en {request.location}"
    }
    return response_plan

@app.post("/cultivation/chat")
def cultivation_chat(request: AIChatInput, user: User = Depends(get_user_or_create)):
    question = request.question.lower()
    response, image_prompt = "", ""

    if "plaga" in question or "bicho" in question:
        response = "Para plagas como el pulgón, una solución de agua con jabón potásico es muy efectiva y orgánica. Aplicálo cada 3 días al atardecer."
        image_prompt = "Fotografía macro de pulgones en una hoja de tomate."
    elif "nutrientes" in question or "abono" in question:
        response = "La clave está en el balance. Para crecimiento, más Nitrógeno (N). Para fruto, más Fósforo (P) y Potasio (K). Un compost bien maduro es ideal para orgánico."
        image_prompt = "Gráfico simple mostrando los macronutrientes NPK."
    elif "luz" in question or "sol" in question:
        response = "Hortalizas de fruto como tomates necesitan 6-8 horas de sol directo. Si no las tenés, considerá cultivos de hoja como lechuga o espinaca."
        image_prompt = "Ilustración de un balcón con mucho sol vs uno con poco sol."
    else:
        response = "Es una excelente pregunta. Para darte una respuesta más precisa, ¿podrías darme más detalle sobre tu planta?"
        image_prompt = "Icono de un cerebro de IA con signos de pregunta."

    return {"response": response, "imagePrompt": image_prompt}

@app.post("/cultivation/validate-parameters")
def validate_cultivation_parameters(request: ValidateParamsRequest, user: User = Depends(get_user_or_create)):
    is_valid = True
    advice = "¡Tus parámetros están excelentes! Sigue así para un crecimiento óptimo."

    if request.method == 'hydroponics':
        if request.ph is not None and not (5.5 <= request.ph <= 6.5):
            is_valid = False
            advice = "Resi: El pH está fuera del rango óptimo (5.5-6.5). Un pH incorrecto bloquea la absorción de nutrientes. Te recomiendo usar un regulador."
        elif request.ec is not None and request.ec <= 0:
            is_valid = False
            advice = "Resi: La conductividad (EC) es muy baja. Tus plantas no están recibiendo suficientes nutrientes. Asegúrate de añadir la solución nutritiva."
        elif request.temp is not None and not (18 <= request.temp <= 24):
            is_valid = False
            advice = "Resi: La temperatura de la solución no es la ideal (18-24°C). Temperaturas altas reducen el oxígeno y favorecen enfermedades."
    
    elif request.method == 'organic':
        if request.ph is not None and not (6.0 <= request.ph <= 7.0):
            is_valid = False
            advice = "Resi: El pH del suelo está fuera del rango óptimo (6.0-7.0). Ajusta con abonos orgánicos como el compost para una mejor absorción de nutrientes."
        elif request.soilMoisture is not None and not (30 <= request.soilMoisture <= 60):
            is_valid = False
            advice = "Resi: La humedad del suelo no es la ideal (30%-60%). Asegúrate de regar correctamente para evitar estrés hídrico o pudrición de raíces."

    return {"isValid": is_valid, "advice": advice}

# --- ENDPOINTS DE ANÁLISIS Y METAS ---
@app.get("/analysis/resilience-summary", response_model=ResilienceSummary)
def get_resilience_summary(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    try:
        budget_items = db.query(BudgetItem).filter(BudgetItem.user_email == user.email).all()
        income = next((item.allocated_amount for item in budget_items if item.category == "_income"), 0)
        
        today = datetime.utcnow()
        start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        expenses_this_month = db.query(Expense).filter(Expense.date >= start_of_month, Expense.user_email == user.email).all()
        total_spent = sum(expense.amount for expense in expenses_this_month)

        title = "¡Felicitaciones!"
        message = "Tus finanzas están bajo control este mes."
        suggestion = "Seguí así y considerá aumentar tu meta de ahorro en el planificador."
        
        if income > 0:
            spending_ratio = total_spent / income
            if spending_ratio > 0.9:
                title = "¡Alerta Roja!"
                message = f"Ya gastaste más del 90% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Es momento de revisar tus gastos variables en el 'Historial' para frenar a tiempo."
            elif spending_ratio > 0.7:
                title = "Atención, Zona Amarilla"
                message = f"Estás en un 70% de tus ingresos (${total_spent:,.0f} de ${income:,.0f})."
                suggestion = "Moderá los gastos no esenciales por el resto del mes para asegurar que llegues a tu meta de ahorro."

        if expenses_this_month:
            category_spending = {}
            for expense in expenses_this_month:
                category_spending[expense.category] = category_spending.get(expense.category, 0) + expense.amount
            
            non_actionable_categories = ["Ahorro", "Inversión", "Vivienda", "Servicios Básicos", "Deudas", "Préstamos"]
            actionable_spending = {k: v for k, v in category_spending.items() if k not in non_actionable_categories}
            
            if actionable_spending:
                top_category = max(actionable_spending, key=actionable_spending.get)
                suggestion += f" Tu mayor gasto variable es en '{top_category}'. ¿Hay alguna oportunidad de optimizarlo?"

        supermarket_spending = sum(e.amount for e in expenses_this_month if e.category == "Supermercado")

        return {
            "title": title,
            "message": message,
            "suggestion": suggestion,
            "supermarket_spending": supermarket_spending
        }
    except Exception as e:
        print(f"Error en get_resilience_summary: {e}")
        return {
            "title": "Sin datos",
            "message": "Aún no tienes suficiente información para un resumen.",
            "suggestion": "Completa tu presupuesto y registra tus primeros gastos.",
            "supermarket_spending": 0
        }

@app.get("/analysis/monthly-distribution")
def get_monthly_distribution(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    today = datetime.utcnow()
    start_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    distribution = db.query(
        Expense.category,
        func.sum(Expense.amount).label('total_spent')
    ).filter(
        Expense.user_email == user.email,
        Expense.date >= start_of_month
    ).group_by(Expense.category).all()
    
    return [{"name": item.category, "value": item.total_spent} for item in distribution]

@app.get("/analysis/spending-trend")
def get_spending_trend(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    spending_trend = []
    
    today = datetime.utcnow()
    for i in range(3, -1, -1): 
        month_start = (today - timedelta(days=30*i)).replace(day=1)
        month_end = month_start.replace(month=month_start.month + 1) if month_start.month < 12 else month_start.replace(year=month_start.year + 1, month=1)
        
        month_name = month_start.strftime("%b")
        
        expenses_in_month = db.query(
            Expense.category,
            func.sum(Expense.amount).label('total_spent')
        ).filter(
            Expense.user_email == user.email,
            Expense.date >= month_start,
            Expense.date < month_end
        ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).limit(5).all()
        
        month_data = {"name": month_name}
        for expense in expenses_in_month:
            month_data[expense.category] = expense.total_spent
        
        spending_trend.append(month_data)
        
    return spending_trend

@app.get("/goals", response_model=List[dict])
def get_goals(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    goals = db.query(SavingGoal).filter(SavingGoal.user_email == user.email).all()
    return [{"id": goal.id, "name": goal.name, "target_amount": goal.target_amount, "current_amount": goal.current_amount} for goal in goals]

@app.post("/goals")
def create_goal(goal: GoalInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    new_goal = SavingGoal(name=goal.name, target_amount=goal.target_amount, user_email=user.email)
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal

@app.get("/goals/projection/{goal_id}")
def get_goal_projection(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    ahorro_budget = db.query(BudgetItem).filter(BudgetItem.user_email == user.email, BudgetItem.category == "Ahorro").first()
    monthly_saving = ahorro_budget.allocated_amount if ahorro_budget else 0
    if monthly_saving <= 0:
        return {"months_remaining": -1, "suggestion": "No tenés un monto asignado para 'Ahorro' en tu presupuesto. ¡Andá al Planificador para agregarlo!"}

    goal = db.query(SavingGoal).filter(SavingGoal.id == goal_id, SavingGoal.user_email == user.email).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    remaining_amount = goal.target_amount - goal.current_amount
    if remaining_amount <= 0:
        return {"months_remaining": 0, "suggestion": "¡Felicitaciones! Ya alcanzaste esta meta."}
        
    months_remaining = round(remaining_amount / monthly_saving)

    suggestion = f"Si seguís ahorrando ${monthly_saving:,.0f} por mes, vas a alcanzar tu meta en aproximadamente {months_remaining} meses."
    
    high_expense_category = db.query(Expense.category, func.sum(Expense.amount).label('total')).filter(
        Expense.user_email == user.email, Expense.category.notin_(['Ahorro', 'Inversión'])
    ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).first()

    if high_expense_category:
        cut_amount = high_expense_category.total * 0.10
        new_monthly_saving = monthly_saving + cut_amount
        if new_monthly_saving > 0:
            new_months_remaining = round(remaining_amount / new_monthly_saving)
            if new_months_remaining < months_remaining:
                suggestion += f" Pero si lograras reducir un 10% tus gastos en '{high_expense_category.category}', podrías acelerar tu meta a {new_months_remaining} meses. ¿Te animás a intentarlo en el Planificador?"

    return {"months_remaining": months_remaining, "suggestion": suggestion}

@app.post("/chat")
def ai_chat(request: AIChatInput, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    question = request.question.lower()
    
    # Respuesta predeterminada si no se encuentra un tema
    response = "Hola. Soy Resi, tu asistente de resiliencia. Estoy aquí para ayudarte con temas de finanzas, ahorro, planificación familiar y cultivo. ¿En qué puedo ayudarte?"
    
    # Bloque try-except para manejar fallos si no hay datos de resumen financiero
    try:
        summary_data = get_dashboard_summary(db=db, user=user)
        total_spent = summary_data["total_spent"]
        income = summary_data["income"]
        remaining = income - total_spent
        
        if any(keyword in question for keyword in ["gasto", "gastos", "dinero", "plata", "presupuesto"]):
            response = f"Hola. He analizado tus finanzas. Este mes has gastado ${total_spent:,.0f} de tu ingreso de ${income:,.0f}. Te quedan ${remaining:,.0f} disponibles. ¿Hay algo más en lo que pueda ayudarte?"
    except Exception as e:
        pass