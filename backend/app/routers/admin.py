import logging
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models
from app.deps import require_admin
from app.mux_client import mux_delete_live_stream
from app.routers.videos import _cascade_delete_video_rows
from app.security import hash_password
from app.homepage_sections import (
    HOMEPAGE_SECTION_KEYS,
    merged_homepage_sections,
    update_homepage_sections,
)

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


def _delete_pile_comments_authored_by_user(db: Session, user_id: str) -> None:
    """Remove pile comments by this user; leaf-first so threads unwind safely."""
    while True:
        mine = (
            db.query(models.PileComment.id)
            .filter(models.PileComment.user_id == user_id)
            .all()
        )
        ids = [row[0] for row in mine]
        if not ids:
            break
        leaf_id = None
        for cid in ids:
            child_count = (
                db.query(models.PileComment)
                .filter(models.PileComment.parent_id == cid)
                .count()
            )
            if child_count == 0:
                leaf_id = cid
                break
        if leaf_id is None:
            leaf_id = ids[0]
        db.query(models.PileComment).filter(models.PileComment.id == leaf_id).delete(
            synchronize_session=False
        )
        db.flush()


def _purge_user_account(db: Session, user_id: str) -> None:
    """Delete dependent rows then the user. Caller enforces policy (self, admin, etc.)."""
    db.query(models.CreatorProfile).filter(
        models.CreatorProfile.claimed_by_user_id == user_id
    ).update({"claimed_by_user_id": None}, synchronize_session=False)

    videos = (
        db.query(models.Video).filter(models.Video.creator_id == user_id).all()
    )
    for v in videos:
        if v.mux_live_stream_id:
            try:
                mux_delete_live_stream(v.mux_live_stream_id)
            except Exception:
                logger.warning(
                    "Could not delete Mux live stream %s; continuing user delete",
                    v.mux_live_stream_id,
                    exc_info=True,
                )
        _cascade_delete_video_rows(db, v.id)
        db.delete(v)
    db.flush()

    db.query(models.StoreProduct).filter(
        models.StoreProduct.creator_id == user_id
    ).delete(synchronize_session=False)

    prof = db.get(models.CreatorProfile, user_id)
    if prof:
        db.delete(prof)
        db.flush()

    db.query(models.CreatorApplication).filter(
        models.CreatorApplication.user_id == user_id
    ).delete(synchronize_session=False)

    db.query(models.Subscription).filter(
        (models.Subscription.subscriber_id == user_id)
        | (models.Subscription.creator_id == user_id)
    ).delete(synchronize_session=False)

    db.query(models.Tip).filter(
        (models.Tip.sender_id == user_id) | (models.Tip.creator_id == user_id)
    ).delete(synchronize_session=False)

    _delete_pile_comments_authored_by_user(db, user_id)

    db.query(models.LiveChatMessage).filter(
        models.LiveChatMessage.user_id == user_id
    ).delete(synchronize_session=False)

    db.query(models.VideoReaction).filter(
        models.VideoReaction.user_id == user_id
    ).delete(synchronize_session=False)

    db.query(models.Watchlist).filter(
        models.Watchlist.user_id == user_id
    ).delete(synchronize_session=False)

    db.query(models.CreatorFollow).filter(
        (models.CreatorFollow.follower_id == user_id)
        | (models.CreatorFollow.creator_id == user_id)
    ).delete(synchronize_session=False)

    db.query(models.ContentReport).filter(
        models.ContentReport.reporter_id == user_id
    ).delete(synchronize_session=False)
    db.query(models.ContentReport).filter(
        models.ContentReport.reviewed_by == user_id
    ).update({"reviewed_by": None}, synchronize_session=False)

    db.query(models.CreatorAccountDeletionLog).filter(
        (models.CreatorAccountDeletionLog.user_id == user_id)
        | (models.CreatorAccountDeletionLog.deleted_by == user_id)
        | (models.CreatorAccountDeletionLog.restored_by == user_id)
    ).delete(synchronize_session=False)

    u = db.get(models.User, user_id)
    if u:
        db.delete(u)


class HomepageSectionsBody(BaseModel):
    sections: dict[str, bool]

    @field_validator("sections")
    @classmethod
    def keys_must_be_known(cls, v: dict[str, bool]) -> dict[str, bool]:
        for k in v:
            if k not in HOMEPAGE_SECTION_KEYS:
                raise ValueError(f"Unknown section: {k}")
        return v


@router.get("/site/homepage-sections")
def admin_get_homepage_sections(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    return {"sections": merged_homepage_sections(db)}


@router.put("/site/homepage-sections")
def admin_put_homepage_sections(
    body: HomepageSectionsBody,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    return {"sections": update_homepage_sections(db, body.sections)}


def _upload_base() -> Path:
    p = Path(settings.upload_dir)
    return p.resolve() if p.is_absolute() else (Path.cwd() / p).resolve()


def _safe_kyc_path(rel: str) -> Path:
    base = _upload_base().resolve()
    if ".." in rel or rel.startswith(("/", "\\")):
        raise HTTPException(400, "Invalid path")
    dest = (base / rel).resolve()
    try:
        dest.relative_to(base)
    except ValueError as e:
        raise HTTPException(400, "Invalid path") from e
    return dest


@router.get("/applications")
def list_applications(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.CreatorApplication)
        .filter(models.CreatorApplication.status == "pending")
        .all()
    )
    out = []
    for a in rows:
        u = db.get(models.User, a.user_id)
        out.append(
            {
                "id": a.id,
                "user_id": a.user_id,
                "email": u.email if u else "",
                "display_name": u.display_name if u else "",
                "message": a.message,
                "social_links": a.social_links,
                "channels": a.channels_json if a.channels_json else [],
                "mission_text": a.mission_text,
                "content_plan_text": a.content_plan_text,
                "primary_category": a.primary_category,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else "",
            }
        )
    return out


@router.post("/applications/{app_id}/approve")
def approve(
    app_id: str,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    a = db.get(models.CreatorApplication, app_id)
    if not a or a.status != "pending":
        raise HTTPException(404, "Not found")
    user = db.get(models.User, a.user_id)
    if not user:
        raise HTTPException(400, "Bad application")
    user.account_type = "creator"
    has_prof = (
        db.query(models.CreatorProfile)
        .filter(models.CreatorProfile.user_id == user.id)
        .first()
    )
    if not has_prof:
        db.add(
            models.CreatorProfile(
                user_id=user.id,
                verified=False,
                category="General",
                subscription_price=None,
                monetization_eligible=False,
                payout_status="not_started",
            )
        )
    a.status = "approved"
    a.reviewed_by = admin.id
    a.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


@router.post("/applications/{app_id}/decline")
def decline(
    app_id: str,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    a = db.get(models.CreatorApplication, app_id)
    if not a or a.status != "pending":
        raise HTTPException(404, "Not found")
    a.status = "declined"
    a.reviewed_by = admin.id
    a.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


class MonetizationRejectBody(BaseModel):
    reason: str = Field(..., min_length=3, max_length=2000)


@router.get("/monetization/pending")
def monetization_pending(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.User)
        .join(models.CreatorProfile, models.CreatorProfile.user_id == models.User.id)
        .filter(
            models.User.account_type == "creator",
            models.CreatorProfile.payout_status == "submitted",
            models.CreatorProfile.monetization_eligible.is_(False),
        )
    )
    out = []
    for u in q.all():
        prof = u.creator_profile
        out.append(
            {
                "user_id": u.id,
                "email": u.email,
                "display_name": u.display_name,
                "handle": u.handle or "",
                "payout_provider": prof.payout_provider,
                "payout_account_detail": prof.payout_account_detail,
                "kyc_submitted_at": prof.kyc_submitted_at.isoformat()
                if prof.kyc_submitted_at
                else "",
                "kyc_id_document_url": prof.kyc_id_document_url,
                "kyc_selfie_url": prof.kyc_selfie_url,
            }
        )
    return out


@router.get("/monetization/{user_id}/file/{which}")
def monetization_kyc_file(
    user_id: str,
    which: Literal["id_document", "selfie"],
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    u = db.get(models.User, user_id)
    if not u or not u.creator_profile:
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    rel = (
        prof.kyc_id_document_url
        if which == "id_document"
        else prof.kyc_selfie_url
    )
    if not rel:
        raise HTTPException(404, "No file")
    path = _safe_kyc_path(rel)
    if not path.is_file():
        raise HTTPException(404, "Missing file on disk")
    media_type, _ = mimetypes.guess_type(path.name)
    if not media_type or not media_type.startswith("image/"):
        media_type = "image/jpeg"
    return FileResponse(
        path,
        media_type=media_type,
        filename=path.name,
        content_disposition_type="inline",
    )


@router.post("/monetization/{user_id}/approve")
def monetization_approve(
    user_id: str,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    u = db.get(models.User, user_id)
    if not u or u.account_type != "creator" or not u.creator_profile:
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    if prof.payout_status != "submitted":
        raise HTTPException(400, "Not pending review")
    prof.monetization_eligible = True
    prof.payout_status = "approved"
    prof.kyc_reviewed_at = datetime.now(timezone.utc)
    prof.kyc_reviewed_by = admin.id
    prof.monetization_reject_reason = None
    db.commit()
    return {"ok": True}


@router.post("/monetization/{user_id}/reject")
def monetization_reject(
    user_id: str,
    body: MonetizationRejectBody,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    u = db.get(models.User, user_id)
    if not u or u.account_type != "creator" or not u.creator_profile:
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    if prof.payout_status != "submitted":
        raise HTTPException(400, "Not pending review")
    prof.payout_status = "rejected"
    prof.monetization_reject_reason = body.reason
    prof.kyc_reviewed_at = datetime.now(timezone.utc)
    prof.kyc_reviewed_by = admin.id
    prof.monetization_eligible = False
    db.commit()
    return {"ok": True}


@router.get("/users")
def all_users(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    rows = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name,
            "account_type": u.account_type,
            "created_at": u.created_at.isoformat() if u.created_at else "",
        }
        for u in rows
    ]


@router.get("/stats")
def stats(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    total_tips = (
        db.query(func.coalesce(func.sum(models.Tip.amount), 0)).scalar()
    )
    total_views = (
        db.query(func.coalesce(func.sum(models.Video.view_count), 0)).scalar()
    )
    return {
        "total_users": db.query(models.User).count(),
        "total_creators": db.query(models.User)
        .filter(models.User.account_type == "creator")
        .count(),
        "total_tips": float(total_tips),
        "total_views": int(total_views),
    }


@router.get("/creators")
def list_creators_admin(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """All creator accounts with email (admin-only)."""
    video_counts = (
        db.query(
            models.Video.creator_id,
            func.count(models.Video.id).label("cnt"),
        )
        .filter(models.Video.status == "published")
        .group_by(models.Video.creator_id)
        .subquery()
    )
    sub_counts = (
        db.query(
            models.Subscription.creator_id,
            func.count(models.Subscription.id).label("cnt"),
        )
        .filter(models.Subscription.status == "active")
        .group_by(models.Subscription.creator_id)
        .subquery()
    )
    q = (
        db.query(
            models.User,
            models.CreatorProfile,
            func.coalesce(video_counts.c.cnt, 0).label("video_count"),
            func.coalesce(sub_counts.c.cnt, 0).label("subscriber_count"),
        )
        .join(models.CreatorProfile, models.CreatorProfile.user_id == models.User.id)
        .outerjoin(video_counts, video_counts.c.creator_id == models.User.id)
        .outerjoin(sub_counts, sub_counts.c.creator_id == models.User.id)
        .filter(models.User.account_type.in_(("creator", "admin")))
    )
    return [
        {
            "id": u.id,
            "email": u.email,
            "handle": u.handle or "",
            "display_name": u.display_name,
            "verified": prof.verified if prof else False,
            "category": (prof.category or "") if prof else "",
            "video_count": int(video_count),
            "subscriber_count": int(subscriber_count),
            "monetization_eligible": prof.monetization_eligible if prof else False,
            "payout_status": prof.payout_status if prof else "",
        }
        for u, prof, video_count, subscriber_count in q.all()
    ]


class CreatorVerifiedBody(BaseModel):
    verified: bool


class UserPasswordResetBody(BaseModel):
    password: str = Field(..., min_length=8, max_length=128)


class AdminDeleteUserBody(BaseModel):
    """Must match the target user's email (case-insensitive) to confirm permanent deletion."""

    confirm_email: str = Field(..., min_length=3, max_length=255)


class CreatorDeleteBody(BaseModel):
    reason: str | None = Field(None, max_length=2000)


def _serialize_dt(v):
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def _snapshot_creator_profile(prof: models.CreatorProfile) -> dict:
    return {
        "verified": bool(prof.verified),
        "category": prof.category,
        "subscription_price": float(prof.subscription_price)
        if prof.subscription_price is not None
        else None,
        "banner_color": prof.banner_color,
        "hero_image_url": prof.hero_image_url,
        "total_tips_received": float(prof.total_tips_received or 0),
        "social_links": prof.social_links,
        "monetization_eligible": bool(prof.monetization_eligible),
        "payout_status": prof.payout_status,
        "kyc_id_document_url": prof.kyc_id_document_url,
        "kyc_selfie_url": prof.kyc_selfie_url,
        "payout_provider": prof.payout_provider,
        "payout_account_detail": prof.payout_account_detail,
        "kyc_submitted_at": _serialize_dt(prof.kyc_submitted_at),
        "kyc_reviewed_at": _serialize_dt(prof.kyc_reviewed_at),
        "kyc_reviewed_by": prof.kyc_reviewed_by,
        "monetization_reject_reason": prof.monetization_reject_reason,
        "claim_status": prof.claim_status,
        "claim_pending_email": prof.claim_pending_email,
        "claim_email_token_hash": prof.claim_email_token_hash,
        "claim_email_token_expires_at": _serialize_dt(prof.claim_email_token_expires_at),
        "verification_social_url": prof.verification_social_url,
        "verification_social_method": prof.verification_social_method,
        "verification_social_code": prof.verification_social_code,
        "verification_social_code_expires_at": _serialize_dt(prof.verification_social_code_expires_at),
        "verification_social_verified_at": _serialize_dt(prof.verification_social_verified_at),
        "verification_social_ig_user_id": prof.verification_social_ig_user_id,
        "verification_email_verified_at": _serialize_dt(prof.verification_email_verified_at),
        "verification_attempt_count_email": int(prof.verification_attempt_count_email or 0),
        "verification_attempt_count_social": int(prof.verification_attempt_count_social or 0),
        "verification_social_last_attempt_at": _serialize_dt(prof.verification_social_last_attempt_at),
        "verification_email_last_attempt_at": _serialize_dt(prof.verification_email_last_attempt_at),
        "claim_initiated_at": _serialize_dt(prof.claim_initiated_at),
        "claimed_by_user_id": prof.claimed_by_user_id,
    }


def _parse_dt(v):
    if not v:
        return None
    if isinstance(v, str):
        try:
            return datetime.fromisoformat(v)
        except ValueError:
            return None
    return None


@router.post("/creators/{user_id}/verified")
def set_creator_verified(
    user_id: str,
    body: CreatorVerifiedBody,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    u = db.get(models.User, user_id)
    if not u or u.account_type not in ("creator", "admin"):
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")
    prof.verified = body.verified
    db.commit()
    return {"ok": True, "verified": prof.verified}


@router.post("/users/{user_id}/password")
def admin_reset_user_password(
    user_id: str,
    body: UserPasswordResetBody,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(404, "Not found")
    if u.id == admin.id:
        raise HTTPException(400, "Use profile flow to change your own password")
    u.password_hash = hash_password(body.password)
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: str,
    body: AdminDeleteUserBody,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Permanently delete a user and related rows (videos, tips, follows, etc.).
    Admin accounts cannot be removed via this endpoint.
    """
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own account")
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(404, "Not found")
    if u.account_type == "admin":
        raise HTTPException(400, "Cannot delete admin accounts")
    if (body.confirm_email or "").strip().lower() != (u.email or "").strip().lower():
        raise HTTPException(400, "Email confirmation does not match this user")
    _purge_user_account(db, user_id)
    db.commit()
    return {"ok": True}


@router.delete("/creators/{user_id}")
def delete_creator_account(
    user_id: str,
    body: CreatorDeleteBody,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """
    Reversible creator deactivation. Preserves user, logs snapshot for restore.
    """
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")

    videos = (
        db.query(models.Video)
        .filter(models.Video.creator_id == u.id)
        .all()
    )
    active_subs = (
        db.query(models.Subscription)
        .filter(
            models.Subscription.creator_id == u.id,
            models.Subscription.status == "active",
        )
        .all()
    )
    snapshot = {
        "profile": _snapshot_creator_profile(prof),
        "video_statuses": [{"id": v.id, "status": v.status} for v in videos],
        "active_subscription_ids": [s.id for s in active_subs],
    }
    db.add(
        models.CreatorAccountDeletionLog(
            user_id=u.id,
            deleted_by=admin.id,
            reason=(body.reason or "").strip() or None,
            snapshot_json=snapshot,
        )
    )

    # De-list channel content and stop future creator-only flows.
    for v in videos:
        v.status = "draft"
    for s in active_subs:
        s.status = "cancelled"

    db.delete(prof)
    u.account_type = "viewer"
    db.commit()
    return {"ok": True}


@router.get("/creators/deleted")
def list_deleted_creators(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    logs = (
        db.query(models.CreatorAccountDeletionLog)
        .filter(models.CreatorAccountDeletionLog.restored_at.is_(None))
        .order_by(models.CreatorAccountDeletionLog.deleted_at.desc())
        .all()
    )
    out = []
    for l in logs:
        u = db.get(models.User, l.user_id)
        out.append(
            {
                "log_id": l.id,
                "user_id": l.user_id,
                "display_name": u.display_name if u else "",
                "email": u.email if u else "",
                "handle": (u.handle if u else "") or "",
                "deleted_at": l.deleted_at.isoformat() if l.deleted_at else "",
                "reason": l.reason,
            }
        )
    return out


@router.post("/creators/{user_id}/restore")
def restore_creator_account(
    user_id: str,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    u = db.get(models.User, user_id)
    if not u:
        raise HTTPException(404, "Not found")
    if u.creator_profile:
        raise HTTPException(400, "Creator profile already exists")

    log = (
        db.query(models.CreatorAccountDeletionLog)
        .filter(
            models.CreatorAccountDeletionLog.user_id == user_id,
            models.CreatorAccountDeletionLog.restored_at.is_(None),
        )
        .order_by(models.CreatorAccountDeletionLog.deleted_at.desc())
        .first()
    )
    if not log:
        raise HTTPException(404, "No deleted creator record found")

    snap = log.snapshot_json or {}
    p = snap.get("profile") or {}

    db.add(
        models.CreatorProfile(
            user_id=u.id,
            verified=bool(p.get("verified", False)),
            category=p.get("category"),
            subscription_price=p.get("subscription_price"),
            banner_color=p.get("banner_color"),
            hero_image_url=p.get("hero_image_url"),
            total_tips_received=p.get("total_tips_received") or 0,
            social_links=p.get("social_links"),
            monetization_eligible=bool(p.get("monetization_eligible", False)),
            payout_status=p.get("payout_status") or "not_started",
            kyc_id_document_url=p.get("kyc_id_document_url"),
            kyc_selfie_url=p.get("kyc_selfie_url"),
            payout_provider=p.get("payout_provider"),
            payout_account_detail=p.get("payout_account_detail"),
            kyc_submitted_at=_parse_dt(p.get("kyc_submitted_at")),
            kyc_reviewed_at=_parse_dt(p.get("kyc_reviewed_at")),
            kyc_reviewed_by=p.get("kyc_reviewed_by"),
            monetization_reject_reason=p.get("monetization_reject_reason"),
            claim_status=p.get("claim_status"),
            claim_pending_email=p.get("claim_pending_email"),
            claim_email_token_hash=p.get("claim_email_token_hash"),
            claim_email_token_expires_at=_parse_dt(p.get("claim_email_token_expires_at")),
            verification_social_url=p.get("verification_social_url"),
            verification_social_method=p.get("verification_social_method"),
            verification_social_code=p.get("verification_social_code"),
            verification_social_code_expires_at=_parse_dt(
                p.get("verification_social_code_expires_at")
            ),
            verification_social_verified_at=_parse_dt(p.get("verification_social_verified_at")),
            verification_social_ig_user_id=p.get("verification_social_ig_user_id"),
            verification_email_verified_at=_parse_dt(p.get("verification_email_verified_at")),
            verification_attempt_count_email=int(p.get("verification_attempt_count_email") or 0),
            verification_attempt_count_social=int(
                p.get("verification_attempt_count_social") or 0
            ),
            verification_social_last_attempt_at=_parse_dt(
                p.get("verification_social_last_attempt_at")
            ),
            verification_email_last_attempt_at=_parse_dt(
                p.get("verification_email_last_attempt_at")
            ),
            claim_initiated_at=_parse_dt(p.get("claim_initiated_at")),
            claimed_by_user_id=p.get("claimed_by_user_id"),
        )
    )

    for item in snap.get("video_statuses") or []:
        vid = db.get(models.Video, item.get("id"))
        if vid and vid.creator_id == user_id and item.get("status"):
            vid.status = str(item["status"])
    for sid in snap.get("active_subscription_ids") or []:
        s = db.get(models.Subscription, sid)
        if s and s.creator_id == user_id:
            s.status = "active"

    u.account_type = "creator"
    log.restored_at = datetime.now(timezone.utc)
    log.restored_by = admin.id
    db.commit()
    return {"ok": True}


def _moderation_report_row(db: Session, r: models.ContentReport) -> dict:
    rep = db.get(models.User, r.reporter_id)
    ctx: dict = {}
    if r.target_type == "video":
        v = db.get(models.Video, r.target_id)
        if v:
            cu = db.get(models.User, v.creator_id)
            ctx = {
                "video_title": v.title,
                "video_status": v.status,
                "creator_handle": cu.handle if cu else None,
            }
    elif r.target_type == "pile_comment":
        c = db.get(models.PileComment, r.target_id)
        if c:
            v = db.get(models.Video, c.video_id)
            ctx = {
                "video_id": c.video_id,
                "video_title": v.title if v else None,
                "comment_type": c.comment_type,
                "comment_preview": (c.content or "")[:280] if c.content else None,
            }
    elif r.target_type == "live_chat":
        m = db.get(models.LiveChatMessage, r.target_id)
        if m:
            v = db.get(models.Video, m.video_id)
            ctx = {
                "video_id": m.video_id,
                "video_title": v.title if v else None,
                "message_preview": (m.body or "")[:280],
            }
    return {
        "id": r.id,
        "target_type": r.target_type,
        "target_id": r.target_id,
        "reason": r.reason,
        "details": r.details,
        "status": r.status,
        "created_at": r.created_at.isoformat() if r.created_at else "",
        "reporter_email": rep.email if rep else "",
        "reporter_display_name": rep.display_name if rep else "",
        "context": ctx,
    }


@router.get("/moderation/reports")
def list_moderation_reports(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
    status: str = "pending",
):
    if status not in ("pending", "all"):
        raise HTTPException(400, "status must be pending or all")
    q = db.query(models.ContentReport).order_by(models.ContentReport.created_at.asc())
    if status == "pending":
        q = q.filter(models.ContentReport.status == "pending")
    rows = q.all()
    return [_moderation_report_row(db, r) for r in rows]


@router.post("/moderation/{report_id}/dismiss")
def dismiss_moderation_report(
    report_id: str,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    r = db.get(models.ContentReport, report_id)
    if not r or r.status != "pending":
        raise HTTPException(404, "Not found")
    r.status = "dismissed"
    r.reviewed_at = datetime.now(timezone.utc)
    r.reviewed_by = admin.id
    r.resolution_action = None
    db.commit()
    return {"ok": True}


class ModerationResolveBody(BaseModel):
    action: Literal["acknowledge", "unpublish_video", "delete_pile", "delete_chat"]


@router.post("/moderation/{report_id}/resolve")
def resolve_moderation_report(
    report_id: str,
    body: ModerationResolveBody,
    admin: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    r = db.get(models.ContentReport, report_id)
    if not r or r.status != "pending":
        raise HTTPException(404, "Not found")

    action = body.action
    if r.target_type == "video" and action not in ("acknowledge", "unpublish_video"):
        raise HTTPException(400, "Invalid action for video report")
    if r.target_type == "pile_comment" and action not in ("acknowledge", "delete_pile"):
        raise HTTPException(400, "Invalid action for pile report")
    if r.target_type == "live_chat" and action not in ("acknowledge", "delete_chat"):
        raise HTTPException(400, "Invalid action for chat report")

    res_action = "none"
    if action == "unpublish_video":
        v = db.get(models.Video, r.target_id)
        if not v:
            raise HTTPException(400, "Video missing")
        v.status = "unpublished"
        res_action = "unpublish_video"
    elif action == "delete_pile":
        c = db.get(models.PileComment, r.target_id)
        if not c:
            raise HTTPException(400, "Comment missing")
        db.delete(c)
        res_action = "delete_pile"
    elif action == "delete_chat":
        m = db.get(models.LiveChatMessage, r.target_id)
        if not m:
            raise HTTPException(400, "Message missing")
        db.delete(m)
        res_action = "delete_chat"

    r.status = "resolved"
    r.reviewed_at = datetime.now(timezone.utc)
    r.reviewed_by = admin.id
    r.resolution_action = res_action
    db.commit()
    return {"ok": True, "resolution_action": r.resolution_action}


@router.post("/creators/{handle}/claim/approve-identity")
def approve_claim_identity(
    handle: str,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    u = db.query(models.User).filter(models.User.handle == handle).first()
    if not u or u.account_type != "creator":
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    if not prof or prof.claim_status != "identity_review":
        raise HTTPException(400, "Channel is not waiting on identity review")
    prof.claim_status = "email_verified"
    db.commit()
    return {"ok": True}
