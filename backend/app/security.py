import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(p: str, hashed: str) -> bool:
    return pwd_context.verify(p, hashed)


def create_access_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    return jwt.encode(
        {"sub": sub, "exp": exp, "type": "access"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    return jwt.encode(
        {"sub": sub, "exp": exp, "type": "refresh"},
        settings.jwt_refresh_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access(token: str) -> dict[str, Any]:
    return jwt.decode(
        token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )


def decode_refresh(token: str) -> dict[str, Any]:
    return jwt.decode(
        token, settings.jwt_refresh_secret, algorithms=[settings.jwt_algorithm]
    )


def hash_refresh_token(raw: str) -> str:
    """Stable fingerprint for blocklist lookups (SHA-256 hex)."""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def create_claim_channel_token(stub_user_id: str, handle: str, email: str) -> str:
    """Short-lived JWT for unclaimed-channel claim flow (after email verified)."""
    exp = datetime.now(timezone.utc) + timedelta(hours=8)
    return jwt.encode(
        {
            "sub": stub_user_id,
            "handle": handle,
            "claim_email": email,
            "exp": exp,
            "type": "claim_channel",
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_claim_channel_token(token: str) -> dict[str, Any]:
    data = jwt.decode(
        token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
    )
    if data.get("type") != "claim_channel":
        raise JWTError("not a claim token")
    return data


def _live_browser_ingest_secret() -> str:
    s = (settings.live_browser_ingest_secret or "").strip()
    if s:
        return s
    return settings.jwt_secret


def create_live_browser_ingest_token(*, video_id: str, user_id: str) -> str:
    """Short-lived JWT for the WebRTC gateway (never includes Mux stream key)."""
    exp = datetime.now(timezone.utc) + timedelta(hours=1)
    return jwt.encode(
        {
            "sub": user_id,
            "video_id": video_id,
            "exp": exp,
            "type": "live_browser_ingest",
        },
        _live_browser_ingest_secret(),
        algorithm=settings.jwt_algorithm,
    )


def decode_live_browser_ingest_token(token: str) -> dict[str, Any]:
    data = jwt.decode(
        token,
        _live_browser_ingest_secret(),
        algorithms=[settings.jwt_algorithm],
    )
    if data.get("type") != "live_browser_ingest":
        raise JWTError("not a live browser ingest token")
    return data
