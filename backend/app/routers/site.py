"""Public site configuration (no auth)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.homepage_sections import merged_homepage_sections

router = APIRouter(prefix="/site", tags=["site"])


@router.get("/homepage-sections")
def get_homepage_sections(db: Session = Depends(get_db)):
    return {"sections": merged_homepage_sections(db)}
