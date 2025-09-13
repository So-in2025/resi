# En: backend/database.py
import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from datetime import datetime
import json

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL is None:
    DATABASE_URL = "sqlite:///./resi.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class CommunityPost(Base):
    __tablename__ = "community_posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_email = Column(String, ForeignKey("users.email"))
    owner = relationship("User", back_populates="community_posts")
    is_featured = Column(Boolean, default=False)

class CommunityEvent(Base):
    __tablename__ = "community_events"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    event_type = Column(String, index=True)
    location = Column(String)
    event_date = Column(DateTime, nullable=False)
    user_email = Column(String, ForeignKey("users.email"))
    organizer = relationship("User", back_populates="community_events")

class MarketplaceItem(Base):
    __tablename__ = "marketplace_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    image_url = Column(String, nullable=True)
    is_service = Column(Boolean, default=False)
    status = Column(String, default="available")  # available, reserved, sold
    created_at = Column(DateTime, default=datetime.utcnow)
    user_email = Column(String, ForeignKey("users.email"))
    seller = relationship("User", back_populates="marketplace_items")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("marketplace_items.id"))
    seller_email = Column(String, ForeignKey("users.email"))
    buyer_email = Column(String, ForeignKey("users.email"))
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, completed, cancelled
    confirmation_code = Column(String, unique=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # --- AÑADE ESTAS LÍNEAS ---
    item = relationship("MarketplaceItem")
    seller = relationship("User", foreign_keys=[seller_email], back_populates="sales")
    buyer = relationship("User", foreign_keys=[buyer_email], back_populates="purchases")

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, ForeignKey("users.email"), unique=True)
    plan_name = Column(String, default="Gratuito")
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    payment_id = Column(String, nullable=True)
    owner = relationship("User", back_populates="subscription")

class User(Base):
    __tablename__ = "users"
    email = Column(String, primary_key=True, index=True)
    has_completed_onboarding = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    risk_profile = Column(String, nullable=True)
    long_term_goals = Column(Text, nullable=True)
    last_family_plan = Column(Text, nullable=True)
    last_cultivation_plan = Column(Text, nullable=True)
    
    expenses = relationship("Expense", back_populates="owner")
    budget_items = relationship("BudgetItem", back_populates="owner")
    saving_goals = relationship("SavingGoal", back_populates="owner")
    chat_messages = relationship("ChatMessage", back_populates="owner")
    family_plans = relationship("FamilyPlan", back_populates="owner")
    cultivation_plans = relationship("CultivationPlan", back_populates="owner")
    game_profile = relationship("GameProfile", back_populates="owner", uselist=False)
    user_achievements = relationship("UserAchievement", back_populates="owner")
    harvest_logs = relationship("HarvestLog", back_populates="owner")
    cultivation_tasks = relationship("CultivationTask", back_populates="owner")
    community_posts = relationship("CommunityPost", back_populates="owner")
    community_events = relationship("CommunityEvent", back_populates="organizer")
    marketplace_items = relationship("MarketplaceItem", back_populates="seller")
    subscription = relationship("Subscription", back_populates="owner", uselist=False)
    # --- AÑADE ESTAS LÍNEAS ---
    sales = relationship("Transaction", foreign_keys=[Transaction.seller_email], back_populates="seller")
    purchases = relationship("Transaction", foreign_keys=[Transaction.buyer_email], back_populates="buyer")

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

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    sender = Column(String, nullable=False)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_email = Column(String, ForeignKey("users.email"))
    owner = relationship("User", back_populates="chat_messages")

class FamilyPlan(Base):
    __tablename__ = "family_plans"
    id = Column(Integer, primary_key=True, index=True)
    plan_data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_email = Column(String, ForeignKey("users.email"))
    owner = relationship("User", back_populates="family_plans")

class CultivationPlan(Base):
    __tablename__ = "cultivation_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, ForeignKey("users.email"))
    plan_data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="cultivation_plans")

class GameProfile(Base):
    __tablename__ = "game_profiles"
    user_email = Column(String, ForeignKey("users.email"), primary_key=True, index=True)
    resi_score = Column(Integer, default=0)
    resilient_coins = Column(Integer, default=0)
    financial_points = Column(Integer, default=0)
    cultivation_points = Column(Integer, default=0)
    community_points = Column(Integer, default=0)
    owner = relationship("User", back_populates="game_profile", uselist=False)

class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    points = Column(Integer, default=0)
    type = Column(String, nullable=False)

class UserAchievement(Base):
    __tablename__ = "user_achievements"
    user_email = Column(String, ForeignKey("users.email"), primary_key=True)
    achievement_id = Column(String, ForeignKey("achievements.id"), primary_key=True)
    progress = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    completion_date = Column(DateTime, nullable=True)
    owner = relationship("User", back_populates="user_achievements")
    achievement_ref = relationship("Achievement")

class HarvestLog(Base):
    __tablename__ = "harvest_logs"
    id = Column(Integer, primary_key=True, index=True)
    crop_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    harvest_date = Column(DateTime, default=datetime.utcnow)
    user_email = Column(String, ForeignKey("users.email"))
    owner = relationship("User", back_populates="harvest_logs")

class CultivationTask(Base):
    __tablename__ = "cultivation_tasks"
    id = Column(Integer, primary_key=True, index=True)
    task_name = Column(String, nullable=False)
    crop_name = Column(String, nullable=True)
    due_date = Column(DateTime, nullable=False)
    is_completed = Column(Boolean, default=False)
    user_email = Column(String, ForeignKey("users.email"))
    owner = relationship("User", back_populates="cultivation_tasks")


def create_db_and_tables():
    Base.metadata.create_all(bind=engine)

