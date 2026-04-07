from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models
from app.instagram_meta import (
    iter_instagram_messaging_events,
    send_instagram_text_dm,
    verify_x_hub_signature_256,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meta", tags=["meta"])


def _meta_verify_impl(
    mode: str | None,
    token: str | None,
    challenge: str | None,
):
    vt = (settings.meta_webhook_verify_token or "").strip()
    if not vt or token != vt or mode != "subscribe":
        raise HTTPException(403, "Forbidden")
    return Response(content=challenge or "", media_type="text/plain")


@router.get("/webhook")
def meta_webhook_verify(request: Request):
    """Meta subscription verification (hub.mode, hub.verify_token, hub.challenge)."""
    q = request.query_params
    mode = q.get("hub.mode")
    token = q.get("hub.verify_token")
    challenge = q.get("hub.challenge")
    return _meta_verify_impl(mode, token, challenge)


@router.post("/webhook")
async def meta_webhook_receive(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    secret = (settings.meta_app_secret or "").strip()
    if not secret:
        logger.warning("Meta webhook rejected — meta_app_secret is not set")
        raise HTTPException(status_code=403, detail="Forbidden")
    sig = request.headers.get("X-Hub-Signature-256")
    if not verify_x_hub_signature_256(body, sig):
        logger.warning("Meta webhook signature mismatch")
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return Response(status_code=200)

    try:
        _process_instagram_dms(payload, db)
    except Exception:
        logger.exception("Meta webhook handler error")

    return Response(status_code=200)


def _process_instagram_dms(payload: dict, db: Session) -> None:
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    for sender_id, text in iter_instagram_messaging_events(payload):
        normalized = text.strip().upper()
        if not normalized.startswith("PILE-"):
            continue
        prof = (
            db.query(models.CreatorProfile)
            .filter(
                models.CreatorProfile.verification_social_code == normalized,
                models.CreatorProfile.verification_social_code_expires_at > now,
                models.CreatorProfile.claim_status == "email_verified",
            )
            .first()
        )
        if not prof:
            send_instagram_text_dm(
                sender_id,
                "That code was not found or has expired. Open your PileIt claim page to request a new code.",
            )
            continue

        u = db.get(models.User, prof.user_id)
        handle = u.handle if u else "your-channel"

        prof.verification_social_verified_at = now
        prof.verification_social_ig_user_id = sender_id
        prof.claim_status = "social_verified"
        prof.verification_social_code = None
        prof.verification_social_code_expires_at = None
        db.commit()

        send_instagram_text_dm(
            sender_id,
            f"Verified! Return to PileIt to set your password and upload your intro video. "
            f"({handle})",
        )
