from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from jose import JWTError
from pydantic import BaseModel, EmailStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh,
    hash_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterBody(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshBody(BaseModel):
    refresh_token: str


# Backlog (pre-production at scale): add a scheduled job (e.g. Railway cron nightly) that runs
# DELETE FROM revoked_tokens WHERE expires_at < now() so the table does not grow unbounded.
# Request-time purge below is correct but not a substitute for steady volume.
def _purge_expired_revoked(db: Session) -> None:
    now = datetime.now(timezone.utc)
    db.query(models.RevokedToken).filter(models.RevokedToken.expires_at < now).delete(
        synchronize_session=False
    )


@router.post("/register")
def register(body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    user = models.User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        account_type="viewer",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}


@router.post("/login", response_model=TokenOut)
def login(body: LoginBody, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return TokenOut(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenOut)
def refresh_token(body: RefreshBody, db: Session = Depends(get_db)):
    _purge_expired_revoked(db)
    try:
        payload = decode_refresh(body.refresh_token)
    except JWTError:
        raise HTTPException(401, "Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(401, "Invalid refresh token")
    fp = hash_refresh_token(body.refresh_token)
    if db.query(models.RevokedToken).filter(models.RevokedToken.token_hash == fp).first():
        raise HTTPException(401, "Invalid refresh token")
    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(401, "User not found")
    db.commit()
    return TokenOut(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/logout")
def logout(body: RefreshBody, db: Session = Depends(get_db)):
    """Revoke the given refresh token so it cannot be used again."""
    _purge_expired_revoked(db)
    try:
        payload = decode_refresh(body.refresh_token)
    except JWTError:
        raise HTTPException(401, "Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")
    exp = payload.get("exp")
    if exp is None:
        raise HTTPException(401, "Invalid refresh token")
    try:
        expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
    except (TypeError, ValueError, OSError):
        raise HTTPException(401, "Invalid refresh token")
    fp = hash_refresh_token(body.refresh_token)
    row = models.RevokedToken(token_hash=fp, expires_at=expires_at)
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return {"ok": True}
