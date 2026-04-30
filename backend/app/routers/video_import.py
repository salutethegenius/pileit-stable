"""POST /videos/import/meta — kick off Mux URL ingest for selected Facebook videos.

For each requested item we:
1. Refetch the FB video via Graph API to get a fresh short-lived `source` URL
   (the URL returned by /facebook/videos can be 5+ min old).
2. Hand that URL to Mux via mux_create_asset_from_url. Mux pulls server-to-server.
3. Insert a draft Video row with the new mux_asset_id; the row finishes via
   the existing Mux webhook (video.asset.ready) which sets playback_id + status.

The endpoint returns immediately with the created video_ids so the frontend can
poll the same /videos/{id}/mux-upload-status endpoint native uploads use.
"""

from __future__ import annotations

import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import require_creator
from app.mux_client import (
    mux_create_asset_from_url,
    mux_first_playback_id,
    mux_get_asset,
    mux_static_thumbnail_url,
)
from app.routers.social_meta import _load_account, get_page_token
from app.services import meta_graph

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/videos/import", tags=["videos-import"])

_MAX_BATCH = 25


class MetaImportItem(BaseModel):
    external_id: str = Field(..., min_length=1, max_length=128)
    title: str | None = Field(default=None, max_length=512)
    description: str | None = None
    category: str | None = Field(default=None, max_length=64)
    publish_after_ready: bool = True


class MetaImportRequest(BaseModel):
    source: Literal["facebook"] = "facebook"
    page_id: str = Field(..., min_length=1)
    items: list[MetaImportItem] = Field(..., min_length=1, max_length=_MAX_BATCH)


class MetaImportResultItem(BaseModel):
    external_id: str
    video_id: str | None
    mux_asset_id: str | None
    status: Literal["created", "duplicate", "failed"]
    error: str | None = None


class MetaImportResponse(BaseModel):
    results: list[MetaImportResultItem]


@router.post("/meta", response_model=MetaImportResponse)
def import_from_meta(
    body: MetaImportRequest,
    user: Annotated[models.User, Depends(require_creator)],
    db: Annotated[Session, Depends(get_db)],
):
    account = _load_account(db, user.id)
    if not account:
        raise HTTPException(status_code=400, detail="Facebook not connected")
    page_token = get_page_token(account, body.page_id)

    results: list[MetaImportResultItem] = []
    for item in body.items:
        ext_id = item.external_id.strip()
        existing = (
            db.query(models.Video)
            .filter(
                models.Video.creator_id == user.id,
                models.Video.import_source == "facebook",
                models.Video.import_external_id == ext_id,
            )
            .first()
        )
        if existing:
            results.append(
                MetaImportResultItem(
                    external_id=ext_id,
                    video_id=existing.id,
                    mux_asset_id=existing.mux_asset_id,
                    status="duplicate",
                )
            )
            continue

        try:
            meta_video = meta_graph.get_page_video(ext_id, page_token)
        except HTTPException as e:
            logger.warning("Meta refetch failed for %s: %s", ext_id, e.detail)
            results.append(
                MetaImportResultItem(
                    external_id=ext_id,
                    video_id=None,
                    mux_asset_id=None,
                    status="failed",
                    error="Could not load video from Facebook.",
                )
            )
            continue

        source_url = meta_video.get("source")
        if not isinstance(source_url, str) or not source_url:
            results.append(
                MetaImportResultItem(
                    external_id=ext_id,
                    video_id=None,
                    mux_asset_id=None,
                    status="failed",
                    error="Facebook didn’t return a downloadable URL for this video.",
                )
            )
            continue

        title = (
            (item.title or "").strip()
            or (meta_video.get("title") or "").strip()
            or (meta_video.get("description") or "").strip()[:120]
            or "Imported from Facebook"
        )
        description = (item.description or meta_video.get("description") or "").strip() or None
        category = (item.category or "").strip() or None
        thumbnail = meta_video.get("picture") if isinstance(meta_video.get("picture"), str) else None

        try:
            asset = mux_create_asset_from_url(source_url, passthrough=f"import:facebook:{ext_id}")
        except HTTPException as e:
            logger.warning("Mux URL ingest failed for %s: %s", ext_id, e.detail)
            results.append(
                MetaImportResultItem(
                    external_id=ext_id,
                    video_id=None,
                    mux_asset_id=None,
                    status="failed",
                    error="Couldn’t hand the video to the encoder.",
                )
            )
            continue

        asset_id = asset.get("id") if isinstance(asset, dict) else None
        if not isinstance(asset_id, str) or not asset_id:
            results.append(
                MetaImportResultItem(
                    external_id=ext_id,
                    video_id=None,
                    mux_asset_id=None,
                    status="failed",
                    error="Encoder didn’t return an asset id.",
                )
            )
            continue

        v = models.Video(
            creator_id=user.id,
            title=title[:512],
            description=description,
            category=category,
            thumbnail_url=thumbnail,
            status="draft",
            is_locked=False,
            mux_asset_id=asset_id,
            mux_pending_publish=bool(item.publish_after_ready),
            stream_source="vod",
            import_source="facebook",
            import_external_id=ext_id,
        )
        db.add(v)
        try:
            db.commit()
        except IntegrityError:
            # Lost a race against the dedupe constraint (same item imported twice in
            # parallel requests). Fall back to the existing row.
            db.rollback()
            existing = (
                db.query(models.Video)
                .filter(
                    models.Video.creator_id == user.id,
                    models.Video.import_source == "facebook",
                    models.Video.import_external_id == ext_id,
                )
                .first()
            )
            results.append(
                MetaImportResultItem(
                    external_id=ext_id,
                    video_id=existing.id if existing else None,
                    mux_asset_id=existing.mux_asset_id if existing else None,
                    status="duplicate",
                )
            )
            continue
        db.refresh(v)
        results.append(
            MetaImportResultItem(
                external_id=ext_id,
                video_id=v.id,
                mux_asset_id=asset_id,
                status="created",
            )
        )

    return MetaImportResponse(results=results)


@router.get("/status/{video_id}")
def get_import_status(
    video_id: str,
    user: Annotated[models.User, Depends(require_creator)],
    db: Annotated[Session, Depends(get_db)],
):
    """Poll status of an imported video. Mirrors /videos/{id}/mux-upload-status.

    Resolves status by checking the DB first (the Mux webhook may have already
    populated playback_id) and falling back to a direct Mux asset lookup so the
    flow still completes if a webhook is delayed or missed.
    """
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(404, "Not found")

    if v.playback_id:
        return {"status": "ready", "playback_id": v.playback_id, "video_id": v.id}

    if not v.mux_asset_id:
        return {"status": "error", "message": "No import in progress.", "video_id": v.id}

    try:
        asset = mux_get_asset(v.mux_asset_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, "Status check failed. Please try again.") from e

    ast_status = (asset.get("status") or "").strip()
    if ast_status == "errored":
        v.mux_pending_publish = False
        v.mux_asset_id = None
        v.status = "draft"
        db.commit()
        return {"status": "error", "message": "Import failed.", "video_id": v.id}

    if ast_status != "ready":
        return {"status": "processing", "video_id": v.id}

    pid = mux_first_playback_id(asset)
    if not pid:
        return {"status": "processing", "video_id": v.id}

    v.playback_id = pid
    if not (v.thumbnail_url or "").strip():
        thumb = mux_static_thumbnail_url(pid)
        if thumb:
            v.thumbnail_url = thumb
    dur = asset.get("duration")
    if dur is not None and v.duration_seconds is None:
        try:
            v.duration_seconds = int(round(float(dur)))
        except (TypeError, ValueError):
            pass
    if v.mux_pending_publish:
        v.status = "published"
    v.mux_pending_publish = False
    db.commit()
    return {"status": "ready", "playback_id": pid, "video_id": v.id}
