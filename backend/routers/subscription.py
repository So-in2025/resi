from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import User, Subscription
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions"]
)

@router.post("/premium")
def upgrade_to_premium(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """
    Actualiza el estado de un usuario a Premium.
    En un caso real, esto sería llamado por un webhook de una pasarela de pago.
    """
    if user.is_premium:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario ya es Premium.")

    user.is_premium = True
    
    # Crear o actualizar el registro de suscripción
    subscription = db.query(Subscription).filter(Subscription.user_email == user.email).first()
    if not subscription:
        subscription = Subscription(user_email=user.email)
        db.add(subscription)
    
    subscription.plan_name = "Premium"
    subscription.start_date = datetime.utcnow()
    subscription.end_date = datetime.utcnow() + timedelta(days=30) # Suscripción de 30 días
    subscription.payment_id = "simulated_payment_id_premium" # Placeholder

    db.commit()
    
    return {"status": "success", "message": "¡Felicitaciones! Ahora eres un miembro Premium."}

@router.post("/buy-coins")
def buy_coins(amount: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """
    Añade monedas resilientes a la cuenta del usuario.
    En un caso real, esto sería llamado por un webhook de una pasarela de pago.
    """
    profile = user.game_profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de juego no encontrado.")

    profile.resilient_coins += amount
    db.commit()
    
    return {"status": "success", "message": f"Se han añadido {amount} Monedas Resilientes a tu billetera."}

