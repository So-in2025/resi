# En: backend/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TextInput(BaseModel): text: str
class BudgetItemInput(BaseModel): category: str; allocated_amount: float; is_custom: bool
class BudgetInput(BaseModel): income: float; items: List[BudgetItemInput]
class OnboardingData(BaseModel): income: float; occupation: str; age: int; familyGroup: int
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
class FamilyMember(BaseModel): age: str; role: str
class FamilyPlanRequest(BaseModel):
    familyMembers: List[FamilyMember]; dietaryPreferences: List[str]
    financialGoals: str; leisureActivities: List[str]
class ExpenseData(BaseModel):
    amount: float; category: str; description: str

# --- NUEVO SCHEMA PARA EL HISTORIAL DEL CHAT ---
class ChatMessageResponse(BaseModel):
    sender: str
    message: str
    timestamp: datetime

    class Config:
        orm_mode = True