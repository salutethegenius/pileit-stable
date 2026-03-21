from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import require_creator

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview")
def overview(
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    tips = (
        db.query(func.coalesce(func.sum(models.Tip.amount), 0))
        .filter(models.Tip.creator_id == user.id)
        .scalar()
    )
    subs = db.query(models.Subscription).filter(
        models.Subscription.creator_id == user.id,
        models.Subscription.status == "active",
    ).count()
    views = (
        db.query(func.coalesce(func.sum(models.Video.view_count), 0))
        .filter(models.Video.creator_id == user.id)
        .scalar()
    )
    recent_tips = (
        db.query(models.Tip)
        .filter(models.Tip.creator_id == user.id)
        .order_by(models.Tip.created_at.desc())
        .limit(10)
        .all()
    )
    recent_comments = (
        db.query(models.PileComment)
        .join(models.Video, models.Video.id == models.PileComment.video_id)
        .filter(models.Video.creator_id == user.id)
        .order_by(models.PileComment.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "total_earnings": float(tips or 0),
        "this_month": float(tips or 0),
        "subscribers": int(subs),
        "total_views": int(views or 0),
        "recent_tips": [
            {"amount": float(t.amount), "at": t.created_at.isoformat() if t.created_at else ""}
            for t in recent_tips
        ],
        "recent_comments": [
            {
                "id": c.id,
                "video_id": c.video_id,
                "preview": (c.content or "")[:80],
                "at": c.created_at.isoformat() if c.created_at else "",
            }
            for c in recent_comments
        ],
    }


@router.get("/earnings")
def earnings(
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    tips = (
        db.query(func.coalesce(func.sum(models.Tip.amount), 0))
        .filter(models.Tip.creator_id == user.id)
        .scalar()
    )
    return {
        "tips_total": float(tips or 0),
        "subscriptions_estimate": 0,
        "store_sales": 0,
        "payouts": [],
    }


@router.get("/analytics")
def analytics(
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    vids = db.query(models.Video).filter(models.Video.creator_id == user.id).all()
    return {
        "videos": [
            {"id": v.id, "title": v.title, "views": v.view_count, "tips": float(v.tip_total)}
            for v in vids
        ]
    }
