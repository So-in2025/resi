# En: backend/database.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from datetime import datetime
import json

DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL is None:
    DATABASE_URL = "sqlite+aiosqlite:///./resi.db"
    engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    print(f"DEBUG: Conectando con URL: {DATABASE_URL}")

    engine = create_async_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine, 
    class_=AsyncSession
)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    email = Column(String, primary_key=True, index=True)
    has_completed_onboarding = Column(Boolean, default=False)
    is_premium = Column(Boolean, default=False)
    risk_profile = Column(String, nullable=True)
    long_term_goals = Column(Text, nullable=True)
    
    # NUEVOS CAMPOS: Para historial de IA
    last_family_plan = Column(Text, nullable=True)
    last_cultivation_plan = Column(Text, nullable=True)
    
    expenses = relationship("Expense", back_populates="owner")
    budget_items = relationship("BudgetItem", back_populates="owner")
    saving_goals = relationship("SavingGoal", back_populates="owner")
    chat_messages = relationship("ChatMessage", back_populates="owner")
    family_plans = relationship("FamilyPlan", back_populates="owner")
    cultivation_plans = relationship("CultivationPlan", back_populates="owner")
    
    # NUEVAS RELACIONES para el Módulo 5
    game_profile = relationship("GameProfile", back_populates="owner", uselist=False)
    user_achievements = relationship("UserAchievement", back_populates="owner")

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

async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)