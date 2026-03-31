from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user

router = APIRouter(prefix="/pile", tags=["pile"])


class PileCreate(BaseModel):
    comment_type: str
    content: str | None = None
    media_url: str | None = None
    duration_seconds: int | None = None


@router.post("/{video_id}")
def add_pile(
    video_id: str,
    body: PileCreate,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    v = db.get(models.Video, video_id)
    if not v:
        raise HTTPException(404, "Video not found")
    if body.comment_type not in ("text", "voice", "video"):
        raise HTTPException(400, "Invalid comment_type")
    if body.comment_type == "text" and not (body.content or "").strip():
        raise HTTPException(400, "Text required")
    c = models.PileComment(
        video_id=video_id,
        user_id=user.id,
        comment_type=body.comment_type,
        content=body.content,
        media_url=body.media_url,
        duration_seconds=body.duration_seconds,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id}


@router.post("/{comment_id}/like")
def like_pile(
    comment_id: str,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    c = db.get(models.PileComment, comment_id)
    if not c:
        raise HTTPException(404, "Not found")
    c.like_count += 1
    db.commit()
    return {"like_count": c.like_count}


@router.delete("/{comment_id}")
def delete_pile(
    comment_id: str,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    c = db.get(models.PileComment, comment_id)
    if not c or c.user_id != user.id:
        raise HTTPException(404, "Not found")
    db.delete(c)
    db.commit()
    return {"ok": True}
