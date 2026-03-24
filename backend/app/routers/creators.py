from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models
from app.deps import get_current_user
from app.monetization import subscriber_count_for_creator
from app.profile_media import delete_stored_media, save_profile_image

router = APIRouter(prefix="/creators", tags=["creators"])

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
PAYOUT_PROVIDERS = frozenset({"cash_n_go", "sun_cash", "other"})


def _upload_base() -> Path:
    p = Path(settings.upload_dir)
    return p.resolve() if p.is_absolute() else (Path.cwd() / p).resolve()


def _rel_upload_path(user_id: str, filename: str) -> str:
    return f"kyc/{user_id}/{filename}"


class ChannelRow(BaseModel):
    label: str = Field(..., min_length=1, max_length=64)
    url: str = Field(..., min_length=4, max_length=500)

    @field_validator("label")
    @classmethod
    def strip_label(cls, v: str) -> str:
        return v.strip()

    @field_validator("url")
    @classmethod
    def normalize_url(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("URL is required")
        if t.startswith("http://") or t.startswith("https://"):
            return t
        # instagram.com/user, www.tiktok.com/@x → https://…
        if ".." in t or " " in t:
            raise ValueError("URL must be a valid link (or include https://)")
        return f"https://{t.lstrip('/')}"


class ApplyBody(BaseModel):
    channels: list[ChannelRow] = Field(..., min_length=1)
    mission_text: str = Field(..., min_length=30, max_length=8000)
    content_plan_text: str = Field(..., min_length=15, max_length=8000)
    primary_category: str | None = Field(None, max_length=64)

    @field_validator("mission_text", "content_plan_text")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()

    @field_validator("primary_category", mode="before")
    @classmethod
    def empty_category_none(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        return v.strip() if isinstance(v, str) else v


def _channels_summary(channels: list[ChannelRow]) -> str:
    return "\n".join(f"{c.label}: {c.url}" for c in channels)


def _application_to_out(a: models.CreatorApplication) -> dict:
    return {
        "id": a.id,
        "status": a.status,
        "submitted_at": a.submitted_at.isoformat() if a.submitted_at else "",
        "channels": a.channels_json if a.channels_json else [],
        "mission_text": a.mission_text,
        "content_plan_text": a.content_plan_text,
        "primary_category": a.primary_category,
        "social_links": a.social_links,
        "message": a.message,
    }


def _creator_public_fields(prof: models.CreatorProfile | None) -> dict:
    if not prof:
        return {
            "monetization_eligible": False,
            "subscription_price": None,
        }
    me = bool(prof.monetization_eligible)
    return {
        "monetization_eligible": me,
        "subscription_price": float(prof.subscription_price or 0)
        if prof.subscription_price and me
        else None,
    }


@router.get("")
def list_creators(db: Session = Depends(get_db)):
    q = (
        db.query(models.User)
        .join(models.CreatorProfile, models.CreatorProfile.user_id == models.User.id)
        .filter(models.User.account_type.in_(("creator", "admin")))
        .order_by(desc(models.User.created_at))
    )
    out = []
    for u in q.all():
        prof = u.creator_profile
        sub_count = (
            db.query(func.count(models.Subscription.id))
            .filter(
                models.Subscription.creator_id == u.id,
                models.Subscription.status == "active",
            )
            .scalar()
            or 0
        )
        pub = _creator_public_fields(prof)
        out.append(
            {
                "id": u.id,
                "handle": u.handle,
                "display_name": u.display_name,
                "category": prof.category if prof else None,
                "subscriber_count": int(sub_count),
                "verified": prof.verified if prof else False,
                "accent_color": u.accent_color,
                "avatar_url": u.avatar_url or "",
                "banner_color": prof.banner_color if prof else u.accent_color,
                "hero_image_url": prof.hero_image_url if prof else None,
                "bio": u.bio,
                "subscription_price": pub["subscription_price"],
                "monetization_eligible": pub["monetization_eligible"],
                "video_count": db.query(models.Video)
                .filter(
                    models.Video.creator_id == u.id,
                    models.Video.status == "published",
                )
                .count(),
                "total_tips_received": float(prof.total_tips_received or 0)
                if prof
                else 0,
                "member_since": u.created_at.isoformat() if u.created_at else "",
                "social_links": prof.social_links if prof else {},
                "claim_status": (prof.claim_status or "live") if prof else "live",
            }
        )
    return out


@router.get("/apply/me")
def get_my_application(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = (
        db.query(models.CreatorApplication)
        .filter(models.CreatorApplication.user_id == user.id)
        .order_by(models.CreatorApplication.submitted_at.desc())
        .first()
    )
    if not a:
        return None
    return _application_to_out(a)


@router.post("/apply")
def apply_creator(
    body: ApplyBody,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.account_type == "creator":
        raise HTTPException(400, "Already a creator")
    existing = (
        db.query(models.CreatorApplication)
        .filter(
            models.CreatorApplication.user_id == user.id,
            models.CreatorApplication.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(400, "Application pending")
    summary = _channels_summary(body.channels)
    legacy_message = f"{body.mission_text}\n\n--- Content plan ---\n{body.content_plan_text}"
    a = models.CreatorApplication(
        user_id=user.id,
        social_links=summary,
        message=legacy_message,
        channels_json=[c.model_dump() for c in body.channels],
        mission_text=body.mission_text,
        content_plan_text=body.content_plan_text,
        primary_category=body.primary_category,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id, "status": a.status}


@router.get("/monetization/status")
def monetization_status(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.account_type not in ("creator", "admin"):
        raise HTTPException(403, "Creators only")
    prof = user.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")
    return {
        "payout_status": prof.payout_status,
        "monetization_eligible": prof.monetization_eligible,
        "payout_provider": prof.payout_provider,
        "payout_account_detail": prof.payout_account_detail,
        "kyc_submitted_at": prof.kyc_submitted_at.isoformat()
        if prof.kyc_submitted_at
        else None,
        "monetization_reject_reason": prof.monetization_reject_reason,
    }


@router.post("/monetization/submit")
async def monetization_submit(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    id_document: UploadFile = File(...),
    selfie: UploadFile = File(...),
    payout_provider: str = Form(...),
    payout_account_detail: str = Form(...),
):
    if user.account_type not in ("creator", "admin"):
        raise HTTPException(403, "Creators only")
    prof = user.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")
    if prof.monetization_eligible:
        raise HTTPException(400, "Already approved for payouts")
    if prof.payout_status == "submitted":
        raise HTTPException(400, "Already pending review")

    pv = payout_provider.strip().lower().replace(" ", "_").replace("-", "_")
    if pv == "cashngo":
        pv = "cash_n_go"
    if pv not in PAYOUT_PROVIDERS:
        raise HTTPException(
            400, "Invalid payout_provider (use cash_n_go, sun_cash, other)"
        )
    detail = payout_account_detail.strip()
    if len(detail) < 4:
        raise HTTPException(400, "Payout account detail is too short")

    def ext_for(up: UploadFile) -> str:
        raw = (up.filename or "").rsplit(".", 1)
        suf = f".{raw[-1].lower()}" if len(raw) > 1 else ".jpg"
        if suf not in ALLOWED_IMAGE_EXT:
            suf = ".jpg"
        return suf

    ct = (id_document.content_type or "").lower()
    if not ct.startswith("image/"):
        raise HTTPException(400, "ID document must be an image")
    ct2 = (selfie.content_type or "").lower()
    if not ct2.startswith("image/"):
        raise HTTPException(400, "Selfie must be an image")

    base = _upload_base()
    base.mkdir(parents=True, exist_ok=True)
    kid = base / "kyc" / user.id
    if kid.exists():
        shutil.rmtree(kid)
    kid.mkdir(parents=True, exist_ok=True)

    id_ext = ext_for(id_document)
    self_ext = ext_for(selfie)
    id_name = f"id_document{id_ext}"
    self_name = f"selfie{self_ext}"
    id_path = kid / id_name
    self_path = kid / self_name

    with id_path.open("wb") as f:
        shutil.copyfileobj(id_document.file, f)
    with self_path.open("wb") as f:
        shutil.copyfileobj(selfie.file, f)

    prof.kyc_id_document_url = _rel_upload_path(user.id, id_name)
    prof.kyc_selfie_url = _rel_upload_path(user.id, self_name)
    prof.payout_provider = pv
    prof.payout_account_detail = detail
    prof.payout_status = "submitted"
    prof.kyc_submitted_at = datetime.now(timezone.utc)
    prof.monetization_reject_reason = None
    db.commit()
    return {"ok": True, "payout_status": prof.payout_status}


class CreatorMeUpdate(BaseModel):
    hero_image_url: str | None = Field(None, max_length=1024)

    @field_validator("hero_image_url", mode="before")
    @classmethod
    def empty_hero_none(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        return v.strip() if isinstance(v, str) else v


@router.post("/me/hero-image")
async def upload_my_hero_image(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
):
    if user.account_type not in ("creator", "admin"):
        raise HTTPException(403, "Creators only")
    prof = user.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")
    old = prof.hero_image_url
    rel = save_profile_image(user.id, file, "hero")
    if old and old.startswith("media/") and old != rel:
        delete_stored_media(old)
    prof.hero_image_url = rel
    db.commit()
    db.refresh(prof)
    return {"hero_image_url": prof.hero_image_url}


@router.put("/me")
def update_creator_me(
    body: CreatorMeUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.account_type not in ("creator", "admin"):
        raise HTTPException(403, "Creators only")
    prof = user.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")
    patch = body.model_dump(exclude_unset=True)
    if "hero_image_url" in patch:
        old = prof.hero_image_url
        new = patch["hero_image_url"]
        if old and old.startswith("media/") and new != old:
            delete_stored_media(old)
        prof.hero_image_url = new
    db.commit()
    db.refresh(prof)
    return {"hero_image_url": prof.hero_image_url}


@router.get("/{handle}")
def creator_detail(handle: str, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.handle == handle).first()
    if not u or u.account_type not in ("creator", "admin"):
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    pub = _creator_public_fields(prof)
    if pub["monetization_eligible"] and prof:
        sp = float(prof.subscription_price or 0) or 4.99
    else:
        sp = None
    sub_n = int(subscriber_count_for_creator(db, u.id))
    return {
        "id": u.id,
        "handle": u.handle,
        "display_name": u.display_name,
        "category": prof.category if prof else None,
        "verified": prof.verified if prof else False,
        "accent_color": u.accent_color,
        "avatar_url": u.avatar_url or "",
        "banner_color": prof.banner_color if prof else u.accent_color,
        "hero_image_url": prof.hero_image_url if prof else None,
        "bio": u.bio,
        "subscription_price": sp,
        "monetization_eligible": pub["monetization_eligible"],
        "subscriber_count": sub_n,
        "video_count": db.query(models.Video)
        .filter(
            models.Video.creator_id == u.id,
            models.Video.status == "published",
        )
        .count(),
        "total_tips_received": float(prof.total_tips_received or 0) if prof else 0,
        "member_since": u.created_at.isoformat() if u.created_at else "",
        "social_links": prof.social_links if prof else {},
        "claim_status": (prof.claim_status or "live") if prof else "live",
    }


@router.get("/{handle}/videos")
def creator_videos(handle: str, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.handle == handle).first()
    if not u:
        raise HTTPException(404, "Not found")
    rows = (
        db.query(models.Video)
        .filter(
            models.Video.creator_id == u.id, models.Video.status == "published"
        )
        .all()
    )
    prof = u.creator_profile
    pub = _creator_public_fields(prof)
    sub_price = pub["subscription_price"]
    if sub_price is None and prof and pub["monetization_eligible"]:
        sub_price = float(prof.subscription_price or 0) or 4.99
    sub_n = int(subscriber_count_for_creator(db, u.id))
    out = []
    for v in rows:
        out.append(
            {
                "id": v.id,
                "title": v.title,
                "description": v.description,
                "thumbnail_url": v.thumbnail_url,
                "playback_id": v.playback_id,
                "duration_seconds": v.duration_seconds or 0,
                "category": v.category or "",
                "is_locked": v.is_locked,
                "view_count": v.view_count,
                "tip_total": float(v.tip_total),
                "creator": {
                    "id": u.id,
                    "handle": u.handle,
                    "display_name": u.display_name,
                    "verified": prof.verified if prof else False,
                    "accent_color": u.accent_color,
                    "avatar_url": u.avatar_url or "",
                    "subscriber_count": sub_n,
                    "subscription_price": sub_price,
                    "monetization_eligible": pub["monetization_eligible"],
                },
                "created_at": v.created_at.isoformat() if v.created_at else "",
            }
        )
    return out
