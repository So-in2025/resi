# En: backend/dependencies.py
from fastapi import Depends, HTTPException, Header, status, Request
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import textwrap
import google.generativeai as genai
from sqlalchemy import func
from datetime import datetime
import os

from database import SessionLocal, User, BudgetItem, GameProfile, Achievement, UserAchievement, Expense, SavingGoal
from schemas import ExpenseData, GoalInput, BudgetInput, CultivationPlanRequest, CultivationPlanResult, ValidateParamsRequest, FamilyPlanRequest, FamilyPlanResponse
# Se eliminó la importación de 'main', evitando el error de dependencia circular

# --- CONFIGURACIÓN E INICIALIZACIÓN DE LOS MODELOS DE IA ---
# Se movió aquí para evitar la dependencia circular.
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

model_chat = genai.GenerativeModel(
    model_name="gemini-1.5-flash-latest",
    system_instruction=textwrap.dedent("""
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
    - NO inventes datos. Si no tienes un dato específico (ej. inflación del mes), acláralo.

    Tus reglas:
    1.  Integra siempre el contexto del usuario y el contexto en tiempo real en tus respuestas.
    2.  Si el usuario pregunta algo fuera de tus temas, redirige amablemente la conversación a tus temas centrales.
    3.  Sé conciso y andá al grano.
    4.  Utilizá el historial de chat para recordar conversaciones pasadas.
    5.  NUNCA uses formato Markdown (asteriscos, etc.). Responde siempre en texto plano.
    6.  MUY IMPORTANTE: Antes de sugerir cualquier herramienta o solución externa, SIEMPRE priorizá y recomendá las "Herramientas Internas de Resi".
    """)
)

model_plan_generator = genai.GenerativeModel(
    model_name="gemini-1.5-flash-latest",
    system_instruction="Tu única tarea es actuar como un experto en cultivo, diseñando planes de cultivo detallados en formato JSON. DEBES seguir las instrucciones de formato y contenido al pie de la letra."
)

model_validator = genai.GenerativeModel(
    model_name="gemini-1.5-flash-latest",
    system_instruction="Tu única tarea es analizar los parámetros de cultivo de un usuario y generar un JSON con recomendaciones específicas, rápidas y prácticas. DEBES responder solo con el JSON y nada más."
)

model_family_plan_generator = genai.GenerativeModel(
    model_name="gemini-1.5-flash-latest",
    system_instruction="Tu única tarea es actuar como un experto en planificación familiar, creando planes personalizados en formato JSON."
)
# --- FIN DE LA INICIALIZACIÓN ---

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user_email(request: Request, authorization: Optional[str] = Header(None)):
    if request.method == "OPTIONS": return None
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token de autorización faltante o inválido.")
    return authorization.split(" ")[1]

def get_user_or_create(user_email: str = Depends(get_current_user_email), db: Session = Depends(get_db)):
    if user_email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se pudo verificar el email del usuario.")
    
    user = db.query(User).filter(User.email == user_email).first()
    
    if not user:
        new_user = User(email=user_email, has_completed_onboarding=False)
        db.add(new_user)
        new_profile = GameProfile(user_email=user_email)
        db.add(new_profile)
        db.commit()
        db.refresh(new_user)
        return new_user
    return user

def award_achievement(user: User, achievement_id: str, db: Session, progress_to_add: int = 1):
    """
    Función para otorgar y actualizar el progreso de un logro.
    Devuelve un mensaje si el logro fue desbloqueado.
    """
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        print(f"Advertencia: Logro '{achievement_id}' no encontrado en la base de datos.")
        return None

    user_achiev = db.query(UserAchievement).filter(
        UserAchievement.user_email == user.email,
        UserAchievement.achievement_id == achievement_id
    ).first()

    if not user_achiev:
        user_achiev = UserAchievement(user_email=user.email, achievement_id=achievement_id)
        db.add(user_achiev)
        db.flush()

    if not user_achiev.is_completed:
        user_achiev.progress += progress_to_add
        
        profile = db.query(GameProfile).filter(GameProfile.user_email == user.email).first()

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

            db.commit()
            return f"¡Logro desbloqueado: '{achievement.name}'!"
    
    db.commit()
    return None

def parse_expense_with_gemini(text: str, db: Session, user_email: str) -> Optional[dict]:
    budget_items = db.query(BudgetItem.category).filter(BudgetItem.user_email == user_email, BudgetItem.category != "_income").all()
    user_categories = [item[0] for item in budget_items]
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
        response = model_expense.generate_content(f"Analiza esta frase: '{text}'")
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

def generate_plan_with_gemini(request: CultivationPlanRequest, user: User) -> CultivationPlanResult:
    """
    Función que genera un plan de cultivo dinámicamente con la IA de Gemini.
    """
    global model_plan_generator
    
    plan_prompt = textwrap.dedent(f"""
    Basado en los siguientes datos del usuario:
    - Método: {request.method}
    - Espacio: {request.space}
    - Experiencia: {request.experience}
    - Presupuesto inicial: ${request.initialBudget:,.0f}
    - Gasto mensual en vegetales: ${request.supermarketSpending:,.0f}
    - Tipo de luz: {request.light if request.method == 'hydroponics' else 'N/A'}
    - Tipo de suelo: {request.soilType if request.method == 'organic' else 'N/A'}
    - Ubicación: {request.location}

    Actúa como un experto en cultivo y diseña un plan de cultivo ideal para este usuario.
    El plan debe tener la siguiente estructura JSON y NO DEBE incluir ninguna otra información.
    
    {{
      "crop": "Cultivo recomendado (ej: 'Lechuga y Rúcula' o 'Tomates Cherry')",
      "system": "Sistema de cultivo recomendado (ej: 'Sistema DWC casero' o 'Bancal elevado')",
      "materials": "Lista de materiales esenciales y su uso (ej: 'Contenedores plásticos, bomba de aire, etc.')",
      "projectedSavings": "Una estimación de ahorro mensual, conectada al gasto en supermercado del usuario (ej: 'Con este plan, podrías ahorrar un 20% de tus gastos en la verdulería, unos $5.000 al mes.')",
      "tips": "Un consejo personalizado y específico para el usuario, basado en su ubicación, experiencia y método.",
      "imagePrompt": "Un prompt en inglés para generar una imagen visual del plan (opcional)"
    }}
    
    Asegúrate de que la "projectedSavings" se adapte al `supermarketSpending` del usuario. Sé creativo, pero mantente realista.
    """)
    
    try:
        response = model_plan_generator.generate_content(plan_prompt)
        parsed_plan = json.loads(response.text)
        
        validated_plan = CultivationPlanResult(**parsed_plan)
        return validated_plan
        
    except Exception as e:
        print(f"Error al generar el plan de cultivo con Gemini: {e}")
        raise HTTPException(status_code=500, detail="Error de la IA al generar el plan de cultivo.")

def validate_parameters_with_gemini(request: ValidateParamsRequest):
    """
    Función que valida los parámetros de cultivo con la IA de Gemini.
    """
    global model_validator
    
    validation_prompt = textwrap.dedent(f"""
    Analiza los siguientes parámetros de cultivo:
    - Método: {request.method}
    - pH: {request.ph}
    - Conductividad Eléctrica (EC): {request.ec}
    - Temperatura (Temp): {request.temp}
    - Humedad del suelo (SoilMoisture): {request.soilMoisture}
    
    Genera un JSON con el siguiente formato:
    {{
      "isValid": boolean,
      "advice": "Un consejo personalizado y claro. Si hay un problema, explica por qué y qué hacer. Si todo está bien, da un mensaje de ánimo."
    }}
    
    Los rangos óptimos para el método hidropónico son:
    - pH: 5.5 a 6.5
    - EC: > 0
    - Temperatura: 18°C a 24°C
    
    Los rangos óptimos para el método orgánico son:
    - pH: 6.0 a 7.0
    - Humedad del suelo: 30% a 60%
    
    Asegúrate de que el "advice" sea un consejo práctico y útil para el usuario.
    """)
    
    try:
        response = model_validator.generate_content(validation_prompt, generation_config={"response_mime_type": "application/json"})
        parsed_response = json.loads(response.text)
        
        return parsed_response
        
    except Exception as e:
        print(f"Error al validar parámetros con Gemini: {e}")
        raise HTTPException(status_code=500, detail="Error de la IA al validar los parámetros.")

def generate_family_plan_with_gemini(request: FamilyPlanRequest, db: Session):
    """
    Función que genera un plan familiar dinámicamente con la IA de Gemini.
    """
    global model_family_plan_generator

    user_email = db.query(User).filter(User.email == request.user_email).first().email
    user_income = db.query(BudgetItem).filter(BudgetItem.user_email == user_email, BudgetItem.category == "_income").first().allocated_amount
    
    plan_prompt = textwrap.dedent(f"""
    Basado en los siguientes datos familiares:
    - Miembros de la familia: {json.dumps([m.dict() for m in request.familyMembers])}
    - Preferencias dietarias: {request.dietaryPreferences}
    - Estilo de cocina: {request.cookingStyle}
    - Metas financieras: {request.financialGoals}
    - Actividades de ocio: {request.leisureActivities}
    - Ingreso mensual familiar: ${user_income:,.0f}

    Actúa como un experto en planificación familiar y diseña un plan semanal (menú y actividades) y un consejo de presupuesto. El plan debe tener la siguiente estructura JSON y NO DEBE incluir ninguna otra información.

    {{
      "mealPlan": [
        {{"day": "Lunes", "meal": "Sugerencia de comida", "tags": ["ej: rápido", "económico"]}},
        ...
      ],
      "budgetSuggestion": "Un consejo de presupuesto personalizado y accionable, relacionado con sus metas financieras y el ingreso mensual.",
      "leisureSuggestion": {{"activity": "Sugerencia de actividad", "cost": "costo estimado (ej: nulo, bajo, medio)", "description": "Una breve descripción de la actividad."}}
    }}

    Asegúrate de que el plan de comidas y las sugerencias de ocio sean adecuadas para la cantidad y edades de los miembros de la familia. El consejo de presupuesto debe ser muy específico y útil, utilizando el ingreso mensual como base.
    """)

    try:
        response = model_family_plan_generator.generate_content(plan_prompt, generation_config={"response_mime_type": "application/json"})
        parsed_plan = json.loads(response.text)
        
        validated_plan = FamilyPlanResponse(**parsed_plan)
        return validated_plan
        
    except Exception as e:
        print(f"Error al generar el plan familiar con Gemini: {e}")
        raise HTTPException(status_code=500, detail="Error de la IA al generar el plan familiar.")