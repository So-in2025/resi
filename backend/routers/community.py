# En: backend/routers/community.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import User, CommunityPost, CommunityEvent
from schemas import CommunityPostCreate, CommunityPostResponse, CommunityEventCreate, CommunityEventResponse
from dependencies import get_db, get_user_or_create

router = APIRouter(
    prefix="/community",
    tags=["Community"]
)

@router.post("/posts", response_model=CommunityPostResponse)
def create_community_post(post: CommunityPostCreate, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """
    Crea una nueva publicación.
    - Los usuarios gratuitos tienen un límite de 5 publicaciones activas.
    - Los usuarios premium no tienen límite.
    """
    if not user.is_premium:
        post_count = db.query(CommunityPost).filter(CommunityPost.user_email == user.email).count()
        if post_count >= 5:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Alcanzaste el límite de 5 publicaciones. Hacete Premium para publicar sin límites."
            )
    
    new_post = CommunityPost(**post.dict(), user_email=user.email)
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.post("/posts/{post_id}/feature", response_model=CommunityPostResponse)
def feature_community_post(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """Destaca una publicación. Solo para usuarios Premium."""
    if not user.is_premium:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo los miembros Premium pueden destacar publicaciones.")
    
    post_to_feature = db.query(CommunityPost).filter(CommunityPost.id == post_id, CommunityPost.user_email == user.email).first()
    if not post_to_feature:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publicación no encontrada.")
        
    post_to_feature.is_featured = True
    db.commit()
    db.refresh(post_to_feature)
    return post_to_feature

@router.get("/posts", response_model=List[CommunityPostResponse])
def get_community_posts(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """
    Obtiene las publicaciones, mostrando primero las destacadas (Premium).
    """
    posts = db.query(CommunityPost).order_by(CommunityPost.is_featured.desc(), CommunityPost.created_at.desc()).offset(skip).limit(limit).all()
    return posts

@router.post("/events", response_model=CommunityEventResponse)
def create_community_event(event: CommunityEventCreate, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """Crea un nuevo evento comunitario (feria, trueque, etc.)."""
    new_event = CommunityEvent(**event.dict(), user_email=user.email)
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

@router.get("/events", response_model=List[CommunityEventResponse])
def get_community_events(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """Obtiene los próximos eventos comunitarios."""
    events = db.query(CommunityEvent).order_by(CommunityEvent.event_date.asc()).offset(skip).limit(limit).all()
    return events

@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_community_post(post_id: int, db: Session = Depends(get_db), user: User = Depends(get_user_or_create)):
    """
    Elimina una publicación de la comunidad.
    Un usuario solo puede eliminar sus propias publicaciones.
    """
    post_to_delete = db.query(CommunityPost).filter(
        CommunityPost.id == post_id,
        CommunityPost.user_email == user.email
    ).first()

    if not post_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Publicación no encontrada o no tienes permiso para eliminarla."
        )

    db.delete(post_to_delete)
    db.commit()
    return