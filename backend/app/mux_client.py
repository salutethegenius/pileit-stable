"""Minimal Mux Video API client (Direct Uploads + asset status)."""

from __future__ import annotations

import logging

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

MUX_API_BASE = "https://api.mux.com/video/v1"

# End-user-safe API messages (no provider env names or internal URLs in JSON detail).
_MSG_UPLOAD_UNAVAILABLE = "Upload isn’t available right now. Please try again later."
_MSG_UPLOAD_FAILED = "Upload couldn’t be completed. Please try again."


def mux_credentials() -> tuple[str, str]:
    token_id = (settings.mux_token_id or "").strip()
    secret = (settings.mux_token_secret or "").strip()
    if not token_id or not secret:
        raise HTTPException(status_code=503, detail=_MSG_UPLOAD_UNAVAILABLE)
    return (token_id, secret)


def _mux_http_error(resp: httpx.Response) -> None:
    detail = f"HTTP {resp.status_code}"
    try:
        payload = resp.json()
        err = payload.get("error")
        if isinstance(err, dict):
            msgs = err.get("messages")
            if isinstance(msgs, list) and msgs:
                detail = f"{detail}: {'; '.join(str(m) for m in msgs)}"
            elif err.get("type"):
                detail = f"{detail}: {err.get('type')}"
        elif payload.get("errors"):
            detail = f"{detail}: {payload.get('errors')}"
    except Exception:
        if resp.text:
            detail = f"{detail}: {resp.text[:400]}"
    logger.warning("Video upload provider error: %s", detail)
    raise HTTPException(status_code=502, detail=_MSG_UPLOAD_FAILED)


def mux_create_direct_upload(*, cors_origin: str | None) -> dict:
    """
    Create a Mux direct upload. Returns Mux `data` subset: id, url, timeout, status.
    """
    auth = mux_credentials()
    body: dict = {
        "new_asset_settings": {
            "playback_policies": ["public"],
        },
    }
    if cors_origin and cors_origin.strip():
        body["cors_origin"] = cors_origin.strip()
    with httpx.Client(auth=auth, timeout=60.0) as client:
        r = client.post(f"{MUX_API_BASE}/uploads", json=body)
    if not r.is_success:
        _mux_http_error(r)
    try:
        payload = r.json()
    except ValueError:
        logger.warning("Video upload provider returned invalid JSON (create upload)")
        raise HTTPException(status_code=502, detail=_MSG_UPLOAD_FAILED)
    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else {}


def mux_get_upload(upload_id: str) -> dict:
    auth = mux_credentials()
    with httpx.Client(auth=auth, timeout=60.0) as client:
        r = client.get(f"{MUX_API_BASE}/uploads/{upload_id}")
    if not r.is_success:
        _mux_http_error(r)
    try:
        payload = r.json()
    except ValueError:
        logger.warning("Video upload provider returned invalid JSON (upload status)")
        raise HTTPException(status_code=502, detail=_MSG_UPLOAD_FAILED)
    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else {}


def mux_get_asset(asset_id: str) -> dict:
    auth = mux_credentials()
    with httpx.Client(auth=auth, timeout=60.0) as client:
        r = client.get(f"{MUX_API_BASE}/assets/{asset_id}")
    if not r.is_success:
        _mux_http_error(r)
    try:
        payload = r.json()
    except ValueError:
        logger.warning("Video upload provider returned invalid JSON (asset)")
        raise HTTPException(status_code=502, detail=_MSG_UPLOAD_FAILED)
    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else {}


def mux_static_thumbnail_url(playback_id: str | None) -> str | None:
    """
    Poster frame URL via Mux image CDN (no API key; works for public playback IDs).
    See https://docs.mux.com/guides/video/get-images-from-a-video
    """
    pid = (playback_id or "").strip()
    if not pid:
        return None
    return (
        f"https://image.mux.com/{pid}/thumbnail.jpg"
        f"?time=1&width=640&fit_mode=smartcrop"
    )
