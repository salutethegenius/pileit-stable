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
from app.mux_client import mux_first_playback_id, mux_static_thumbnail_url

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


def _live_event_to_status(event_type: str) -> str | None:
    if event_type == "video.live_stream.active":
        return "active"
    if event_type in ("video.live_stream.idle", "video.live_stream.disconnected"):
        return "idle"
    if event_type == "video.live_stream.disabled":
        return "disabled"
    return None


def _handle_live_stream_event(etype: str, data: dict, db: Session) -> None:
    new_status = _live_event_to_status(etype)
    if not new_status:
        return
    ls_id = data.get("id")
    if not ls_id or not isinstance(ls_id, str):
        return
    v = (
        db.query(models.Video)
        .filter(
            models.Video.mux_live_stream_id == ls_id,
            models.Video.stream_source == "mux_live",
        )
        .first()
    )
    if not v:
        return
    v.mux_live_status = new_status
    db.add(v)
    db.commit()


def _handle_asset_event(etype: str, data: dict, db: Session) -> None:
    """video.asset.ready / errored — used by the URL-ingest (social import) flow.

    Direct uploads still update via polling in /videos/{id}/mux-upload-status; the
    asset.ready handler here is idempotent so it's safe even when both run.
    """
    asset_id = data.get("id")
    if not isinstance(asset_id, str) or not asset_id:
        return
    v = (
        db.query(models.Video)
        .filter(models.Video.mux_asset_id == asset_id)
        .first()
    )
    if not v:
        return
    if etype == "video.asset.errored":
        v.mux_pending_publish = False
        # Mark the row as draft + clear asset id so the frontend can offer a retry.
        v.mux_asset_id = None
        v.status = "draft"
        db.add(v)
        db.commit()
        return
    if etype != "video.asset.ready":
        return
    pid = mux_first_playback_id(data)
    if pid:
        v.playback_id = pid
        if not (v.thumbnail_url or "").strip():
            thumb = mux_static_thumbnail_url(pid)
            if thumb:
                v.thumbnail_url = thumb
    dur = data.get("duration")
    if dur is not None and v.duration_seconds is None:
        try:
            v.duration_seconds = int(round(float(dur)))
        except (TypeError, ValueError):
            pass
    if v.mux_pending_publish:
        v.status = "published"
    v.mux_pending_publish = False
    db.add(v)
    db.commit()


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
        logger.warning("Mux webhook rejected — mux_webhook_secret is not set")
        raise HTTPException(status_code=403, detail="Webhook signing not configured")

    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return Response(status_code=200)

    etype = str(payload.get("type") or "")
    data = payload.get("data")
    if not isinstance(data, dict):
        return Response(status_code=200)

    if etype.startswith("video.live_stream."):
        _handle_live_stream_event(etype, data, db)
    elif etype.startswith("video.asset."):
        _handle_asset_event(etype, data, db)
    return Response(status_code=200)
