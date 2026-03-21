from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

REASONS = frozenset(
    {
        "spam",
        "harassment",
        "hate",
        "sexual_content",
        "violence",
        "copyright",
        "misinformation",
        "other",
    }
)


class ReportCreate(BaseModel):
    target_type: Literal["video", "pile_comment", "live_chat"]
    target_id: str = Field(..., min_length=1, max_length=36)
    reason: str = Field(..., min_length=2, max_length=64)
    details: str | None = Field(None, max_length=2000)


def _validate_target(db: Session, target_type: str, target_id: str) -> None:
    if target_type == "video":
        if not db.get(models.Video, target_id):
            raise HTTPException(404, "Video not found")
        return
    if target_type == "pile_comment":
        if not db.get(models.PileComment, target_id):
            raise HTTPException(404, "Comment not found")
        return
    if target_type == "live_chat":
        if not db.get(models.LiveChatMessage, target_id):
            raise HTTPException(404, "Message not found")
        return


@router.post("", status_code=201)
def create_report(
    body: ReportCreate,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    if body.reason not in REASONS:
        raise HTTPException(400, "Invalid reason")
    _validate_target(db, body.target_type, body.target_id)

    dup = (
        db.query(models.ContentReport)
        .filter(
            models.ContentReport.reporter_id == user.id,
            models.ContentReport.target_type == body.target_type,
            models.ContentReport.target_id == body.target_id,
            models.ContentReport.status == "pending",
        )
        .first()
    )
    if dup:
        raise HTTPException(400, "You already have a pending report for this content")

    r = models.ContentReport(
        reporter_id=user.id,
        target_type=body.target_type,
        target_id=body.target_id,
        reason=body.reason,
        details=(body.details or "").strip() or None,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {"id": r.id, "status": r.status}
