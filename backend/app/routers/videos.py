import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user, get_current_user_optional, require_creator
from app.isrc_utils import normalize_isrc
from app.monetization import creator_tip_subscribe_embed
from app.mux_client import (
    mux_create_direct_upload,
    mux_delete_live_stream,
    mux_get_asset,
    mux_get_upload,
    mux_static_thumbnail_url,
)

router = APIRouter(prefix="/videos", tags=["videos"])
logger = logging.getLogger(__name__)
VIEW_DEDUPE_WINDOW_MINUTES = 30

# In-memory per-IP rate limit for view endpoint (max requests per window)
_view_rate_limit: dict[str, list[float]] = {}
_VIEW_RATE_MAX = 60  # max view requests per IP per window
_VIEW_RATE_WINDOW = 300  # 5 minutes


class VideoOut(BaseModel):
    id: str
    creator_id: str
    title: str
    description: str | None
    video_url: str | None
    playback_id: str | None
    thumbnail_url: str | None
    duration_seconds: int | None
    category: str | None
    is_locked: bool
    status: str
    view_count: int
    tip_total: str
    isrc: str | None = None

    class Config:
        from_attributes = True


class VideoCreate(BaseModel):
    title: str
    description: str | None = None
    video_url: str | None = None
    playback_id: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int | None = None
    category: str | None = None
    is_locked: bool = False
    status: str = "draft"
    isrc: str | None = None


class VideoUpdate(BaseModel):
    """Partial update — only sent fields are applied (does not reset Mux fields)."""

    title: str | None = Field(None, max_length=512)
    description: str | None = None
    category: str | None = Field(None, max_length=64)
    is_locked: bool | None = None
    status: str | None = Field(None, max_length=32)
    isrc: str | None = None
    thumbnail_url: str | None = Field(None, max_length=1024)

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return v

    @field_validator("description", "category", mode="before")
    @classmethod
    def empty_str_none(cls, v):
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        return v.strip() if isinstance(v, str) else v

    @field_validator("status")
    @classmethod
    def status_allowed(cls, v: str | None):
        if v is None:
            return None
        if v not in ("draft", "published"):
            raise ValueError("status must be draft or published")
        return v


def _parse_isrc_optional(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    n = normalize_isrc(s)
    if not n:
        raise HTTPException(
            400,
            "Invalid ISRC. Use 12 alphanumeric characters (hyphens optional), e.g. USUM72512345.",
        )
    return n


def _client_country(request: Request) -> str | None:
    """Best-effort ISO 3166-1 alpha-2 from common edge / proxy headers."""
    for key in (
        "cf-ipcountry",
        "x-vercel-ip-country",
        "cloudfront-viewer-country",
        "x-country-code",
    ):
        raw = request.headers.get(key)
        if not raw:
            continue
        cc = raw.strip().upper()
        if len(cc) == 2 and cc.isalpha():
            return cc
    return None


def _viewer_fingerprint_hash(request: Request) -> str | None:
    """Best-effort privacy-preserving viewer fingerprint for short dedupe windows."""
    fwd = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    ip = (
        fwd
        or (request.headers.get("cf-connecting-ip") or "").strip()
        or (request.client.host if request.client else "")
    )
    ua = (request.headers.get("user-agent") or "").strip()
    base = f"{ip}|{ua}".strip("|")
    if not base:
        return None
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def _mux_playback_id_from_asset(asset: dict) -> str | None:
    """Mux may return playback_ids as objects {id, policy} or occasionally string ids."""
    raw = asset.get("playback_ids") or []
    if not isinstance(raw, list):
        return None
    for p in raw:
        if isinstance(p, str) and p.strip():
            return p.strip()
        if isinstance(p, dict) and p.get("id"):
            s = str(p["id"]).strip()
            if s:
                return s
    return None


def _serialize(v: models.Video) -> dict:
    return {
        "id": v.id,
        "title": v.title,
        "description": v.description,
        "thumbnail_url": v.thumbnail_url,
        "backdrop_url": v.thumbnail_url,
        "video_url": v.video_url,
        "playback_id": v.playback_id,
        "duration_seconds": v.duration_seconds or 0,
        "category": v.category or "",
        "is_locked": v.is_locked,
        "view_count": v.view_count,
        "tip_total": float(v.tip_total),
        "creator_id": v.creator_id,
        "status": v.status,
        "isrc": v.isrc,
        "created_at": v.created_at.isoformat() if v.created_at else "",
        "stream_source": getattr(v, "stream_source", None) or "vod",
        "mux_live_status": getattr(v, "mux_live_status", None),
    }


def _delete_pile_comments_for_video(db: Session, video_id: str) -> None:
    """Delete thread tree for a video (self-referential parent_id)."""
    while True:
        rows = (
            db.query(models.PileComment)
            .filter(models.PileComment.video_id == video_id)
            .all()
        )
        if not rows:
            return
        pointed = {r.parent_id for r in rows if r.parent_id is not None}
        leaves = [r for r in rows if r.id not in pointed]
        if not leaves:
            leaves = [rows[0]]
        for r in leaves:
            db.delete(r)
        db.flush()


def _minimal_mine_row(v: models.Video) -> dict:
    return {
        "id": v.id,
        "title": v.title,
        "description": v.description,
        "category": v.category,
        "status": v.status,
        "view_count": v.view_count,
        "tip_total": float(v.tip_total),
        "is_locked": v.is_locked,
        "thumbnail_url": v.thumbnail_url,
        "isrc": v.isrc,
        "stream_source": (v.stream_source if v.stream_source else "vod"),
        "mux_live_status": v.mux_live_status,
    }


def _cascade_delete_video_rows(db: Session, video_id: str) -> None:
    _delete_pile_comments_for_video(db, video_id)
    db.query(models.LiveChatMessage).filter(
        models.LiveChatMessage.video_id == video_id
    ).delete(synchronize_session=False)
    db.query(models.Watchlist).filter(models.Watchlist.video_id == video_id).delete(
        synchronize_session=False
    )
    db.query(models.Tip).filter(models.Tip.video_id == video_id).update(
        {"video_id": None},
        synchronize_session=False,
    )
    db.query(models.ContentReport).filter(
        models.ContentReport.target_type == "video",
        models.ContentReport.target_id == video_id,
    ).delete(synchronize_session=False)
    db.query(models.IsrcPlayEvent).filter(
        models.IsrcPlayEvent.video_id == video_id
    ).delete(synchronize_session=False)
    db.query(models.VideoViewEvent).filter(
        models.VideoViewEvent.video_id == video_id
    ).delete(synchronize_session=False)


@router.get("/mine")
def list_my_videos(
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.Video)
        .filter(models.Video.creator_id == user.id)
        .order_by(models.Video.created_at.desc())
        .all()
    )
    return [
        _minimal_mine_row(v)
        for v in rows
    ]


class MuxDirectUploadBody(BaseModel):
    title: str
    description: str | None = None
    category: str | None = None
    isrc: str | None = None
    publish_after_ready: bool = True
    """Browser origin for Mux direct upload CORS (e.g. http://localhost:3000)."""
    cors_origin: str | None = None


@router.post("/mux/direct-upload", status_code=201)
def create_mux_direct_upload(
    body: MuxDirectUploadBody,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    """
    Create a Mux direct upload and a draft video row. Client PUTs the file to `upload_url`,
    then polls GET /videos/{video_id}/mux-upload-status until `ready`.
    """
    title = body.title.strip()
    if not title:
        raise HTTPException(400, "Title is required")
    mux_data = mux_create_direct_upload(cors_origin=body.cors_origin)
    mux_upload_id = mux_data.get("id")
    upload_url = mux_data.get("url")
    if not mux_upload_id or not upload_url:
        raise HTTPException(502, "Upload couldn’t be started. Please try again.")
    isrc_val = _parse_isrc_optional(body.isrc)
    v = models.Video(
        creator_id=user.id,
        title=title,
        description=(body.description or "").strip() or None,
        category=(body.category or "").strip() or None,
        isrc=isrc_val,
        status="draft",
        is_locked=False,
        mux_upload_id=mux_upload_id,
        mux_pending_publish=bool(body.publish_after_ready),
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {
        "video_id": v.id,
        "upload_url": upload_url,
        "mux_upload_id": mux_upload_id,
        "timeout": mux_data.get("timeout"),
    }


@router.get("/{video_id}/mux-upload-status")
def mux_upload_poll_status(
    video_id: str,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    """Poll Mux after the browser finishes PUT to `upload_url`; updates video when asset is ready."""
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(404, "Not found")

    if v.playback_id:
        if v.mux_upload_id:
            v.mux_upload_id = None
            v.mux_pending_publish = False
            db.commit()
        return {"status": "ready", "playback_id": v.playback_id, "video_id": v.id}

    if not v.mux_upload_id:
        return {
            "status": "idle",
            "message": "No direct upload in progress for this video.",
            "video_id": v.id,
        }

    try:
        up = mux_get_upload(v.mux_upload_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, "Upload status check failed. Please try again.") from e

    u_status = (up.get("status") or "").strip()

    if u_status == "waiting":
        return {"status": "waiting_upload", "video_id": v.id}

    if u_status in ("errored", "timed_out", "cancelled"):
        v.mux_upload_id = None
        v.mux_pending_publish = False
        db.commit()
        return {
            "status": "error",
            "message": f"Upload failed ({u_status}).",
            "video_id": v.id,
        }

    if u_status != "asset_created":
        return {"status": "waiting_mux", "video_id": v.id}

    asset_id = up.get("asset_id")
    if not asset_id:
        return {"status": "waiting_mux", "video_id": v.id}

    try:
        asset = mux_get_asset(asset_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, "Video processing status check failed. Please try again.") from e

    ast_status = (asset.get("status") or "").strip()
    if ast_status == "errored":
        v.mux_upload_id = None
        v.mux_pending_publish = False
        db.commit()
        return {
            "status": "error",
            "message": "Video processing failed.",
            "video_id": v.id,
        }

    if ast_status != "ready":
        return {"status": "processing", "video_id": v.id}

    pid = _mux_playback_id_from_asset(asset)
    if not pid:
        return {"status": "processing", "message": "Asset ready; waiting for playback id", "video_id": v.id}

    dur = asset.get("duration")
    try:
        d_int = int(round(float(dur))) if dur is not None else None
    except (TypeError, ValueError):
        d_int = None

    v.playback_id = pid
    thumb = mux_static_thumbnail_url(pid)
    if thumb:
        v.thumbnail_url = thumb
    if d_int is not None:
        v.duration_seconds = d_int
    v.mux_upload_id = None
    if v.mux_pending_publish:
        v.status = "published"
    else:
        v.status = "draft"
    v.mux_pending_publish = False
    db.commit()
    db.refresh(v)
    return {"status": "ready", "playback_id": pid, "video_id": v.id}


@router.get("")
def list_videos(
    db: Session = Depends(get_db),
    category: str | None = None,
    locked: bool | None = None,
    trending: bool | None = None,
    sort: str | None = None,
):
    """
    sort: browse | recent | trending (optional). Explicit sort wins over legacy trending=true.
    - browse: newest creator accounts first, then newest video per creator (default).
    - recent: global newest published uploads (Video.created_at).
    - trending: by view_count descending.
    """
    q = (
        db.query(models.Video)
        .join(models.User, models.User.id == models.Video.creator_id)
        .filter(models.Video.status == "published")
        .filter(
            or_(
                func.coalesce(models.Video.stream_source, "vod") != "mux_live",
                models.Video.mux_live_status == "active",
            )
        )
    )
    if category:
        q = q.filter(models.Video.category == category)
    if locked is not None:
        q = q.filter(models.Video.is_locked == locked)

    raw_sort = (sort or "").strip().lower()
    if raw_sort and raw_sort not in ("browse", "recent", "trending"):
        raise HTTPException(
            status_code=400,
            detail="Invalid sort (use browse, recent, or trending)",
        )
    if raw_sort:
        mode = raw_sort
    elif trending:
        mode = "trending"
    else:
        mode = "browse"

    if mode == "recent":
        q = q.order_by(desc(models.Video.created_at))
    elif mode == "browse":
        # Home / browse: surface newest creators first, then newest uploads per creator.
        q = q.order_by(desc(models.User.created_at), desc(models.Video.created_at))
    rows = q.all()
    if mode == "trending":
        rows = sorted(rows, key=lambda x: x.view_count, reverse=True)
    out = []
    for v in rows:
        u = db.get(models.User, v.creator_id)
        prof = u.creator_profile if u else None
        base = _serialize(v)
        base["creator"] = creator_tip_subscribe_embed(db, u, prof)
        out.append(base)
    return out


@router.get("/{video_id}")
def get_video(
    video_id: str,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_current_user_optional),
):
    v = db.get(models.Video, video_id)
    if not v:
        raise HTTPException(404, "Not found")
    if v.status != "published":
        allowed = user and (
            user.id == v.creator_id or user.account_type == "admin"
        )
        if not allowed:
            raise HTTPException(404, "Not found")
    u = db.get(models.User, v.creator_id)
    prof = u.creator_profile if u else None
    base = _serialize(v)
    base["creator"] = creator_tip_subscribe_embed(db, u, prof)
    base["tip_count"] = int(float(v.tip_total))
    base["pile_count"] = db.query(models.PileComment).filter(
        models.PileComment.video_id == v.id
    ).count()
    base["share_count"] = 0
    return base


@router.post("/{video_id}/view")
def increment_view(
    video_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    v = db.get(models.Video, video_id)
    if not v:
        raise HTTPException(404, "Not found")

    # Per-IP rate limit to prevent bot abuse
    now = datetime.now(timezone.utc)
    now_ts = now.timestamp()
    client_ip = (
        (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
        or (request.headers.get("cf-connecting-ip") or "").strip()
        or (request.client.host if request.client else "unknown")
    )
    hits = _view_rate_limit.get(client_ip, [])
    hits = [t for t in hits if now_ts - t < _VIEW_RATE_WINDOW]
    if len(hits) >= _VIEW_RATE_MAX:
        raise HTTPException(429, "Too many requests")
    hits.append(now_ts)
    _view_rate_limit[client_ip] = hits

    fp = _viewer_fingerprint_hash(request)
    country = _client_country(request)
    if fp:
        cutoff = now - timedelta(minutes=VIEW_DEDUPE_WINDOW_MINUTES)
        recent = (
            db.query(models.VideoViewEvent.id)
            .filter(
                models.VideoViewEvent.video_id == v.id,
                models.VideoViewEvent.fingerprint_hash == fp,
                models.VideoViewEvent.viewed_at >= cutoff,
            )
            .first()
        )
        if recent:
            return {"view_count": v.view_count, "deduped": True}

    v.view_count += 1
    db.add(
        models.VideoViewEvent(
            video_id=v.id,
            viewed_at=now,
            country_code=country,
            fingerprint_hash=fp,
        )
    )
    if v.isrc:
        db.add(
            models.IsrcPlayEvent(
                video_id=v.id,
                isrc=v.isrc,
                played_at=now,
                country_code=country,
            )
        )
    db.commit()
    db.refresh(v)
    return {"view_count": v.view_count}


@router.post("", status_code=201)
def create_video(
    body: VideoCreate,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    isrc_val = _parse_isrc_optional(body.isrc)
    thumb = body.thumbnail_url
    if not thumb and body.playback_id:
        thumb = mux_static_thumbnail_url(body.playback_id)
    v = models.Video(
        creator_id=user.id,
        title=body.title,
        description=body.description,
        video_url=body.video_url,
        playback_id=body.playback_id,
        thumbnail_url=thumb,
        duration_seconds=body.duration_seconds,
        category=body.category,
        is_locked=body.is_locked,
        status=body.status,
        isrc=isrc_val,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"id": v.id}


@router.put("/{video_id}")
def update_video(
    video_id: str,
    body: VideoUpdate,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(404, "Not found")
    patch = body.model_dump(exclude_unset=True)
    if "isrc" in patch:
        patch["isrc"] = _parse_isrc_optional(patch.get("isrc"))
    allowed = {
        "title",
        "description",
        "category",
        "is_locked",
        "status",
        "isrc",
        "thumbnail_url",
    }
    patch = {k: val for k, val in patch.items() if k in allowed}
    if "title" in patch and patch["title"] is None:
        raise HTTPException(400, "Title cannot be empty")
    for k, val in patch.items():
        setattr(v, k, val)
    db.commit()
    return {"ok": True}


@router.delete("/{video_id}")
def delete_video(
    video_id: str,
    user: Annotated[models.User, Depends(require_creator)],
    db: Session = Depends(get_db),
):
    v = db.get(models.Video, video_id)
    if not v or v.creator_id != user.id:
        raise HTTPException(404, "Not found")
    vid = v.id
    if v.mux_live_stream_id:
        try:
            mux_delete_live_stream(v.mux_live_stream_id)
        except Exception:
            logger.warning(
                "Could not delete Mux live stream %s; continuing video delete",
                v.mux_live_stream_id,
                exc_info=True,
            )
    _cascade_delete_video_rows(db, vid)
    db.delete(v)
    db.commit()
    return {"ok": True}


class PileCommentOut(BaseModel):
    id: str
    user_display_name: str
    comment_type: str
    content: str | None
    media_url: str | None
    duration_seconds: int | None
    like_count: int
    created_at: str


@router.get("/{video_id}/pile", response_model=list[PileCommentOut])
def get_pile(video_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(models.PileComment)
        .filter(models.PileComment.video_id == video_id)
        .order_by(models.PileComment.created_at.desc())
        .all()
    )
    out = []
    for c in rows:
        u = db.get(models.User, c.user_id)
        out.append(
            PileCommentOut(
                id=c.id,
                user_display_name=u.display_name if u else "Unknown",
                comment_type=c.comment_type,
                content=c.content,
                media_url=c.media_url,
                duration_seconds=c.duration_seconds,
                like_count=c.like_count,
                created_at=c.created_at.isoformat() if c.created_at else "",
            )
        )
    return out


class ChatOut(BaseModel):
    id: str
    user_display_name: str
    body: str
    created_at: str


@router.get("/{video_id}/chat", response_model=list[ChatOut])
def get_chat(video_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(models.LiveChatMessage)
        .filter(models.LiveChatMessage.video_id == video_id)
        .order_by(models.LiveChatMessage.created_at.asc())
        .limit(200)
        .all()
    )
    out = []
    for m in rows:
        u = db.get(models.User, m.user_id)
        out.append(
            ChatOut(
                id=m.id,
                user_display_name=u.display_name if u else "Unknown",
                body=m.body,
                created_at=m.created_at.isoformat() if m.created_at else "",
            )
        )
    return out


class ChatPost(BaseModel):
    body: str


@router.post("/{video_id}/chat")
def post_chat(
    video_id: str,
    body: ChatPost,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if not body.body.strip():
        raise HTTPException(400, "Empty message")
    v = db.get(models.Video, video_id.strip())
    if not v:
        raise HTTPException(404, "Video not found")
    m = models.LiveChatMessage(
        video_id=v.id, user_id=user.id, body=body.body.strip()
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id}
