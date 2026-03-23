"""ISRC-anchored play counts for PRO / CMO-style reporting (PRS, BMI, ASCAP, etc.)."""

from __future__ import annotations

import csv
from datetime import date, datetime, timedelta, timezone
from io import StringIO
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import require_creator_or_admin

router = APIRouter(prefix="/usage", tags=["usage"])


class IsrcUsageRow(BaseModel):
    isrc: str
    plays: int


class IsrcUsageSummaryOut(BaseModel):
    date_from: date | None = None
    date_to: date | None = None
    rows: list[IsrcUsageRow]


def _range_bounds(
    date_from: date | None, date_to: date | None
) -> tuple[datetime | None, datetime | None]:
    start = None
    if date_from is not None:
        start = datetime(
            date_from.year, date_from.month, date_from.day, tzinfo=timezone.utc
        )
    end_exclusive = None
    if date_to is not None:
        nxt = date_to + timedelta(days=1)
        end_exclusive = datetime(nxt.year, nxt.month, nxt.day, tzinfo=timezone.utc)
    return start, end_exclusive


def _isrc_usage_query(
    db: Session,
    user: models.User,
    date_from: date | None,
    date_to: date | None,
    creator_id: str | None,
):
    if user.account_type == "creator":
        filter_creator_id = user.id
        if creator_id and creator_id != user.id:
            raise HTTPException(403, "Cannot query another creator’s usage")
    else:
        filter_creator_id = creator_id

    start, end_exclusive = _range_bounds(date_from, date_to)

    q = (
        db.query(
            models.IsrcPlayEvent.isrc,
            func.count(models.IsrcPlayEvent.id).label("plays"),
        )
        .join(models.Video, models.IsrcPlayEvent.video_id == models.Video.id)
    )
    if filter_creator_id is not None:
        q = q.filter(models.Video.creator_id == filter_creator_id)
    if start is not None:
        q = q.filter(models.IsrcPlayEvent.played_at >= start)
    if end_exclusive is not None:
        q = q.filter(models.IsrcPlayEvent.played_at < end_exclusive)
    return q.group_by(models.IsrcPlayEvent.isrc).order_by(models.IsrcPlayEvent.isrc)


@router.get("/isrc-summary", response_model=IsrcUsageSummaryOut)
def isrc_usage_summary(
    user: Annotated[models.User, Depends(require_creator_or_admin)],
    db: Session = Depends(get_db),
    date_from: Annotated[
        date | None,
        Query(alias="from", description="UTC start date (inclusive)"),
    ] = None,
    date_to: Annotated[
        date | None,
        Query(alias="to", description="UTC end date (inclusive)"),
    ] = None,
    creator_id: Annotated[
        str | None,
        Query(description="Admin only: limit to this creator’s videos"),
    ] = None,
):
    q = _isrc_usage_query(db, user, date_from, date_to, creator_id)
    rows = [IsrcUsageRow(isrc=r.isrc, plays=int(r.plays)) for r in q.all()]
    return IsrcUsageSummaryOut(date_from=date_from, date_to=date_to, rows=rows)


@router.get("/isrc-summary/export")
def isrc_usage_export_csv(
    user: Annotated[models.User, Depends(require_creator_or_admin)],
    db: Session = Depends(get_db),
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
    creator_id: Annotated[str | None, Query()] = None,
):
    q = _isrc_usage_query(db, user, date_from, date_to, creator_id)
    buf = StringIO()
    w = csv.writer(buf)
    w.writerow(["isrc", "plays", "date_from", "date_to"])
    df = date_from.isoformat() if date_from else ""
    dt = date_to.isoformat() if date_to else ""
    for r in q.all():
        w.writerow([r.isrc, int(r.plays), df, dt])
    data = buf.getvalue().encode("utf-8")

    return StreamingResponse(
        iter([data]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="isrc_usage_summary.csv"'
        },
    )
