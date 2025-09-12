# En: backend/routers/cultivation.py
from fastapi import APIRouter, Depends, HTTPException
import random
from sqlalchemy.orm import Session
import json
from typing import Optional # ¡CORRECCIÓN! Faltaba esta importación

from database import User, CultivationPlan
from schemas import CultivationPlanRequest, AIChatInput, ValidateParamsRequest, CultivationPlanResponse, CultivationPlanResult
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/cultivation",
    tags=["Cultivation"]
)

@router.get("/latest", response_model=Optional[CultivationPlanResponse])
def get_latest_plan(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """
    Obtiene el Ãºltimo plan de cultivo guardado por el usuario.
    """
    latest_plan = db.query(CultivationPlan).filter(CultivationPlan.user_email == user.email).order_by(CultivationPlan.created_at.desc()).first()
    if not latest_plan:
        return None
    
    # Asegurar que el campo plan_data sea un diccionario antes de pasarlo al esquema
    plan_data = json.loads(latest_plan.plan_data)
    
    return CultivationPlanResponse(plan_data=plan_data, created_at=latest_plan.created_at)

# CORRECCIÃ“N: Convertido a sync
@router.post("/generate-plan", response_model=CultivationPlanResult)
def generate_cultivation_plan(request: CultivationPlanRequest, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    tips = ""
    if request.experience == 'principiante':
        tips += "Como estÃ¡s empezando, nos enfocaremos en cultivos resistentes y de rÃ¡pido crecimiento. Â¡El Ã©xito inicial es clave para la motivaciÃ³n! "
        if request.initialBudget < 15000:
            system = "Sistema DWC (burbujeo) casero con materiales reciclados" if request.method == 'hydroponics' else "Huerto en macetas o cajones de verdulerÃ­a"
            materials = "Contenedores plÃ¡sticos, bomba de aire de acuario econÃ³mica, semillas de estaciÃ³n (lechuga, rÃºcula)."
            crop = "Lechuga, RÃºcula y Hierbas aromÃ¡ticas"
        else:
            system = "Kit de inicio NFT (tubos de PVC)" if request.method == 'hydroponics' else "Bancales elevados de madera"
            materials = "Kit completo de tubos, bomba de agua, temporizador, sustrato de calidad y compost."
            crop = "Tomates Cherry, Acelga y Frutillas"
    else:
        tips += "Con tu experiencia, podemos apuntar a cultivos de mayor rendimiento y valor econÃ³mico. "
        system = "Sistema NFT vertical para optimizar espacio" if request.method == 'hydroponics' else "Huerto en tierra con sistema de riego por goteo"
        materials = "Estructura vertical, bomba de mayor caudal, medidores de pH/EC digitales, abonos orgÃ¡nicos especÃ­ficos."
        crop = "Pimientos, Tomates premium, Pepinos"

    if request.location in ['mendoza', 'cordoba']:
        tips += f"En {request.location.capitalize()}, el sol es fuerte. AsegurÃ¡ una media sombra para las horas de mayor insolaciÃ³n en verano."
    else:
        tips += f"En {request.location.capitalize()}, la humedad puede ser un factor. GarantizÃ¡ una buena ventilaciÃ³n para prevenir la apariciÃ³n de hongos."
    
    response_plan = {
        "crop": crop, "system": system, "materials": materials,
        "projectedSavings": f"Con este plan, podrÃ­as ahorrar un estimado de ${random.randint(5000, 15000):,} al mes en la verdulerÃ­a.",
        "tips": tips,
        "imagePrompt": f"DiseÃ±o de un {system} con {crop} para un usuario {request.experience} en {request.location}"
    }

    new_plan = CultivationPlan(user_email=user.email, plan_data=json.dumps(response_plan))
    db.add(new_plan)
    user.last_cultivation_plan = json.dumps(response_plan)
    db.commit()

    return response_plan

# CORRECCIÃ“N: Convertido a sync
@router.post("/chat")
def cultivation_chat(request: AIChatInput, user: User = Depends(get_user_or_create)):
    question = request.question.lower()
    response, image_prompt = "", ""
    if "plaga" in question or "bicho" in question:
        response = "Para plagas como el pulgÃ³n, una soluciÃ³n de agua con jabÃ³n potÃ¡sico es muy efectiva y orgÃ¡nica. AplicÃ¡lo cada 3 dÃ­as al atardecer."
        image_prompt = "FotografÃ­a macro de pulgones en una hoja de tomate."
    elif "nutrientes" in question or "abono" in question:
        response = "La clave estÃ¡ en el balance. Para crecimiento, mÃ¡s NitrÃ³geno (N). Para fruto, mÃ¡s FÃ³sforo (P) y Potasio (K). Un compost bien maduro es ideal para orgÃ¡nico."
        image_prompt = "GrÃ¡fico simple mostrando los macronutrientes NPK."
    elif "luz" in question or "sol" in question:
        response = "Hortalizas de fruto como tomates necesitan 6-8 horas de sol directo. Si no las tenÃ©s, considerÃ¡ cultivos de hoja como lechuga o espinaca."
        image_prompt = "IlustraciÃ³n de un balcÃ³n con mucho sol vs uno con poco sol."
    else:
        response = "Es una excelente pregunta. Para darte una respuesta mÃ¡s precisa, Â¿podrÃ­as darme mÃ¡s detalle sobre tu planta?"
        image_prompt = "Icono de un cerebro de IA con signos de pregunta."
    return {"response": response, "imagePrompt": image_prompt}

# CORRECCIÃ“N: Convertido a sync
@router.post("/validate-parameters")
def validate_cultivation_parameters(request: ValidateParamsRequest, user: User = Depends(get_user_or_create)):
    is_valid = True
    advice = "Â¡Tus parÃ¡metros estÃ¡n excelentes! Sigue asÃ­ para un crecimiento Ã³ptimo."
    if request.method == 'hydroponics':
        if request.ph is not None and not (5.5 <= request.ph <= 6.5):
            is_valid = False
            advice = "Resi: El pH estÃ¡ fuera del rango Ã³ptimo (5.5-6.5). Un pH incorrecto bloquea la absorciÃ³n de nutrientes. Te recomiendo usar un regulador."
        elif request.ec is not None and request.ec <= 0:
            is_valid = False
            advice = "Resi: La conductividad (EC) es muy baja. Tus plantas no estÃ¡n recibiendo suficientes nutrientes. AsegÃºrate de aÃ±adir la soluciÃ³n nutritiva."
        elif request.temp is not None and not (18 <= request.temp <= 24):
            is_valid = False
            advice = "Resi: La temperatura de la soluciÃ³n no es la ideal (18-24Â°C). Temperaturas altas reducen el oxÃ­geno y favorecen enfermedades."
    elif request.method == 'organic':
        if request.ph is not None and not (6.0 <= request.ph <= 7.0):
            is_valid = False
            advice = "Resi: El pH del suelo estÃ¡ fuera del rango Ã³ptimo (6.0-7.0). Ajusta con abonos orgÃ¡nicos como el compost para una mejor absorciÃ³n de nutrientes."
        elif request.soilMoisture is not None and not (30 <= request.soilMoisture <= 60):
            is_valid = False
            advice = "Resi: La humedad del suelo no es la ideal (30%-60%). AsegÃºrate de regar correctamente para evitar estrÃ©s hÃ­drico o pudriciÃ³n de raÃ­ces."
    return {"isValid": is_valid, "advice": advice}