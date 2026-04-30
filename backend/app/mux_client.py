"""Mux Video API client (Direct Uploads, assets, live streams)."""

from __future__ import annotations

import logging

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

MUX_API_BASE = "https://api.mux.com/video/v1"
# RTMPS ingest (OBS / FFmpeg). Stream key is returned on create; append as the stream key field in software.
MUX_LIVE_RTMP_URL = "rtmps://global-live.mux.com:443/app"


def mux_rtmp_push_url(stream_key: str) -> str:
    """Single RTMP(S) URL for encoders / LiveKit egress (path includes stream key)."""
    key = (stream_key or "").strip()
    if not key:
        return ""
    base = MUX_LIVE_RTMP_URL.rstrip("/")
    return f"{base}/{key}"

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


def mux_create_asset_from_url(url: str, *, passthrough: str | None = None) -> dict:
    """
    Create a Mux asset by URL ingest (server-to-server pull). Used by the social-import
    flow: Meta hands us a short-lived signed URL, Mux fetches it, then the asset moves
    through the same `video.asset.ready` webhook the direct-upload flow ends in.

    Returns Mux `data` subset: id (asset id), status, playback_ids (may be empty initially).
    """
    auth = mux_credentials()
    body: dict = {
        "input": [{"url": url}],
        "playback_policy": ["public"],
        "encoding_tier": "smart",
    }
    if passthrough and passthrough.strip():
        # Mux echoes passthrough on every webhook event for this asset — convenient for
        # mapping asset events back to our Video row.
        body["passthrough"] = passthrough.strip()[:255]
    with httpx.Client(auth=auth, timeout=60.0) as client:
        r = client.post(f"{MUX_API_BASE}/assets", json=body)
    if not r.is_success:
        _mux_http_error(r)
    try:
        payload = r.json()
    except ValueError:
        logger.warning("Video upload provider returned invalid JSON (create asset)")
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


def mux_create_live_stream(
    *,
    passthrough: str | None = None,
) -> dict:
    """
    Create a Mux live stream. Returns Mux `data` object (id, stream_key, status, playback_ids, …).
    """
    auth = mux_credentials()
    body: dict = {
        "playback_policy": ["public"],
        "new_asset_settings": {
            # Match direct-upload shape (Mux accepts playback_policies on asset settings).
            "playback_policies": ["public"],
        },
    }
    if passthrough and passthrough.strip():
        body["passthrough"] = passthrough.strip()[:255]
    with httpx.Client(auth=auth, timeout=60.0) as client:
        r = client.post(f"{MUX_API_BASE}/live-streams", json=body)
    if not r.is_success:
        _mux_http_error(r)
    try:
        payload = r.json()
    except ValueError:
        logger.warning("Video provider returned invalid JSON (create live stream)")
        raise HTTPException(status_code=502, detail=_MSG_UPLOAD_FAILED)
    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else {}


def mux_get_live_stream(live_stream_id: str) -> dict:
    auth = mux_credentials()
    with httpx.Client(auth=auth, timeout=60.0) as client:
        r = client.get(f"{MUX_API_BASE}/live-streams/{live_stream_id}")
    if not r.is_success:
        _mux_http_error(r)
    try:
        payload = r.json()
    except ValueError:
        logger.warning("Video provider returned invalid JSON (live stream)")
        raise HTTPException(status_code=502, detail=_MSG_UPLOAD_FAILED)
    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else {}


def mux_first_playback_id(resource: dict) -> str | None:
    """First playback id from a Mux asset or live stream `playback_ids` list."""
    raw = resource.get("playback_ids") or []
    if not isinstance(raw, list):
        return None
    for p in raw:
        if isinstance(p, str) and p.strip():
            return p.strip()
        if isinstance(p, dict) and p.get("id"):
            s = str(p["id"]).strip()
            if s:
                return s
    return None


def mux_delete_live_stream(live_stream_id: str) -> None:
    auth = mux_credentials()
    with httpx.Client(auth=auth, timeout=60.0) as client:
        r = client.delete(f"{MUX_API_BASE}/live-streams/{live_stream_id}")
    if r.status_code == 404:
        return
    if not r.is_success:
        _mux_http_error(r)


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
