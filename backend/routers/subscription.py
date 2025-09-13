from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import User, Subscription
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/subscriptions",
    tags=["Subscriptions"]
)

@router.post("/premium", response_model=dict)
def upgrade_to_premium(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """
    Actualiza la suscripción de un usuario a Premium.
    En un entorno real, esto sería llamado por un webhook de la pasarela de pago.
    """
    if user.is_premium:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario ya es Premium.")

    # Actualiza el estado del usuario
    user.is_premium = True
    
    # Registra la suscripción
    existing_subscription = db.query(Subscription).filter(Subscription.user_email == user.email).first()
    if existing_subscription:
        existing_subscription.plan_name = "Premium"
        existing_subscription.start_date = datetime.utcnow()
        existing_subscription.end_date = datetime.utcnow() + timedelta(days=30) # Suscripción de 30 días
        existing_subscription.payment_id = "simulated_payment_id"
    else:
        new_subscription = Subscription(
            user_email=user.email,
            plan_name="Premium",
            end_date=datetime.utcnow() + timedelta(days=30)
        )
        db.add(new_subscription)
        
    db.commit()
    
    return {"message": f"¡Felicitaciones! Ahora eres un miembro Premium de Resi."}
