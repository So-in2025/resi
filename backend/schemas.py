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
    class Config:
        from_attributes = True

# --- Schemas para Planificador Familiar ---
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
    ingredients: List[str] = []
    instructions: List[str] = []

class LeisureSuggestion(BaseModel):
    activity: str
    cost: str
    description: str

class FamilyPlanResponse(BaseModel):
    mealPlan: List[MealPlanItem]
    budgetSuggestion: str
    leisureSuggestion: LeisureSuggestion
    class Config:
        from_attributes = True

class ExpenseData(BaseModel):
    amount: float; category: str; description: str

class ChatMessageResponse(BaseModel):
    sender: str
    message: str
    timestamp: datetime
    class Config:
        from_attributes = True

# --- Schemas de Gamificación ---
class AchievementSchema(BaseModel):
    id: str
    name: str
    description: str
    icon: Optional[str] = None
    points: int
    type: str
    class Config:
        from_attributes = True

class UserAchievementSchema(BaseModel):
    achievement: AchievementSchema
    progress: int
    is_completed: bool
    completion_date: Optional[str] = None
    class Config:
        from_attributes = True

class GameProfileResponse(BaseModel):
    resi_score: int
    resilient_coins: int
    financial_points: int
    cultivation_points: int
    community_points: int
    achievements: List[UserAchievementSchema] = []
    class Config:
        from_attributes = True

# --- Schemas de Cultivo ---
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

# --- NUEVOS SCHEMAS PARA COMUNIDAD Y MERCADO ---
class CommunityPostBase(BaseModel):
    title: str
    content: str
    category: str

class CommunityPostCreate(CommunityPostBase):
    pass

class CommunityPostResponse(CommunityPostBase):
    id: int
    user_email: str
    created_at: datetime
    is_featured: bool
    class Config:
        from_attributes = True

class CommunityEventBase(BaseModel):
    name: str
    description: Optional[str] = None
    event_type: str
    location: str
    event_date: datetime

class CommunityEventCreate(CommunityEventBase):
    pass

class CommunityEventResponse(CommunityEventBase):
    id: int
    user_email: str
    class Config:
        from_attributes = True

class MarketplaceItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    is_service: bool = False

class MarketplaceItemCreate(MarketplaceItemBase):
    pass

class MarketplaceItemResponse(MarketplaceItemBase):
    id: int
    user_email: str
    status: str
    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: int
    item_id: int
    seller_email: str
    buyer_email: str
    amount: float
    status: str
    confirmation_code: str
    timestamp: datetime
    class Config:
        from_attributes = True

        