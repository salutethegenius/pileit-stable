"""Minimal Mux Video API client (Direct Uploads + asset status)."""

from __future__ import annotations

import httpx
from fastapi import HTTPException

from app.config import settings

MUX_API_BASE = "https://api.mux.com/video/v1"


def mux_credentials() -> tuple[str, str]:
    token_id = (settings.mux_token_id or "").strip()
    secret = (settings.mux_token_secret or "").strip()
    if not token_id or not secret:
        raise HTTPException(
            status_code=503,
            detail="Mux API is not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.",
        )
    return (token_id, secret)


def _mux_http_error(resp: httpx.Response) -> None:
    detail = f"Mux API HTTP {resp.status_code}"
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
    raise HTTPException(status_code=502, detail=detail)


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
        raise HTTPException(status_code=502, detail="Mux returned invalid JSON for create upload")
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
        raise HTTPException(status_code=502, detail="Mux returned invalid JSON for upload status")
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
        raise HTTPException(status_code=502, detail="Mux returned invalid JSON for asset")
    data = payload.get("data") if isinstance(payload, dict) else None
    return data if isinstance(data, dict) else {}
