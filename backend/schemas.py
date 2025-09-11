# En: backend/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TextInput(BaseModel): text: str
class BudgetItemInput(BaseModel): category: str; allocated_amount: float; is_custom: bool
class BudgetInput(BaseModel): income: float; items: List[BudgetItemInput]

# --- OnboardingData AMPLIADO ---
class OnboardingData(BaseModel): 
    income: float
    occupation: str
    age: int
    familyGroup: int
    risk_profile: str # Nuevo
    long_term_goals: str # Nuevo

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

# --- Schemas para Planificador Familiar AMPLIADO ---
class FamilyMember(BaseModel): age: str; role: str
class FamilyPlanRequest(BaseModel):
    familyMembers: List[FamilyMember]
    dietaryPreferences: List[str]
    cookingStyle: str # Nuevo
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

    class Config:
        orm_mode = True

class ExpenseData(BaseModel):
    amount: float; category: str; description: str

class ChatMessageResponse(BaseModel):
    sender: str
    message: str
    timestamp: datetime
    class Config:
        orm_mode = True

# --- NUEVOS SCHEMAS PARA GAMIFICACIÓN ---
class AchievementSchema(BaseModel):
    id: str
    name: str
    description: str
    icon: Optional[str] = None
    points: int
    type: str

class UserAchievementSchema(BaseModel):
    achievement: AchievementSchema
    progress: int
    is_completed: bool
    completion_date: Optional[datetime] = None

class GameProfileSchema(BaseModel):
    resi_score: int
    resilient_coins: int
    financial_points: int
    cultivation_points: int
    community_points: int
    achievements: List[UserAchievementSchema] = []

    class Config:
        from_attributes = True
