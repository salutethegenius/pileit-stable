"""Helpers for channel claim flow (Instagram URL match, codes, rate windows)."""

from __future__ import annotations

import re
import secrets
import string
from datetime import datetime, timedelta, timezone

from app import models


def _as_utc_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

_CODE_ALPHABET = string.ascii_uppercase + string.digits


def generate_pile_code() -> str:
    part = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(4))
    return f"PILE-{part}"


def hash_email_token(raw: str) -> str:
    import hashlib

    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def extract_instagram_handle(url: str | None) -> str | None:
    if not url or not str(url).strip():
        return None
    t = str(url).strip()
    m = re.search(
        r"(?:instagram\.com|instagr\.am)/([A-Za-z0-9._]+)/?",
        t,
        re.IGNORECASE,
    )
    if not m:
        return None
    h = m.group(1).strip().lower()
    if h in ("p", "reel", "reels", "stories", "explore", "accounts"):
        return None
    return h


def instagram_url_matches_channel(instagram_url: str | None, channel_handle: str) -> bool:
    """
    If instagram_url is empty, treat as match (optional field).
    Otherwise require extracted IG username to equal channel handle (case-insensitive).
    """
    if not instagram_url or not instagram_url.strip():
        return True
    ig = extract_instagram_handle(instagram_url)
    if not ig:
        return False
    return ig == channel_handle.strip().lower()


def reset_hourly_counter(
    prof: models.CreatorProfile,
    now: datetime,
    count_attr: str,
    last_attr: str,
) -> None:
    last = _as_utc_aware(getattr(prof, last_attr, None))
    cnt = getattr(prof, count_attr, 0) or 0
    if last is None or (now - last) > timedelta(hours=1):
        setattr(prof, count_attr, 0)
        setattr(prof, last_attr, now)


def bump_social_attempt(db, prof: models.CreatorProfile) -> None:
    now = datetime.now(timezone.utc)
    reset_hourly_counter(
        prof, now, "verification_attempt_count_social", "verification_social_last_attempt_at"
    )
    prof.verification_attempt_count_social = (prof.verification_attempt_count_social or 0) + 1
    prof.verification_social_last_attempt_at = now
    db.commit()


def bump_email_attempt(db, prof: models.CreatorProfile) -> None:
    now = datetime.now(timezone.utc)
    reset_hourly_counter(
        prof, now, "verification_attempt_count_email", "verification_email_last_attempt_at"
    )
    prof.verification_attempt_count_email = (prof.verification_attempt_count_email or 0) + 1
    prof.verification_email_last_attempt_at = now
    db.commit()
