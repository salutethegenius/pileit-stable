"""Meta Graph API client for the Facebook import feature.

Scope is limited to what the import flow needs: OAuth code exchange, long-lived
token swap, listing the user's Pages, and listing each Page's videos. All calls
are server-to-server with `httpx`. The token-storage / encryption / DB layer
lives in `app.routers.social_meta`; this module is pure HTTP.
"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"
FB_OAUTH_DIALOG_BASE = "https://www.facebook.com/v21.0/dialog/oauth"

# Page-level scopes required to read a creator's Page videos.
# `pages_show_list` lets us enumerate Pages the creator manages; the read scopes
# are needed to call /{page-id}/videos and pull the short-lived `source` URL.
DEFAULT_SCOPES = (
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
)

_MSG_PROVIDER_UNAVAILABLE = "Facebook isn’t available right now. Please try again later."
_MSG_PROVIDER_FAILED = "Couldn’t talk to Facebook. Please try again."


def _require_app_creds() -> tuple[str, str, str]:
    app_id = (settings.meta_app_id or "").strip()
    app_secret = (settings.meta_app_secret or "").strip()
    redirect_uri = (settings.meta_oauth_redirect_uri or "").strip()
    if not app_id or not app_secret or not redirect_uri:
        raise HTTPException(status_code=503, detail=_MSG_PROVIDER_UNAVAILABLE)
    return app_id, app_secret, redirect_uri


def build_oauth_authorize_url(state: str) -> str:
    """URL the user's browser is redirected to in order to grant Page access."""
    app_id, _, redirect_uri = _require_app_creds()
    qs = urlencode(
        {
            "client_id": app_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": ",".join(DEFAULT_SCOPES),
            "response_type": "code",
        }
    )
    return f"{FB_OAUTH_DIALOG_BASE}?{qs}"


def _graph_get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.get(f"{GRAPH_API_BASE}{path}", params=params)
    except httpx.HTTPError as e:
        logger.warning("Graph API request error %s: %s", path, e)
        raise HTTPException(status_code=502, detail=_MSG_PROVIDER_FAILED) from e
    if not r.is_success:
        # Facebook returns useful messages in payload.error.message; surface them in logs only.
        body = r.text[:500]
        logger.warning("Graph API non-2xx %s status=%s body=%s", path, r.status_code, body)
        raise HTTPException(status_code=502, detail=_MSG_PROVIDER_FAILED)
    try:
        return r.json()
    except ValueError as e:
        raise HTTPException(status_code=502, detail=_MSG_PROVIDER_FAILED) from e


def exchange_code_for_token(code: str) -> str:
    """Exchange the `code` from the OAuth callback for a short-lived user access token."""
    app_id, app_secret, redirect_uri = _require_app_creds()
    payload = _graph_get(
        "/oauth/access_token",
        {
            "client_id": app_id,
            "client_secret": app_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        },
    )
    tok = payload.get("access_token")
    if not isinstance(tok, str) or not tok:
        raise HTTPException(status_code=502, detail=_MSG_PROVIDER_FAILED)
    return tok


def get_long_lived_user_token(short_lived: str) -> str:
    """Swap a short-lived user token for a ~60d long-lived user token."""
    app_id, app_secret, _ = _require_app_creds()
    payload = _graph_get(
        "/oauth/access_token",
        {
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": short_lived,
        },
    )
    tok = payload.get("access_token")
    if not isinstance(tok, str) or not tok:
        raise HTTPException(status_code=502, detail=_MSG_PROVIDER_FAILED)
    return tok


def get_me(user_token: str) -> dict[str, Any]:
    """Identify the Facebook user behind `user_token` (needed for external_user_id)."""
    return _graph_get("/me", {"access_token": user_token, "fields": "id,name"})


def list_user_pages(user_token: str) -> list[dict[str, Any]]:
    """
    Pages the creator manages. Each returned dict has a long-lived `access_token`
    (Page tokens minted from a long-lived user token never expire) plus
    `instagram_business_account` if the Page is linked to an IG Business/Creator.
    """
    payload = _graph_get(
        "/me/accounts",
        {
            "access_token": user_token,
            "fields": "id,name,access_token,instagram_business_account{id,username}",
            "limit": 100,
        },
    )
    data = payload.get("data")
    return data if isinstance(data, list) else []


def list_page_videos(
    page_id: str,
    page_token: str,
    *,
    limit: int = 25,
    after: str | None = None,
) -> dict[str, Any]:
    """
    Page videos with the short-lived `source` URL Mux can pull from. Returns
    `{data: [...], paging: {...}}` straight from Graph API so the frontend can
    paginate via `paging.cursors.after`.
    """
    params: dict[str, Any] = {
        "access_token": page_token,
        "fields": "id,description,source,picture,length,created_time,title,permalink_url",
        "limit": max(1, min(100, int(limit or 25))),
    }
    if after:
        params["after"] = after
    return _graph_get(f"/{page_id}/videos", params)


def get_page_video(video_id: str, page_token: str) -> dict[str, Any]:
    """
    Refetch a single video right before sending its `source` URL to Mux.
    The `source` field is a short-lived signed URL (~5 min) — fetching it fresh
    avoids handing Mux an expired link.
    """
    return _graph_get(
        f"/{video_id}",
        {
            "access_token": page_token,
            "fields": "id,description,source,picture,length,title,permalink_url",
        },
    )
