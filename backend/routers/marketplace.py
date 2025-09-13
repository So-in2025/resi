from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from database import User, MarketplaceItem, Transaction, GameProfile
from schemas import MarketplaceItemCreate, MarketplaceItemResponse, TransactionResponse
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/market",
    tags=["Marketplace"]
)

@router.post("/items", response_model=MarketplaceItemResponse)
def create_marketplace_item(item: MarketplaceItemCreate, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """Crea un nuevo item en el marketplace."""
    # En una implementación real, aquí se manejaría la subida de la imagen a un bucket (S3, Cloud Storage)
    # y se guardaría la URL en `item.image_url`.
    new_item = MarketplaceItem(**item.dict(), user_email=user.email)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/items", response_model=List[MarketplaceItemResponse])
def get_marketplace_items(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """Obtiene los items del marketplace que están disponibles."""
    items = db.query(MarketplaceItem).filter(MarketplaceItem.status == 'available').order_by(MarketplaceItem.created_at.desc()).offset(skip).limit(limit).all()
    return items

@router.post("/items/{item_id}/buy", response_model=TransactionResponse)
def buy_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """Inicia la compra de un item, retiene las monedas y crea una transacción."""
    item = db.query(MarketplaceItem).filter(MarketplaceItem.id == item_id).first()
    if not item or item.status != 'available':
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ítem no disponible o ya reservado.")

    if item.user_email == user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes comprar tu propio ítem.")

    buyer_profile = db.query(GameProfile).filter(GameProfile.user_email == user.email).first()
    if not buyer_profile or buyer_profile.resilient_coins < item.price:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes suficientes Monedas Resilientes.")

    # Lógica de Escrow: Retener monedas y reservar item
    buyer_profile.resilient_coins -= item.price
    item.status = 'reserved'
    
    new_transaction = Transaction(
        item_id=item.id,
        seller_email=item.user_email,
        buyer_email=user.email,
        amount=item.price,
        confirmation_code=str(uuid.uuid4()) # Código único para el QR
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    return new_transaction

@router.post("/transactions/{transaction_id}/confirm", response_model=TransactionResponse)
def confirm_transaction(transaction_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """Confirma una transacción, liberando las monedas al vendedor. Solo el vendedor puede confirmar."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    
    if not transaction or transaction.seller_email != user.email or transaction.status != 'pending':
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transacción no válida para confirmar.")

    seller_profile = db.query(GameProfile).filter(GameProfile.user_email == user.email).first()
    if not seller_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil del vendedor no encontrado.")

    # Liberar fondos al vendedor
    seller_profile.resilient_coins += transaction.amount
    transaction.status = 'completed'
    
    item = db.query(MarketplaceItem).filter(MarketplaceItem.id == transaction.item_id).first()
    if item:
        item.status = 'sold'

    db.commit()
    db.refresh(transaction)
    return transaction

@router.get("/my-transactions", response_model=List[TransactionResponse])
def get_my_transactions(db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """Obtiene el historial de compras y ventas del usuario."""
    transactions = db.query(Transaction).filter(
        (Transaction.buyer_email == user.email) | (Transaction.seller_email == user.email)
    ).order_by(Transaction.timestamp.desc()).all()
    return transactions

