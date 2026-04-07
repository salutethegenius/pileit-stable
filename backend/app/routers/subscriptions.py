from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user
from app.services import kemispay
from app.monetization import assert_creator_can_receive_payments

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


class SubCreate(BaseModel):
    creator_id: str
    monthly_amount: float = Field(..., description="Monthly price in BSD (Bahamian dollars)")


@router.post("")
async def subscribe(
    body: SubCreate,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    kemispay.assert_live_payments_or_503()
    creator = db.get(models.User, body.creator_id)
    if not creator or creator.account_type != "creator":
        raise HTTPException(404, "Creator not found")
    assert_creator_can_receive_payments(creator, db)
    existing = (
        db.query(models.Subscription)
        .filter(
            models.Subscription.subscriber_id == user.id,
            models.Subscription.creator_id == body.creator_id,
            models.Subscription.status == "active",
        )
        .first()
    )
    if existing:
        return {"id": existing.id, "status": "already_active"}
    await kemispay.create_subscription_recurring(
        user.id, body.monthly_amount, body.creator_id
    )
    s = models.Subscription(
        subscriber_id=user.id,
        creator_id=body.creator_id,
        monthly_amount=Decimal(str(body.monthly_amount)),
        status="active",
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "status": s.status}


@router.delete("/{creator_id}")
def unsubscribe(
    creator_id: str,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    s = (
        db.query(models.Subscription)
        .filter(
            models.Subscription.subscriber_id == user.id,
            models.Subscription.creator_id == creator_id,
            models.Subscription.status == "active",
        )
        .first()
    )
    if s:
        s.status = "cancelled"
        db.commit()
    return {"ok": True}


@router.get("")
def my_subs(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Subscription)
        .filter(
            models.Subscription.subscriber_id == user.id,
            models.Subscription.status == "active",
        )
        .all()
    )
    return [
        {
            "creator_id": r.creator_id,
            "monthly_amount": float(r.monthly_amount or 0),
            "started_at": r.started_at.isoformat() if r.started_at else "",
        }
        for r in rows
    ]


@router.get("/check/{creator_id}")
def check_sub(
    creator_id: str,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    s = (
        db.query(models.Subscription)
        .filter(
            models.Subscription.subscriber_id == user.id,
            models.Subscription.creator_id == creator_id,
            models.Subscription.status == "active",
        )
        .first()
    )
    return {"subscribed": bool(s)}
