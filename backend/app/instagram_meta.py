"""Meta / Instagram Messaging helpers (webhook HMAC + optional outbound DMs)."""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def verify_x_hub_signature_256(body: bytes, signature_header: str | None) -> bool:
    if not settings.meta_app_secret or not signature_header:
        return False
    if not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        settings.meta_app_secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    try:
        got = signature_header[7:]
    except IndexError:
        return False
    return hmac.compare_digest(expected, got)


def send_instagram_text_dm(recipient_igsid: str, text: str) -> None:
    """Send a DM reply via Graph `me/messages` (page token linked to IG business)."""
    token = (settings.meta_instagram_access_token or "").strip()
    if not token:
        logger.warning("META_INSTAGRAM_ACCESS_TOKEN not set; skip IG DM to %s", recipient_igsid)
        return
    url = "https://graph.facebook.com/v21.0/me/messages"
    payload: dict[str, Any] = {
        "recipient": {"id": recipient_igsid},
        "messaging_type": "RESPONSE",
        "message": {"text": text[:1000]},
    }
    try:
        r = httpx.post(
            url,
            params={"access_token": token},
            json=payload,
            timeout=15.0,
        )
        if r.status_code >= 400:
            logger.warning("IG DM failed %s: %s", r.status_code, r.text[:500])
    except httpx.HTTPError as e:
        logger.warning("IG DM error: %s", e)


def iter_instagram_messaging_events(payload: dict[str, Any]) -> list[tuple[str, str]]:
    """Yield (sender_id, message_text) from Meta webhook JSON."""
    out: list[tuple[str, str]] = []
    for entry in payload.get("entry") or []:
        for ev in entry.get("messaging") or []:
            sender = ev.get("sender") or {}
            sid = sender.get("id")
            msg = ev.get("message") or {}
            text = (msg.get("text") or "").strip()
            if sid and text:
                out.append((str(sid), text))
    return out
