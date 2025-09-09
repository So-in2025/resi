# En: backend/routers/family.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json

from database import User, FamilyPlan
from schemas import FamilyPlanRequest, FamilyPlanResponse, MealPlanItem, LeisureSuggestion
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/family-plan",
    tags=["Family Plan"]
)

@router.get("/latest", response_model=FamilyPlanResponse)
def get_latest_family_plan(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    latest_plan = db.query(FamilyPlan).filter(FamilyPlan.user_email == user.email).order_by(FamilyPlan.created_at.desc()).first()
    if not latest_plan:
        return None # Opcional: podrías devolver un plan por defecto o un 404
    
    return FamilyPlanResponse(
        mealPlan=[MealPlanItem(**item) for item in json.loads(latest_plan.meal_plan_json)],
        budgetSuggestion=latest_plan.budget_suggestion,
        leisureSuggestion=LeisureSuggestion(**json.loads(latest_plan.leisure_suggestion_json))
    )

@router.post("/generate", response_model=FamilyPlanResponse)
def generate_family_plan(request: FamilyPlanRequest, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    # Lógica de IA (simulada) para generar un plan mucho más detallado
    recipes = [
        {"meal": "Guiso de Lentejas Power", "tags": ["económico", "rinde mucho"]},
        {"meal": "Tarta de Espinaca y Ricota", "tags": ["vegetariano", "fácil"]},
        {"meal": "Pollo al Horno con Papas", "tags": ["clásico", "finde"]},
        {"meal": "Milanesas de Berenjena con Puré", "tags": ["saludable", "vegetariano"]},
        {"meal": "Pastel de Papa", "tags": ["clásico", "contundente"]},
        {"meal": "Fideos con Brócoli y Ajo", "tags": ["rápido", "fácil"]},
        {"meal": "Risotto de Hongos", "tags": ["gourmet", "especial"]},
        {"meal": "Empanadas de Humita", "tags": ["regional", "vegetariano"]},
    ]
    
    # Filtrar recetas según preferencias
    available_recipes = recipes.copy()
    if "Vegetariano" in request.dietaryPreferences:
        available_recipes = [r for r in available_recipes if "vegetariano" in r["tags"]]
    if request.cookingStyle == "Rápido y Fácil":
        available_recipes = [r for r in available_recipes if "rápido" in r["tags"] or "fácil" in r["tags"]]

    # Crear plan de comidas
    days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]
    meal_plan = []
    for day in days:
        if available_recipes:
            chosen_recipe = available_recipes.pop(0)
            meal_plan.append(MealPlanItem(day=day, meal=chosen_recipe["meal"], tags=chosen_recipe["tags"]))
        else: # Si nos quedamos sin recetas, rellenamos
            meal_plan.append(MealPlanItem(day=day, meal="Ensalada completa", tags=["rápido", "saludable"]))

    # Crear sugerencia de presupuesto
    budget_suggestion = "Para empezar, te sugiero crear una categoría de 'Ahorro Familiar' en tu Planificador con un 10% de tus ingresos. ¡Cada peso cuenta!"
    if "vacaciones" in request.financialGoals.lower():
        budget_suggestion = "Para tu meta de 'Vacaciones', creá esa categoría en tu Planificador. Si lográs reducir un 15% los 'Gastos Hormiga' (delivery, kiosco), podrías acelerar el objetivo significativamente."
    elif "saldar" in request.financialGoals.lower():
        budget_suggestion = "Para 'Saldar la tarjeta', atacá siempre más del pago mínimo. Te sugiero asignar un monto fijo en el Planificador para la tarjeta, ¡la constancia es clave para liberarte de esa deuda!"

    # Crear sugerencia de ocio
    leisure_suggestion = LeisureSuggestion(activity="Noche de Pelis en Casa", cost="Casi nulo", description="Una maratón de películas con pochoclos caseros es un planazo que no falla y no cuesta casi nada.")
    if "Aire Libre (parques, bici)" in request.leisureActivities:
        leisure_suggestion = LeisureSuggestion(activity="Bicicleteada y Picnic en la Costanera", cost="Bajo", description="Preparen sandwiches y salgan a pedalear. Es una excelente forma de disfrutar el día en familia sin gastar de más.")
    elif "Juegos de Mesa" in request.leisureActivities:
        leisure_suggestion = LeisureSuggestion(activity="Torneo de Juegos de Mesa", cost="Casi nulo", description="Desempolven el TEG, el Burako o las cartas. Un buen torneo con premios simbólicos puede ser más divertido que cualquier salida.")

    # Guardar el nuevo plan en la base de datos
    new_plan = FamilyPlan(
        user_email=user.email,
        meal_plan_json=json.dumps([item.dict() for item in meal_plan]),
        budget_suggestion=budget_suggestion,
        leisure_suggestion_json=leisure_suggestion.json()
    )
    db.add(new_plan)
    db.commit()

    return FamilyPlanResponse(
        mealPlan=meal_plan,
        budgetSuggestion=budget_suggestion,
        leisureSuggestion=leisure_suggestion
    )