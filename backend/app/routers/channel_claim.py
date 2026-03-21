from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.claim_utils import (
    bump_email_attempt,
    bump_social_attempt,
    generate_pile_code,
    hash_email_token,
    instagram_url_matches_channel,
)
from app.config import settings
from app.database import get_db
from app import models
from app.security import (
    create_access_token,
    create_claim_channel_token,
    create_refresh_token,
    decode_claim_channel_token,
    hash_password,
)
from app.deps import security

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/creators", tags=["channel-claim"])

CLAIM_SOCIAL_MAX_PER_HOUR = 5
CLAIM_EMAIL_MAX_PER_HOUR = 5
EMAIL_TOKEN_HOURS = 24
CODE_EXPIRE_MINUTES = 15


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_claim_channel(
    handle: str,
    cred: HTTPAuthorizationCredentials | None,
    db: Session,
) -> tuple[models.User, models.CreatorProfile, str]:
    if not cred:
        raise HTTPException(401, "Claim session required")
    try:
        payload = decode_claim_channel_token(cred.credentials)
    except JWTError:
        raise HTTPException(401, "Invalid claim session")
    if payload.get("handle") != handle:
        raise HTTPException(403, "Claim session does not match this channel")
    uid = payload.get("sub")
    if not uid or not isinstance(uid, str):
        raise HTTPException(401, "Invalid claim session")
    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(401, "User not found")
    prof = user.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")
    mail = payload.get("claim_email")
    if not mail or not isinstance(mail, str):
        raise HTTPException(401, "Invalid claim session")
    return user, prof, mail


class ClaimStartBody(BaseModel):
    email: EmailStr


class ClaimSocialBody(BaseModel):
    instagram_url: str | None = Field(None, max_length=1024)


class ClaimCompleteBody(BaseModel):
    password: str = Field(..., min_length=8, max_length=128)
    video_title: str = Field(..., min_length=2, max_length=512)
    video_url: str = Field(..., min_length=8, max_length=1024)
    thumbnail_url: str | None = Field(None, max_length=1024)
    category: str | None = Field(None, max_length=64)


def _stub_for_claim_start(db: Session, handle: str) -> tuple[models.User, models.CreatorProfile]:
    """Allow magic-link (re)send while unclaimed or waiting on Instagram."""
    u = db.query(models.User).filter(models.User.handle == handle).first()
    if not u or u.account_type != "creator":
        raise HTTPException(404, "Channel not found")
    prof = u.creator_profile
    if not prof:
        raise HTTPException(400, "No creator profile")
    st = prof.claim_status or "live"
    if st not in ("unclaimed", "email_verified"):
        raise HTTPException(400, "This page is not available to claim")
    return u, prof


@router.post("/{handle}/claim/start")
def claim_start(
    handle: str,
    body: ClaimStartBody,
    db: Session = Depends(get_db),
):
    u, prof = _stub_for_claim_start(db, handle)
    email_norm = body.email.strip().lower()
    other = db.query(models.User).filter(models.User.email == email_norm).first()
    if other and other.id != u.id:
        raise HTTPException(
            409,
            "That email already has a PileIt account. Log in with it or use a different email.",
        )

    now = datetime.now(timezone.utc)
    bump_email_attempt(db, prof)
    db.refresh(prof)
    if (prof.verification_attempt_count_email or 0) > CLAIM_EMAIL_MAX_PER_HOUR:
        raise HTTPException(429, "Too many attempts. Try again in about an hour.")

    raw_token = secrets.token_urlsafe(32)
    prof.claim_pending_email = email_norm
    prof.claim_email_token_hash = hash_email_token(raw_token)
    prof.claim_email_token_expires_at = now + timedelta(hours=EMAIL_TOKEN_HOURS)
    if prof.claim_initiated_at is None:
        prof.claim_initiated_at = now
    db.commit()

    verify_url = f"{settings.api_public_url.rstrip('/')}/creators/claim/email/{raw_token}"
    logger.info(
        "CLAIM_EMAIL handle=%s to=%s verify_url=%s",
        handle,
        email_norm,
        verify_url,
    )
    return {
        "ok": True,
        "detail": "Check your inbox for the verification link.",
        "_dev_verify_url": verify_url,
    }


@router.get("/claim/email/{raw_token}")
def claim_verify_email(raw_token: str, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    h = hash_email_token(raw_token)
    prof = (
        db.query(models.CreatorProfile)
        .filter(
            models.CreatorProfile.claim_email_token_hash == h,
            models.CreatorProfile.claim_email_token_expires_at > now,
        )
        .first()
    )
    if not prof:
        raise HTTPException(400, "Invalid or expired link")
    u = db.get(models.User, prof.user_id)
    if not u or not u.handle:
        raise HTTPException(400, "Invalid link")
    if (prof.claim_status or "") not in ("unclaimed", "email_verified"):
        raise HTTPException(400, "This link is no longer valid")

    pending = (prof.claim_pending_email or "").strip().lower()
    if not pending:
        raise HTTPException(400, "Invalid link")

    prof.verification_email_verified_at = now
    prof.claim_status = "email_verified"
    prof.claim_email_token_hash = None
    prof.claim_email_token_expires_at = None
    db.commit()

    claim_jwt = create_claim_channel_token(u.id, u.handle, pending)
    dest = f"{settings.public_web_url.rstrip('/')}/creator/{u.handle}?claim_token={claim_jwt}"
    return RedirectResponse(url=dest, status_code=302)


@router.post("/{handle}/claim/social")
def claim_social(
    handle: str,
    body: ClaimSocialBody,
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Session = Depends(get_db),
):
    u, prof, verified_email = _parse_claim_channel(handle, cred, db)
    if u.handle != handle:
        raise HTTPException(403, "Mismatch")
    if (prof.claim_status or "") != "email_verified":
        if prof.claim_status == "identity_review":
            raise HTTPException(
                400,
                "Your Instagram profile is being verified. You will receive an email within 24 hours.",
            )
        raise HTTPException(400, "Complete email verification first")

    bump_social_attempt(db, prof)
    db.refresh(prof)
    if (prof.verification_attempt_count_social or 0) > CLAIM_SOCIAL_MAX_PER_HOUR:
        raise HTTPException(429, "Too many code requests. Try again in about an hour.")

    ig_url = (body.instagram_url or "").strip() or None
    if not instagram_url_matches_channel(ig_url, handle):
        prof.claim_status = "identity_review"
        prof.verification_social_url = ig_url
        prof.verification_social_method = "instagram"
        prof.verification_social_code = None
        prof.verification_social_code_expires_at = None
        db.commit()
        return {
            "needs_review": True,
            "message": "We could not match that Instagram URL to this channel. Our team will verify within 24 hours.",
        }

    code = generate_pile_code()
    while (
        db.query(models.CreatorProfile)
        .filter(models.CreatorProfile.verification_social_code == code)
        .first()
    ):
        code = generate_pile_code()

    prof.verification_social_code = code
    prof.verification_social_code_expires_at = _now_utc() + timedelta(
        minutes=CODE_EXPIRE_MINUTES
    )
    prof.verification_social_method = "instagram"
    prof.verification_social_url = ig_url
    db.commit()
    return {
        "code": code,
        "expires_in_seconds": CODE_EXPIRE_MINUTES * 60,
        "instagram_username": settings.pileit_instagram_username,
    }


@router.get("/{handle}/claim/status")
def claim_status(
    handle: str,
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Session = Depends(get_db),
):
    _, prof, _ = _parse_claim_channel(handle, cred, db)
    return {
        "claim_status": prof.claim_status,
        "verification_social_verified_at": prof.verification_social_verified_at.isoformat()
        if prof.verification_social_verified_at
        else None,
    }


@router.post("/{handle}/claim/complete")
def claim_complete(
    handle: str,
    body: ClaimCompleteBody,
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Session = Depends(get_db),
):
    u, prof, _verified_email = _parse_claim_channel(handle, cred, db)
    if (prof.claim_status or "") != "social_verified":
        raise HTTPException(400, "Finish Instagram verification first")

    email_norm = (prof.claim_pending_email or "").strip().lower()
    if not email_norm:
        raise HTTPException(400, "Missing pending email")

    other = db.query(models.User).filter(models.User.email == email_norm).first()
    if other and other.id != u.id:
        raise HTTPException(
            409,
            "That email is already registered. Log in or use a different address.",
        )

    u.email = email_norm
    u.password_hash = hash_password(body.password)
    prof.claim_status = "live"
    prof.claimed_by_user_id = u.id
    prof.claim_pending_email = None
    prof.verification_social_code = None
    prof.verification_social_code_expires_at = None
    prof.verification_social_url = None

    cat = (body.category or "").strip() or prof.category or "General"
    v = models.Video(
        creator_id=u.id,
        title=body.video_title.strip(),
        description="Intro",
        video_url=body.video_url.strip(),
        thumbnail_url=(body.thumbnail_url or "").strip() or None,
        duration_seconds=60,
        category=cat,
        is_locked=False,
        status="published",
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {
        "ok": True,
        "video_id": v.id,
        "access_token": create_access_token(u.id),
        "refresh_token": create_refresh_token(u.id),
    }
