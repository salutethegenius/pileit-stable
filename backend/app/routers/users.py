from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user
from app.profile_media import delete_stored_media, save_profile_image

router = APIRouter(prefix="/users", tags=["users"])


class UserMeOut(BaseModel):
    id: str
    email: str
    display_name: str
    handle: str | None
    avatar_url: str | None
    account_type: str
    accent_color: str
    bio: str | None
    monetization_eligible: bool | None = None
    payout_status: str | None = None
    verified: bool | None = None
    hero_image_url: str | None = None

    class Config:
        from_attributes = True


def _user_me_out(user: models.User) -> UserMeOut:
    prof = user.creator_profile
    me = None
    ps = None
    verified = None
    hero = None
    if user.account_type in ("creator", "admin") and prof:
        me = prof.monetization_eligible
        ps = prof.payout_status
        verified = prof.verified
        hero = prof.hero_image_url
    return UserMeOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        handle=user.handle,
        avatar_url=user.avatar_url,
        account_type=user.account_type,
        accent_color=user.accent_color,
        bio=user.bio,
        monetization_eligible=me,
        payout_status=ps,
        verified=verified,
        hero_image_url=hero,
    )


class UserUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=255)
    handle: str | None = Field(None, max_length=64)
    bio: str | None = None
    accent_color: str | None = Field(None, max_length=16)
    avatar_url: str | None = Field(None, max_length=1024)

    @field_validator("avatar_url", mode="before")
    @classmethod
    def empty_avatar_none(cls, v):
        if v is None or (isinstance(v, str) and not v.strip()):
            return None
        return v.strip() if isinstance(v, str) else v


@router.get("/me", response_model=UserMeOut)
def me(user: Annotated[models.User, Depends(get_current_user)]):
    return _user_me_out(user)


@router.post("/me/avatar", response_model=UserMeOut)
async def upload_my_avatar(
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
):
    old = user.avatar_url
    rel = save_profile_image(user.id, file, "avatar")
    if old and old.startswith("media/") and old != rel:
        delete_stored_media(old)
    user.avatar_url = rel
    db.commit()
    db.refresh(user)
    return _user_me_out(user)


@router.put("/me", response_model=UserMeOut)
def update_me(
    body: UserUpdate,
    user: Annotated[models.User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    patch = body.model_dump(exclude_unset=True)
    if "display_name" in patch and patch["display_name"] is not None:
        user.display_name = patch["display_name"]
    if "handle" in patch:
        h = patch["handle"]
        if h is not None:
            if (
                db.query(models.User)
                .filter(models.User.handle == h, models.User.id != user.id)
                .first()
            ):
                raise HTTPException(400, "Handle taken")
        user.handle = h
    if "bio" in patch:
        user.bio = patch["bio"]
    if "accent_color" in patch and patch["accent_color"] is not None:
        user.accent_color = patch["accent_color"]
    if "avatar_url" in patch:
        old = user.avatar_url
        new = patch["avatar_url"]
        if old and old.startswith("media/") and new != old:
            delete_stored_media(old)
        user.avatar_url = new
    db.commit()
    db.refresh(user)
    return _user_me_out(user)


@router.get("/{handle}", response_model=dict)
def public_profile(handle: str, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.handle == handle).first()
    if not u:
        raise HTTPException(404, "Not found")
    prof = u.creator_profile
    return {
        "id": u.id,
        "display_name": u.display_name,
        "handle": u.handle,
        "avatar_url": u.avatar_url,
        "bio": u.bio,
        "accent_color": u.accent_color,
        "verified": prof.verified if prof else False,
        "category": prof.category if prof else None,
        "subscriber_count": 0,
        "hero_image_url": prof.hero_image_url if prof else None,
        "monetization_eligible": prof.monetization_eligible if prof else False,
    }
