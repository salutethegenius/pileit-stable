from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user
from app.config import settings
from app.services import kemispay
from app.monetization import assert_creator_can_receive_payments

router = APIRouter(prefix="/tips", tags=["tips"])


class TipCreate(BaseModel):
    creator_id: str
    video_id: str | None = None
    amount: float = Field(..., description="Tip amount in BSD (Bahamian dollars)")


@router.post("")
async def send_tip(
    body: TipCreate,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if body.amount <= 0:
        raise HTTPException(400, "Invalid amount")
    creator = db.get(models.User, body.creator_id)
    if not creator:
        raise HTTPException(404, "Creator not found")
    assert_creator_can_receive_payments(creator, db)
    platform_cut = Decimal(str(body.amount)) * Decimal(str(settings.platform_fee_tips))
    creator_cut = Decimal(str(body.amount)) - platform_cut
    cents = int(float(body.amount) * 100)
    tx = await kemispay.charge_amount(
        cents,
        {"user_id": user.id, "creator_id": body.creator_id, "video_id": body.video_id},
    )
    tip = models.Tip(
        sender_id=user.id,
        creator_id=body.creator_id,
        video_id=body.video_id,
        amount=Decimal(str(body.amount)),
        kemispay_tx_id=tx,
    )
    db.add(tip)
    prof = creator.creator_profile
    if prof:
        prof.total_tips_received = (prof.total_tips_received or Decimal("0")) + creator_cut
    if body.video_id:
        v = db.get(models.Video, body.video_id)
        if v:
            v.tip_total = (v.tip_total or Decimal("0")) + Decimal(str(body.amount))
    db.commit()
    return {"id": tip.id, "kemispay_tx_id": tx, "platform_fee": float(platform_cut)}


@router.get("/sent")
def tips_sent(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    rows = db.query(models.Tip).filter(models.Tip.sender_id == user.id).all()
    return [
        {
            "id": t.id,
            "amount": float(t.amount),
            "creator_id": t.creator_id,
            "video_id": t.video_id,
            "created_at": t.created_at.isoformat() if t.created_at else "",
        }
        for t in rows
    ]


@router.get("/received")
def tips_received(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if user.account_type not in ("creator", "admin"):
        raise HTTPException(403, "Creators only")
    rows = db.query(models.Tip).filter(models.Tip.creator_id == user.id).all()
    return [
        {
            "id": t.id,
            "amount": float(t.amount),
            "sender_id": t.sender_id,
            "created_at": t.created_at.isoformat() if t.created_at else "",
        }
        for t in rows
    ]
