"""Mux webhooks — update live stream status on video rows (optional signing secret)."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mux", tags=["mux"])


def _mux_verify_signature(raw_body: bytes, sig_header: str | None, secret: str) -> bool:
    if not secret or not sig_header:
        return False
    parts: dict[str, str] = {}
    for piece in sig_header.split(","):
        piece = piece.strip()
        if "=" in piece:
            k, _, v = piece.partition("=")
            parts[k.strip()] = v.strip()
    ts = parts.get("t")
    want = parts.get("v1")
    if not ts or not want:
        return False
    payload = f"{ts}.{raw_body.decode('utf-8')}"
    mac = hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(mac, want)


def _event_to_status(event_type: str) -> str | None:
    if event_type == "video.live_stream.active":
        return "active"
    if event_type in ("video.live_stream.idle", "video.live_stream.disconnected"):
        return "idle"
    if event_type == "video.live_stream.disabled":
        return "disabled"
    return None


@router.post("/webhook")
async def mux_webhook_receive(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    secret = (settings.mux_webhook_secret or "").strip()
    if secret:
        sig = request.headers.get("Mux-Signature") or request.headers.get("mux-signature")
        if not _mux_verify_signature(raw, sig, secret):
            logger.warning("Mux webhook signature verification failed")
            raise HTTPException(status_code=403, detail="Invalid signature")
    elif settings.mux_token_id:
        logger.warning("Mux webhook received but mux_webhook_secret is not set — accepting unsigned")

    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return Response(status_code=200)

    etype = payload.get("type")
    new_status = _event_to_status(str(etype))
    if not new_status:
        return Response(status_code=200)

    data = payload.get("data")
    if not isinstance(data, dict):
        return Response(status_code=200)

    ls_id = data.get("id")
    if not ls_id or not isinstance(ls_id, str):
        return Response(status_code=200)

    v = (
        db.query(models.Video)
        .filter(
            models.Video.mux_live_stream_id == ls_id,
            models.Video.stream_source == "mux_live",
        )
        .first()
    )
    if not v:
        return Response(status_code=200)

    v.mux_live_status = new_status
    db.add(v)
    db.commit()
    return Response(status_code=200)
