from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user, get_current_user_optional, require_creator
from app.monetization import creator_tip_subscribe_embed

router = APIRouter(prefix="/videos", tags=["videos"])


class VideoOut(BaseModel):
    id: str
    creator_id: str
    title: str
    description: str | None
    video_url: str | None
    thumbnail_url: str | None
    duration_seconds: int | None
    category: str | None
    is_locked: bool
    status: str
    view_count: int
    tip_total: str

    class Config:
        from_attributes = True


class VideoCreate(BaseModel):
    title: str
    description: str | None = None
    video_url: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    category: str | None = None
    is_locked: bool = False
    status: str = "draft"


def _serialize(v: models.Video) -> dict:
    return {
        "id": v.id,
        "title": v.title,
        "description": v.description,
        "thumbnail_url": v.thumbnail_url,
        "backdrop_url": v.thumbnail_url,
        "video_url": v.video_url,
        "duration_seconds": v.duration_seconds or 0,
        "category": v.category or "",
        "is_locked": v.is_locked,
        "view_count": v.view_count,
        "tip_total": float(v.tip_total),
        "creator_id": v.creator_id,
        "status": v.status,
        "created_at": v.created_at.isoformat() if v.created_at else "",
    }


@router.get("/mine")
def list_my_videos(
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Video)
        .filter(models.Video.creator_id == user.id)
        .order_by(models.Video.created_at.desc())
        .all()
    )
    return [
        {
            "id": v.id,
            "title": v.title,
            "status": v.status,
            "view_count": v.view_count,
            "tip_total": float(v.tip_total),
            "is_locked": v.is_locked,
            "thumbnail_url": v.thumbnail_url,
        }
        for v in rows
    ]


@router.get("")
def list_videos(
    db: Session = Depends(get_db),
    category: str | None = None,
    locked: bool | None = None,
    trending: bool | None = None,
):
    q = (
        db.query(models.Video)
        .join(models.User, models.User.id == models.Video.creator_id)
        .filter(models.Video.status == "published")
    )
    if category:
        q = q.filter(models.Video.category == category)
    if locked is not None:
        q = q.filter(models.Video.is_locked == locked)
    if not trending:
        # Home / browse: surface newest creators first, then newest uploads per creator.
        q = q.order_by(desc(models.User.created_at), desc(models.Video.created_at))
    rows = q.all()
    if trending:
        rows = sorted(rows, key=lambda x: x.view_count, reverse=True)
    out = []
    for v in rows:
        u = db.get(models.User, v.creator_id)
        prof = u.creator_profile if u else None
        base = _serialize(v)
        base["creator"] = creator_tip_subscribe_embed(db, u, prof)
        out.append(base)
    return out


@router.get("/{video_id}")
def get_video(
    video_id: str,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_current_user_optional),
):
    v = db.get(models.Video, video_id)
    if not v:
        raise HTTPException(404, "Not found")
    if v.status != "published":
        allowed = user and (
            user.id == v.creator_id or user.account_type == "admin"
        )
        if not allowed:
            raise HTTPException(404, "Not found")
    u = db.get(models.User, v.creator_id)
    prof = u.creator_profile if u else None
    base = _serialize(v)
    base["creator"] = creator_tip_subscribe_embed(db, u, prof)
    base["tip_count"] = int(float(v.tip_total))
    base["pile_count"] = db.query(models.PileComment).filter(
        models.PileComment.video_id == v.id
    ).count()
    base["share_count"] = 0
    return base


@router.post("/{video_id}/view")
def increment_view(video_id: str, db: Session = Depends(get_db)):
    v = db.get(models.Video, video_id)
    if not v:
        raise HTTPException(404, "Not found")
    v.view_count += 1
    db.commit()
    return {"view_count": v.view_count}


@router.post("", status_code=201)
def create_video(
    body: VideoCreate,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    v = models.Video(
        creator_id=user.id,
        title=body.title,
        description=body.description,
        video_url=body.video_url,
        thumbnail_url=body.thumbnail_url,
        duration_seconds=body.duration_seconds,
        category=body.category,
        is_locked=body.is_locked,
        status=body.status,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"id": v.id}


@router.put("/{video_id}")
def update_video(
    video_id: str,
    body: VideoCreate,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(404, "Not found")
    for k, val in body.model_dump().items():
        setattr(v, k, val)
    db.commit()
    return {"ok": True}


@router.delete("/{video_id}")
def delete_video(
    video_id: str,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(404, "Not found")
    db.delete(v)
    db.commit()
    return {"ok": True}


class PileCommentOut(BaseModel):
    id: str
    user_display_name: str
    comment_type: str
    content: str | None
    media_url: str | None
    duration_seconds: int | None
    like_count: int
    created_at: str


@router.get("/{video_id}/pile", response_model=list[PileCommentOut])
def get_pile(video_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(models.PileComment)
        .filter(models.PileComment.video_id == video_id)
        .order_by(models.PileComment.created_at.desc())
        .all()
    )
    out = []
    for c in rows:
        u = db.get(models.User, c.user_id)
        out.append(
            PileCommentOut(
                id=c.id,
                user_display_name=u.display_name if u else "Unknown",
                comment_type=c.comment_type,
                content=c.content,
                media_url=c.media_url,
                duration_seconds=c.duration_seconds,
                like_count=c.like_count,
                created_at=c.created_at.isoformat() if c.created_at else "",
            )
        )
    return out


class ChatOut(BaseModel):
    id: str
    user_display_name: str
    body: str
    created_at: str


@router.get("/{video_id}/chat", response_model=list[ChatOut])
def get_chat(video_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(models.LiveChatMessage)
        .filter(models.LiveChatMessage.video_id == video_id)
        .order_by(models.LiveChatMessage.created_at.asc())
        .limit(200)
        .all()
    )
    out = []
    for m in rows:
        u = db.get(models.User, m.user_id)
        out.append(
            ChatOut(
                id=m.id,
                user_display_name=u.display_name if u else "Unknown",
                body=m.body,
                created_at=m.created_at.isoformat() if m.created_at else "",
            )
        )
    return out


class ChatPost(BaseModel):
    body: str


@router.post("/{video_id}/chat")
def post_chat(
    video_id: str,
    body: ChatPost,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if not body.body.strip():
        raise HTTPException(400, "Empty message")
    m = models.LiveChatMessage(
        video_id=video_id, user_id=user.id, body=body.body.strip()
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id}
