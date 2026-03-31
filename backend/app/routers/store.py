from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user, require_creator
from app.config import settings
from app.services import kemispay
from app.monetization import assert_creator_can_receive_payments

router = APIRouter(prefix="/store", tags=["store"])


class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    price: float = Field(..., description="Price in BSD (Bahamian dollars)")
    image_url: str | None = None
    product_type: str = "digital"
    stock_count: int | None = None


class CheckoutBody(BaseModel):
    product_id: str
    quantity: int = Field(1, ge=1, le=100)


@router.post("/products", status_code=201)
def add_product(
    body: ProductCreate,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    p = models.StoreProduct(
        creator_id=user.id,
        name=body.name,
        description=body.description,
        price=Decimal(str(body.price)),
        image_url=body.image_url,
        product_type=body.product_type,
        stock_count=body.stock_count,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id}


@router.put("/products/{product_id}")
def edit_product(
    product_id: str,
    body: ProductCreate,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    p = db.get(models.StoreProduct, product_id)
    if not p or p.creator_id != user.id:
        raise HTTPException(404, "Not found")
    p.name = body.name
    p.description = body.description
    p.price = Decimal(str(body.price))
    p.image_url = body.image_url
    p.product_type = body.product_type
    p.stock_count = body.stock_count
    db.commit()
    return {"ok": True}


@router.delete("/products/{product_id}")
def del_product(
    product_id: str,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    p = db.get(models.StoreProduct, product_id)
    if not p or p.creator_id != user.id:
        raise HTTPException(404, "Not found")
    p.active = False
    db.commit()
    return {"ok": True}


@router.post("/checkout")
async def checkout(
    body: CheckoutBody,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    p = db.get(models.StoreProduct, body.product_id)
    if not p or not p.active:
        raise HTTPException(404, "Product not found")
    seller = db.get(models.User, p.creator_id)
    if seller:
        assert_creator_can_receive_payments(seller, db)
    if p.stock_count is not None and p.stock_count < body.quantity:
        raise HTTPException(400, "Insufficient stock")
    total = float(p.price) * body.quantity
    platform_fee = total * settings.platform_fee_store
    cents = int(total * 100)

    # Decrement stock first, then charge. Roll back if payment fails.
    if p.stock_count is not None:
        p.stock_count -= body.quantity
    db.flush()

    try:
        tx = await kemispay.charge_amount(
            cents,
            {"product_id": p.id, "buyer_id": user.id, "creator_id": p.creator_id},
        )
    except Exception:
        db.rollback()
        raise HTTPException(502, "Payment processing failed")

    db.commit()
    return {
        "kemispay_tx_id": tx,
        "total": total,
        "platform_fee": platform_fee,
        "creator_receives": total - platform_fee,
    }


@router.get("/{creator_handle}")
def store_for_creator(creator_handle: str, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.handle == creator_handle).first()
    if not u:
        raise HTTPException(404, "Not found")
    rows = (
        db.query(models.StoreProduct)
        .filter(
            models.StoreProduct.creator_id == u.id, models.StoreProduct.active == True
        )
        .all()
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": float(p.price),
            "image_url": p.image_url,
            "product_type": p.product_type,
            "stock_count": p.stock_count,
        }
        for p in rows
    ]
