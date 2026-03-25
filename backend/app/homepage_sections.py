"""Homepage / browse catalog row visibility (admin-configurable)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app import models

HOMEPAGE_SECTION_KEYS = frozenset(
    {
        "featured_creators",
        "trending",
        "new_releases",
        "comedy",
        "music",
        "lifestyle",
        "free_to_watch",
    }
)

HOMEPAGE_SECTION_DEFAULTS: dict[str, bool] = {k: True for k in HOMEPAGE_SECTION_KEYS}

_SITE_KEY = "homepage_sections"


def merged_homepage_sections(db: Session) -> dict[str, bool]:
    out = dict(HOMEPAGE_SECTION_DEFAULTS)
    row = (
        db.query(models.SiteSetting)
        .filter(models.SiteSetting.key == _SITE_KEY)
        .first()
    )
    if row and isinstance(row.data, dict):
        for k, v in row.data.items():
            if k in HOMEPAGE_SECTION_KEYS:
                out[k] = bool(v)
    return out


def update_homepage_sections(db: Session, patch: dict[str, bool]) -> dict[str, bool]:
    current = merged_homepage_sections(db)
    for k, v in patch.items():
        if k in HOMEPAGE_SECTION_KEYS:
            current[k] = bool(v)
    row = (
        db.query(models.SiteSetting)
        .filter(models.SiteSetting.key == _SITE_KEY)
        .first()
    )
    if row:
        row.data = current
    else:
        db.add(models.SiteSetting(key=_SITE_KEY, data=current))
    db.commit()
    return current
