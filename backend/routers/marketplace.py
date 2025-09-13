from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import User, MarketplaceItem, Transaction, GameProfile
from schemas import MarketplaceItemCreate, MarketplaceItemResponse
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/market",
    tags=["Marketplace"]
)

@router.post("/items", response_model=MarketplaceItemResponse)
def create_marketplace_item(item: MarketplaceItemCreate, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """Crea un nuevo item en el marketplace."""
    new_item = MarketplaceItem(**item.dict(), user_email=user.email)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/items", response_model=List[MarketplaceItemResponse])
def get_marketplace_items(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """Obtiene los items del marketplace."""
    items = db.query(MarketplaceItem).order_by(MarketplaceItem.id.desc()).offset(skip).limit(limit).all()
    return items

@router.post("/items/{item_id}/buy", response_model=dict)
def buy_item(item_id: int, db: Session = Depends(get_db), buyer: User = Depends(get_user_or_create)):
    """Inicia una transacción de compra (Escrow)."""
    item = db.query(MarketplaceItem).filter(MarketplaceItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")
    if item.user_email == buyer.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes comprar tu propio producto.")

    buyer_profile = db.query(GameProfile).filter(GameProfile.user_email == buyer.email).first()
    if not buyer_profile or buyer_profile.resilient_coins < item.price:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="No tienes suficientes Monedas Resilientes.")

    # Retiene las monedas del comprador
    buyer_profile.resilient_coins -= item.price
    
    # Crea la transacción en estado pendiente
    new_transaction = Transaction(
        item_id=item.id,
        seller_email=item.user_email,
        buyer_email=buyer.email,
        amount=item.price,
        status="pending" # Asumiendo que agregas un campo 'status' a la tabla Transaction
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    
    return {"message": "Compra iniciada. Confirma la entrega con el vendedor.", "transaction_id": new_transaction.id}

@router.post("/transactions/{transaction_id}/confirm", response_model=dict)
def confirm_transaction(transaction_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_user_or_create)):
    """Confirma la entrega y completa la transacción (vendedor escanea QR)."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction or transaction.seller_email != current_user.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no válida.")
    
    if transaction.status == "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta transacción ya fue completada.")

    seller_profile = db.query(GameProfile).filter(GameProfile.user_email == transaction.seller_email).first()
    
    # Libera las monedas al vendedor
    seller_profile.resilient_coins += transaction.amount
    transaction.status = "completed"
    
    db.commit()
    
    return {"message": "Transacción completada con éxito."}
