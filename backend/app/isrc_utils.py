"""ISRC (International Standard Recording Code) normalization for PRO / CMO reporting."""

from __future__ import annotations

import re

# Compact ISRC is exactly 12 alphanumeric characters (CC + registrant + year + serial).
_ISRC_COMPACT_RE = re.compile(r"^[A-Z0-9]{12}$")


def normalize_isrc(raw: str | None) -> str | None:
    """
    Return compact uppercase ISRC (12 chars) or None if invalid / empty.
    Accepts common formats with hyphens or spaces (e.g. US-UM1-25-00001).
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    compact = re.sub(r"[^A-Za-z0-9]", "", s).upper()
    if _ISRC_COMPACT_RE.match(compact):
        return compact
    return None
