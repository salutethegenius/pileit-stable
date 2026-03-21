from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.security import decode_access

security = HTTPBearer(auto_error=False)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> models.User:
    if not cred:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_access(cred.credentials)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    user = db.get(models.User, uid)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def get_current_user_optional(
    db: Annotated[Session, Depends(get_db)],
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> models.User | None:
    if not cred:
        return None
    try:
        payload = decode_access(cred.credentials)
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    uid = payload.get("sub")
    if not uid:
        return None
    return db.get(models.User, uid)


def require_creator(user: Annotated[models.User, Depends(get_current_user)]) -> models.User:
    if user.account_type not in ("creator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Creator account required")
    return user


def require_admin(user: Annotated[models.User, Depends(get_current_user)]) -> models.User:
    if user.account_type != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin only")
    return user
