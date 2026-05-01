"""Meta OAuth + Page/video listing for the "Import from Facebook" flow.

Flow:
1. Creator hits GET /social/meta/oauth/start with their bearer token. We mint a
   short-lived signed `state` JWT carrying the user_id and redirect their browser
   to Facebook's OAuth dialog.
2. Facebook redirects back to GET /social/meta/oauth/callback with `code` + `state`.
   We verify the state, exchange the code for a long-lived user token, fetch the
   creator's Pages (each carries its own non-expiring page token), encrypt the
   tokens, persist a UserSocialAccount row, then redirect to PUBLIC_WEB_URL with
   ?meta_connected=1.
3. The frontend polls GET /social/meta/facebook/pages and
   GET /social/meta/facebook/videos?page_id=... using its bearer token.

State CSRF protection: the `state` JWT is signed with `jwt_secret` (same secret
used for access tokens, with a distinct `type=meta_oauth_state` claim and TTL
short enough that replays are impractical).
"""

from __future__ import annotations

import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models
from app.deps import get_current_user
from app.services import meta_graph
from app.services.secrets import decrypt_token, encrypt_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/social/meta", tags=["social-meta"])

_STATE_TTL_MINUTES = 10
_STATE_TYPE = "meta_oauth_state"


def _mint_state_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": _STATE_TYPE,
        "nonce": secrets.token_urlsafe(16),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=_STATE_TTL_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _verify_state_token(token: str) -> str:
    try:
        decoded = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except JWTError as e:
        raise HTTPException(status_code=400, detail="Invalid state") from e
    if decoded.get("type") != _STATE_TYPE:
        raise HTTPException(status_code=400, detail="Invalid state")
    uid = decoded.get("sub")
    if not isinstance(uid, str) or not uid:
        raise HTTPException(status_code=400, detail="Invalid state")
    return uid


def _redact_pages(decrypted_pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop access_token before returning page metadata to the frontend."""
    out: list[dict[str, Any]] = []
    for p in decrypted_pages:
        if not isinstance(p, dict):
            continue
        out.append(
            {
                "id": p.get("id"),
                "name": p.get("name"),
                "instagram_business_account": p.get("instagram_business_account"),
            }
        )
    return out


def _load_account(db: Session, user_id: str) -> models.UserSocialAccount | None:
    return (
        db.query(models.UserSocialAccount)
        .filter(
            models.UserSocialAccount.user_id == user_id,
            models.UserSocialAccount.provider == "meta",
        )
        .first()
    )


def _load_pages(account: models.UserSocialAccount) -> list[dict[str, Any]]:
    raw = decrypt_token(account.pages_enc) if account.pages_enc else ""
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def get_page_token(account: models.UserSocialAccount, page_id: str) -> str:
    """Decrypt and look up the long-lived Page access token. Used by video_import."""
    pages = _load_pages(account)
    for p in pages:
        if isinstance(p, dict) and str(p.get("id") or "") == str(page_id):
            tok = p.get("access_token")
            if isinstance(tok, str) and tok:
                return tok
    raise HTTPException(status_code=404, detail="Page not connected")


@router.get("/oauth/start")
def oauth_start(
    user: Annotated[models.User, Depends(get_current_user)],
):
    """Returns the Facebook OAuth dialog URL the frontend should open in a new window."""
    state = _mint_state_token(user.id)
    return {"authorize_url": meta_graph.build_oauth_authorize_url(state)}


@router.get("/oauth/callback")
def oauth_callback(
    db: Annotated[Session, Depends(get_db)],
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
):
    """Facebook redirects here after the user grants (or denies) the OAuth request."""
    web_base = (settings.public_web_url or "").rstrip("/")
    success_path = "/dashboard/upload"

    def _redirect_with(qs: dict[str, str]) -> RedirectResponse:
        target = f"{web_base}{success_path}?{urlencode(qs)}" if web_base else success_path
        return RedirectResponse(url=target, status_code=302)

    if error:
        logger.info("Meta OAuth denied: %s %s", error, error_description)
        return _redirect_with({"meta_connected": "0", "reason": error[:64]})
    if not code or not state:
        return _redirect_with({"meta_connected": "0", "reason": "missing_code"})

    user_id = _verify_state_token(state)
    user = db.get(models.User, user_id)
    if not user:
        return _redirect_with({"meta_connected": "0", "reason": "user_not_found"})

    short = meta_graph.exchange_code_for_token(code)
    long_lived = meta_graph.get_long_lived_user_token(short)
    me = meta_graph.get_me(long_lived)
    pages = meta_graph.list_user_pages(long_lived)

    now = datetime.now(timezone.utc)
    account = _load_account(db, user_id)
    if not account:
        account = models.UserSocialAccount(
            user_id=user_id,
            provider="meta",
            connected_at=now,
        )
        db.add(account)
    account.external_user_id = str(me.get("id") or "") or None
    account.user_token_enc = encrypt_token(long_lived)
    account.pages_enc = encrypt_token(json.dumps(pages))
    account.last_refreshed_at = now
    # Long-lived FB user tokens are good for ~60 days.
    account.expires_at = now + timedelta(days=60)
    db.commit()

    return _redirect_with({"meta_connected": "1", "pages": str(len(pages))})


@router.get("/connection")
def get_connection(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Frontend uses this to decide whether to show 'Connect Facebook' or the picker."""
    account = _load_account(db, user.id)
    if not account:
        return {"connected": False, "pages": []}
    return {
        "connected": True,
        "external_user_id": account.external_user_id,
        "connected_at": account.connected_at,
        "expires_at": account.expires_at,
        "pages": _redact_pages(_load_pages(account)),
    }


@router.delete("/connection", status_code=204)
def delete_connection(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    account = _load_account(db, user.id)
    if account:
        db.delete(account)
        db.commit()


@router.get("/facebook/pages")
def list_facebook_pages(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    account = _load_account(db, user.id)
    if not account:
        raise HTTPException(status_code=404, detail="Facebook not connected")
    return {"pages": _redact_pages(_load_pages(account))}


@router.get("/facebook/videos")
def list_facebook_videos(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page_id: str = Query(..., min_length=1),
    after: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
):
    account = _load_account(db, user.id)
    if not account:
        raise HTTPException(status_code=404, detail="Facebook not connected")
    page_token = get_page_token(account, page_id)
    payload = meta_graph.list_page_videos(
        page_id, page_token, limit=limit, after=after
    )
    raw_items = payload.get("data") if isinstance(payload, dict) else None
    items: list[dict[str, Any]] = []
    if isinstance(raw_items, list):
        for it in raw_items:
            if not isinstance(it, dict):
                continue
            items.append(
                {
                    "id": it.get("id"),
                    "title": it.get("title") or it.get("description"),
                    "description": it.get("description"),
                    "length": it.get("length"),
                    "picture": it.get("picture"),
                    "created_time": it.get("created_time"),
                    "permalink_url": it.get("permalink_url"),
                }
            )
    next_cursor: str | None = None
    paging = payload.get("paging") if isinstance(payload, dict) else None
    if isinstance(paging, dict):
        cursors = paging.get("cursors")
        if isinstance(cursors, dict):
            nxt = cursors.get("after")
            if isinstance(nxt, str) and nxt and paging.get("next"):
                next_cursor = nxt
    # Mark items already imported by this creator so the UI can disable them.
    if items:
        external_ids = [str(it["id"]) for it in items if it.get("id")]
        if external_ids:
            already = {
                row.import_external_id
                for row in db.query(models.Video.import_external_id)
                .filter(
                    models.Video.creator_id == user.id,
                    models.Video.import_source == "facebook",
                    models.Video.import_external_id.in_(external_ids),
                )
                .all()
            }
            for it in items:
                it["already_imported"] = bool(it.get("id") and it["id"] in already)
    return {"items": items, "next": next_cursor}
