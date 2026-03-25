"""Internal API for services/webrtc-rtmp-gateway (server-to-server only)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models
from app.mux_client import mux_get_live_stream, mux_rtmp_push_url

router = APIRouter(prefix="/internal/live-gateway", tags=["internal-live-gateway"])


def _verify_gateway_bearer(authorization: str | None) -> None:
    secret = (settings.live_gateway_shared_secret or "").strip()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="Live gateway is not configured",
        )
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ", 1)[1].strip()
    if token != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


class MuxRtmpBody(BaseModel):
    video_id: str = Field(..., min_length=8, max_length=48)


@router.post("/mux-rtmp")
def get_mux_rtmp_push_for_video(
    body: MuxRtmpBody,
    db: Session = Depends(get_db),
    authorization: Annotated[str | None, Header()] = None,
):
    """
    Return a single RTMP push URL for Mux (includes stream key in path).
    Called only by the LiveKit gateway with LIVE_GATEWAY_SHARED_SECRET.
    """
    _verify_gateway_bearer(authorization)
    v = db.get(models.Video, body.video_id.strip())
    if not v:
        raise HTTPException(status_code=404, detail="Not found")
    if v.stream_source != "mux_live" or not v.mux_live_stream_id:
        raise HTTPException(status_code=400, detail="Not a Mux live video")
    if (v.mux_live_status or "") not in ("idle", "active"):
        raise HTTPException(status_code=400, detail="Mux live stream is not available for ingest")

    mux_data = mux_get_live_stream(v.mux_live_stream_id)
    stream_key = mux_data.get("stream_key")
    if not stream_key:
        raise HTTPException(status_code=502, detail="Could not load Mux stream key")
    push = mux_rtmp_push_url(str(stream_key))
    if not push:
        raise HTTPException(status_code=502, detail="Could not build RTMP URL")
    return {"rtmp_push_url": push}
