"""Token encryption helpers (Fernet symmetric AEAD) for at-rest OAuth secrets.

Used by app.routers.social_meta to keep Meta long-lived tokens out of the database
in plaintext. Wraps cryptography.fernet so callers don't need to construct keys.
"""

from __future__ import annotations

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from app.config import settings


_NOT_CONFIGURED = "Social import isn’t available right now. Please try again later."


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = (settings.meta_token_encryption_key or "").strip()
    if not key:
        raise HTTPException(status_code=503, detail=_NOT_CONFIGURED)
    try:
        return Fernet(key.encode("utf-8"))
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=503, detail=_NOT_CONFIGURED) from e


def encrypt_token(plaintext: str) -> str:
    if plaintext is None:
        return ""
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str | None) -> str:
    if not ciphertext:
        return ""
    try:
        return _fernet().decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken as e:
        raise HTTPException(status_code=500, detail="Stored token is unreadable") from e
