from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user

router = APIRouter(prefix="/follows", tags=["follows"])


class FollowBody(BaseModel):
    creator_id: str


@router.post("")
def follow_creator(
    body: FollowBody,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    cid = (body.creator_id or "").strip()
    if not cid:
        raise HTTPException(400, "creator_id required")
    if cid == user.id:
        raise HTTPException(400, "You cannot follow yourself")
    creator = db.get(models.User, cid)
    if not creator or creator.account_type not in ("creator", "admin"):
        raise HTTPException(404, "Creator not found")
    existing = (
        db.query(models.CreatorFollow)
        .filter(
            models.CreatorFollow.follower_id == user.id,
            models.CreatorFollow.creator_id == cid,
        )
        .first()
    )
    if existing:
        return {"ok": True, "following": True, "status": "already_following"}
    row = models.CreatorFollow(follower_id=user.id, creator_id=cid)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"ok": True, "following": True, "status": "already_following"}
    return {"ok": True, "following": True, "status": "following"}


@router.delete("/{creator_id}")
def unfollow_creator(
    creator_id: str,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    db.query(models.CreatorFollow).filter(
        models.CreatorFollow.follower_id == user.id,
        models.CreatorFollow.creator_id == creator_id,
    ).delete(synchronize_session=False)
    db.commit()
    return {"ok": True, "following": False}


@router.get("/check/{creator_id}")
def check_follow(
    creator_id: str,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    s = (
        db.query(models.CreatorFollow)
        .filter(
            models.CreatorFollow.follower_id == user.id,
            models.CreatorFollow.creator_id == creator_id,
        )
        .first()
    )
    return {"following": bool(s)}
