"""Mux Live: create RTMP ingest, public active listing, creator end-stream."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import require_creator
from app.security import create_live_browser_ingest_token
from app.mux_client import (
    MUX_LIVE_RTMP_URL,
    mux_create_live_stream,
    mux_delete_live_stream,
    mux_first_playback_id,
    mux_get_live_stream,
    mux_static_thumbnail_url,
)
from app.routers.videos import _serialize
from app.monetization import creator_tip_subscribe_embed

router = APIRouter(prefix="/live-streams", tags=["live-streams"])

_MSG_ONE_LIVE = (
    "You already have a Mux live stream in progress. End it from the dashboard or "
    "delete that video before creating another."
)


class CreateMuxLiveBody(BaseModel):
    title: str = Field(..., min_length=1, max_length=512)
    description: str | None = None
    category: str | None = Field(None, max_length=64)


def _creator_has_open_mux_live(db: Session, creator_id: str) -> bool:
    row = (
        db.query(models.Video.id)
        .filter(
            models.Video.creator_id == creator_id,
            models.Video.stream_source == "mux_live",
            models.Video.mux_live_stream_id.isnot(None),
            models.Video.mux_live_status.in_(("idle", "active")),
        )
        .first()
    )
    return row is not None


def _sync_video_from_mux_live(db: Session, v: models.Video) -> models.Video:
    if not v.mux_live_stream_id:
        return v
    mux_data = mux_get_live_stream(v.mux_live_stream_id)
    st = (mux_data.get("status") or "").strip().lower()
    if st in ("idle", "active", "disabled"):
        v.mux_live_status = st
    pid = mux_first_playback_id(mux_data)
    if pid and not v.playback_id:
        v.playback_id = pid
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.post("", status_code=201)
def create_mux_live_stream(
    body: CreateMuxLiveBody,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    """Create a Mux live stream and published catalog row. Returns RTMP URL + stream key once."""
    if _creator_has_open_mux_live(db, user.id):
        raise HTTPException(status_code=409, detail=_MSG_ONE_LIVE)

    title = body.title.strip()
    mux_data = mux_create_live_stream(passthrough=None)
    ls_id = mux_data.get("id")
    stream_key = mux_data.get("stream_key")
    if not ls_id or not stream_key:
        raise HTTPException(status_code=502, detail="Live stream could not be created. Try again.")

    playback_id = mux_first_playback_id(mux_data)
    if not playback_id:
        try:
            mux_delete_live_stream(str(ls_id))
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Live stream could not be created. Try again.")

    status_mux = (mux_data.get("status") or "idle").strip().lower()
    if status_mux not in ("idle", "active", "disabled"):
        status_mux = "idle"

    thumb = mux_static_thumbnail_url(playback_id)
    v = models.Video(
        creator_id=user.id,
        title=title,
        description=(body.description or "").strip() or None,
        video_url=None,
        playback_id=playback_id,
        thumbnail_url=thumb,
        duration_seconds=0,
        category=(body.category or "").strip() or None,
        is_locked=False,
        status="published",
        stream_source="mux_live",
        mux_live_stream_id=str(ls_id),
        mux_live_status=status_mux,
    )
    db.add(v)
    db.commit()
    db.refresh(v)

    return {
        "video_id": v.id,
        "live_stream_id": str(ls_id),
        "playback_id": playback_id,
        "mux_status": status_mux,
        "rtmp_url": MUX_LIVE_RTMP_URL,
        "stream_key": str(stream_key),
        "watch_url_path": f"/watch/{v.id}",
    }


@router.get("/active")
def list_active_live_streams(db: Session = Depends(get_db)):
    """Public: published Mux live videos currently marked active (ingest connected)."""
    rows = (
        db.query(models.Video)
        .join(models.User, models.User.id == models.Video.creator_id)
        .filter(
            models.Video.status == "published",
            models.Video.stream_source == "mux_live",
            models.Video.mux_live_status == "active",
        )
        .order_by(models.Video.created_at.desc())
        .all()
    )
    out = []
    for v in rows:
        u = db.get(models.User, v.creator_id)
        prof = u.creator_profile if u else None
        base = _serialize(v)
        base["creator"] = creator_tip_subscribe_embed(db, u, prof)
        out.append(base)
    return out


@router.get("/mine/latest")
def get_my_latest_live(
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    """Creator: newest mux_live row; optional sync from Mux when still connected to a stream."""
    v = (
        db.query(models.Video)
        .filter(
            models.Video.creator_id == user.id,
            models.Video.stream_source == "mux_live",
            models.Video.mux_live_stream_id.isnot(None),
        )
        .order_by(models.Video.created_at.desc())
        .first()
    )
    if not v:
        return None
    if v.mux_live_stream_id and v.mux_live_status in ("idle", "active"):
        try:
            v = _sync_video_from_mux_live(db, v)
        except Exception:
            db.refresh(v)
    return {
        "video_id": v.id,
        "title": v.title,
        "mux_live_status": v.mux_live_status,
        "playback_id": v.playback_id,
        "watch_url_path": f"/watch/{v.id}",
    }


@router.post("/{video_id}/sync")
def sync_live_stream_status(
    video_id: str,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    if v.stream_source != "mux_live" or not v.mux_live_stream_id:
        raise HTTPException(status_code=400, detail="Not a Mux live video")
    v = _sync_video_from_mux_live(db, v)
    return {
        "video_id": v.id,
        "mux_live_status": v.mux_live_status,
        "playback_id": v.playback_id,
    }


@router.post("/{video_id}/browser-ingest-token")
def issue_browser_ingest_token(
    video_id: str,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    """
    Mint a short-lived JWT for the WebRTC/LiveKit gateway. Does not expose Mux stream key.
    """
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    if v.stream_source != "mux_live" or not v.mux_live_stream_id:
        raise HTTPException(status_code=400, detail="Not a Mux live video")
    if (v.mux_live_status or "") not in ("idle", "active"):
        raise HTTPException(
            status_code=400,
            detail="Create a live stream first; browser ingest requires an idle or active Mux session.",
        )
    token = create_live_browser_ingest_token(video_id=v.id, user_id=user.id)
    return {
        "ingest_token": token,
        "video_id": v.id,
    }


@router.delete("/{video_id}", status_code=200)
def end_mux_live_stream(
    video_id: str,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    """Delete the Mux live stream (stops ingest); keeps the video row for replay if Mux provides one."""
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    if v.stream_source != "mux_live" or not v.mux_live_stream_id:
        raise HTTPException(status_code=400, detail="Not a Mux live video")
    ls_id = v.mux_live_stream_id
    mux_delete_live_stream(ls_id)
    v.mux_live_stream_id = None
    v.mux_live_status = "disabled"
    v.stream_source = "mux_live"
    db.add(v)
    db.commit()
    return {"ok": True, "video_id": v.id}
