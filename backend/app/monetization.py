"""Gate money movement to creators until KYC + payout setup is admin-approved."""

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models


PAYOUT_SETUP_DETAIL = {
    "code": "PAYOUT_SETUP_REQUIRED",
    "message": (
        "This creator is not yet approved to receive payments. "
        "They must complete ID verification and payout setup."
    ),
}


def subscriber_count_for_creator(db: Session, creator_id: str) -> int:
    return (
        db.query(func.count(models.Subscription.id))
        .filter(
            models.Subscription.creator_id == creator_id,
            models.Subscription.status == "active",
        )
        .scalar()
        or 0
    )


def follower_count_for_creator(db: Session, creator_id: str) -> int:
    """Free follows (CreatorFollow), distinct from paid subscriptions."""
    return (
        db.query(func.count(models.CreatorFollow.id))
        .filter(models.CreatorFollow.creator_id == creator_id)
        .scalar()
        or 0
    )


def creator_tip_subscribe_embed(
    db: Session, u: models.User, prof: models.CreatorProfile | None
) -> dict:
    """subscription_price None when not monetized (UI hides tip/subscribe)."""
    if not u:
        return {}
    me = bool(prof and prof.monetization_eligible)
    if me and prof:
        sp = float(prof.subscription_price or 0) or 4.99
    else:
        sp = None
    return {
        "id": u.id,
        "handle": u.handle,
        "display_name": u.display_name,
        "verified": prof.verified if prof else False,
        "accent_color": u.accent_color,
        "avatar_url": u.avatar_url or "",
        "subscriber_count": int(subscriber_count_for_creator(db, u.id)),
        "follower_count": int(follower_count_for_creator(db, u.id)),
        "subscription_price": sp,
        "monetization_eligible": me,
    }


def assert_creator_can_receive_payments(creator: models.User, db: Session) -> None:
    if creator.account_type != "creator":
        raise HTTPException(404, "Creator not found")
    prof = creator.creator_profile
    if not prof or not prof.monetization_eligible:
        raise HTTPException(403, detail=PAYOUT_SETUP_DETAIL)
