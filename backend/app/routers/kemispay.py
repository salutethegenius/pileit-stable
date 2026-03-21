from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user
from app.services import kemispay as kpay

router = APIRouter(prefix="/kemispay", tags=["kemispay"])


class ChargeBody(BaseModel):
    amount_cents: int = Field(..., description="Amount in cents of BSD (1 BSD = 100 cents)")
    metadata: dict = Field(default_factory=dict)


@router.post("/charge")
async def charge(
    body: ChargeBody,
    user: Annotated[models.User, Depends(get_current_user)],
):
    tx = await kpay.charge_amount(body.amount_cents, body.metadata | {"user": user.id})
    return {"id": tx}


@router.get("/payouts")
def payouts(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if user.account_type not in ("creator", "admin"):
        raise HTTPException(403, "Forbidden")
    return {"payouts": []}


class PayoutBody(BaseModel):
    amount: float = Field(..., description="Payout amount in BSD (Bahamian dollars)")


@router.post("/payout")
async def payout_trigger(
    body: PayoutBody,
    user: Annotated[models.User, Depends(get_current_user)],
):
    return {"status": "queued", "amount": body.amount}
