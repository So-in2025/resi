# En: backend/routers/family.py
from fastapi import APIRouter, Depends

# CORRECCIÓN: Importamos de forma absoluta desde la raíz del 'backend'.
from database import User
from schemas import FamilyPlanRequest
from dependencies import get_user_or_create

router = APIRouter(
    prefix="/family-plan",
    tags=["Family Plan"]
)

@router.post("/generate")
def generate_family_plan(request: FamilyPlanRequest, user: User = Depends(get_user_or_create)):
    # ... (lógica sin cambios)
    meal_plan = [
        {"day": "Lunes", "meal": "Guiso de Lentejas Power"},
        {"day": "Martes", "meal": "Tarta de Espinaca y Ricota"},
        {"day": "Miércoles", "meal": "Pollo al Horno con Papas y Batatas"},
        {"day": "Jueves", "meal": "Milanesas de Berenjena con Puré"},
        {"day": "Viernes", "meal": "Fideos con Brócoli y Ajo"},
    ]
    budget_suggestion = "Para empezar, te sugiero crear una categoría de 'Ahorro Familiar' en tu Planificador con un 10% de tus ingresos. ¡Cada peso cuenta!"
    if "vacaciones" in request.financialGoals.lower():
        budget_suggestion = "Para tu meta de 'Vacaciones', creá esa categoría en tu Planificador. Si lográs reducir un 15% los 'Gastos Hormiga' (delivery, kiosco), podrías acelerar el objetivo significativamente."
    elif "saldar" in request.financialGoals.lower():
        budget_suggestion = "Para 'Saldar la tarjeta', atacá siempre más del pago mínimo. Te sugiero asignar un monto fijo en el Planificador para la tarjeta, ¡la constancia es clave para liberarte de esa deuda!"
    leisure_suggestion = {"activity": "Noche de Pelis en Casa", "cost": "Casi nulo", "description": "Una maratón de películas con pochoclos caseros es un planazo que no falla y no cuesta casi nada."}
    if "aire libre" in ''.join(request.leisureActivities).lower():
        leisure_suggestion = {"activity": "Bicicleteada y Picnic en la Costanera", "cost": "Bajo", "description": "Preparen sandwiches y salgan a pedalear. Es una excelente forma de disfrutar el día en familia sin gastar de más."}
    return {"mealPlan": meal_plan, "budgetSuggestion": budget_suggestion, "leisureSuggestion": leisure_suggestion}