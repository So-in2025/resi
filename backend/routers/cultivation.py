# En: backend/routers/cultivation.py
from fastapi import APIRouter, Depends
import random
from sqlalchemy.ext.asyncio import AsyncSession
import json

from database import User, CultivationPlan
from schemas import CultivationPlanRequest, AIChatInput, ValidateParamsRequest
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/cultivation",
    tags=["Cultivation"]
)

# CORRECCIÓN: Convertido a async
@router.post("/generate-plan")
async def generate_cultivation_plan(request: CultivationPlanRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_user_or_create)):
    tips = ""
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

    new_plan = CultivationPlan(user_email=user.email, plan_data=json.dumps(response_plan))
    db.add(new_plan)
    user.last_cultivation_plan = json.dumps(response_plan)
    await db.commit()

    return response_plan

# CORRECCIÓN: Convertido a async
@router.post("/chat")
async def cultivation_chat(request: AIChatInput, user: User = Depends(get_user_or_create)):
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

# CORRECCIÓN: Convertido a async
@router.post("/validate-parameters")
async def validate_cultivation_parameters(request: ValidateParamsRequest, user: User = Depends(get_user_or_create)):
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