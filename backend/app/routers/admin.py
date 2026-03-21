import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models
from app.deps import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


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
    return {
        "total_users": db.query(models.User).count(),
        "total_creators": db.query(models.User)
        .filter(models.User.account_type == "creator")
        .count(),
        "total_tips": float(
            sum(float(t.amount) for t in db.query(models.Tip).all()) or 0
        ),
        "total_views": sum(v.view_count for v in db.query(models.Video).all()),
    }


@router.get("/creators")
def list_creators_admin(
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    """All creator accounts with email (admin-only)."""
    q = (
        db.query(models.User)
        .join(models.CreatorProfile, models.CreatorProfile.user_id == models.User.id)
        .filter(models.User.account_type == "creator")
    )
    out = []
    for u in q.all():
        prof = u.creator_profile
        video_count = (
            db.query(func.count(models.Video.id))
            .filter(
                models.Video.creator_id == u.id,
                models.Video.status == "published",
            )
            .scalar()
            or 0
        )
        sub_count = (
            db.query(func.count(models.Subscription.id))
            .filter(
                models.Subscription.creator_id == u.id,
                models.Subscription.status == "active",
            )
            .scalar()
            or 0
        )
        out.append(
            {
                "id": u.id,
                "email": u.email,
                "handle": u.handle or "",
                "display_name": u.display_name,
                "verified": prof.verified if prof else False,
                "category": (prof.category or "") if prof else "",
                "video_count": int(video_count),
                "subscriber_count": int(sub_count),
                "monetization_eligible": prof.monetization_eligible if prof else False,
                "payout_status": prof.payout_status if prof else "",
            }
        )
    return out


class CreatorVerifiedBody(BaseModel):
    verified: bool


@router.post("/creators/{user_id}/verified")
def set_creator_verified(
    user_id: str,
    body: CreatorVerifiedBody,
    _: Annotated[models.User, Depends(require_admin)],
    db: Session = Depends(get_db),
):
    u = db.get(models.User, user_id)
    if not u or u.account_type != "creator":
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")
    prof.verified = body.verified
    db.commit()
    return {"ok": True, "verified": prof.verified}


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
