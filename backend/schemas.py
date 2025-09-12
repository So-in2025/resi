# En: backend/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TextInput(BaseModel): text: str
class BudgetItemInput(BaseModel): category: str; allocated_amount: float; is_custom: bool
class BudgetInput(BaseModel): income: float; items: List[BudgetItemInput]

class OnboardingData(BaseModel): 
    income: float
    occupation: str
    age: int
    familyGroup: int
    risk_profile: str
    long_term_goals: str

class GoalInput(BaseModel): name: str; target_amount: float
class CultivationPlanRequest(BaseModel):
    method: str; space: str; experience: str; light: Optional[str] = None
    soilType: Optional[str] = None; location: str; initialBudget: float
    supermarketSpending: Optional[float] = 0
class AIChatInput(BaseModel): question: str
class ValidateParamsRequest(BaseModel):
    method: str; ph: Optional[float] = None; ec: Optional[float] = None
    temp: Optional[float] = None; soilMoisture: Optional[float] = None
class ResilienceSummary(BaseModel):
    title: str; message: str; suggestion: str; supermarket_spending: float
    # CORRECCIÓN: Se cambia orm_mode por from_attributes
    class Config:
        from_attributes = True

# --- Schemas para Planificador Familiar AMPLIADO ---
class FamilyMember(BaseModel): age: str; role: str
class FamilyPlanRequest(BaseModel):
    familyMembers: List[FamilyMember]
    dietaryPreferences: List[str]
    cookingStyle: str
    leisureActivities: List[str]
    financialGoals: str

class MealPlanItem(BaseModel):
    day: str
    meal: str
    tags: List[str]

class LeisureSuggestion(BaseModel):
    activity: str
    cost: str
    description: str

class FamilyPlanResponse(BaseModel):
    mealPlan: List[MealPlanItem]
    budgetSuggestion: str
    leisureSuggestion: LeisureSuggestion
    # CORRECCIÓN: Se cambia orm_mode por from_attributes
    class Config:
        from_attributes = True

class ExpenseData(BaseModel):
    amount: float; category: str; description: str

class ChatMessageResponse(BaseModel):
    sender: str
    message: str
    timestamp: datetime
    # CORRECCIÓN: Se cambia orm_mode por from_attributes
    class Config:
        from_attributes = True

# --- NUEVOS SCHEMAS DE RESPUESTA, ajustados para la base de datos real ---
# (Estos son los que te di en el mensaje anterior, ahora combinados con el resto)

class AchievementSchema(BaseModel):
    id: str
    name: str
    description: str
    icon: Optional[str] = None
    points: int
    type: str
    # CORRECCIÓN: Se cambia orm_mode por from_attributes
    class Config:
        from_attributes = True

class UserAchievementSchema(BaseModel):
    achievement: AchievementSchema
    progress: int
    is_completed: bool
    completion_date: Optional[str] = None
    # CORRECCIÓN: Se cambia orm_mode por from_attributes
    class Config:
        from_attributes = True

class GameProfileResponse(BaseModel):
    resi_score: int
    resilient_coins: int
    financial_points: int
    cultivation_points: int
    community_points: int
    achievements: List[UserAchievementSchema] = []
    # CORRECCIÓN: Se cambia orm_mode por from_attributes
    class Config:
        from_attributes = True

# NUEVOS ESQUEMAS PARA CULTIVO
class CultivationPlanResult(BaseModel):
    crop: str
    system: str
    materials: str
    projectedSavings: str
    tips: str
    imagePrompt: Optional[str] = None
    
class CultivationPlanResponse(BaseModel):
    plan_data: CultivationPlanResult
    created_at: datetime
    class Config:
        from_attributes = True

# --- NUEVOS SCHEMAS PARA EL MÓDULO DE CULTIVO EXTENDIDO ---
class HarvestLogInput(BaseModel):
    crop_name: str
    quantity: float
    unit: str
    
class HarvestLogResponse(BaseModel):
    id: int
    crop_name: str
    quantity: float
    unit: str
    harvest_date: datetime
    class Config:
        from_attributes = True

class CultivationTaskInput(BaseModel):
    task_name: str
    crop_name: Optional[str] = None
    due_date: datetime
    
class CultivationTaskResponse(BaseModel):
    id: int
    task_name: str
    crop_name: Optional[str] = None
    due_date: datetime
    is_completed: bool
    class Config:
        from_attributes = True