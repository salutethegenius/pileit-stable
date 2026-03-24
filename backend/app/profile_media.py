from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import HTTPException, UploadFile

from app.config import settings

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def upload_base() -> Path:
    p = Path(settings.upload_dir)
    return p.resolve() if p.is_absolute() else (Path.cwd() / p).resolve()


def _ext_for_upload(up: UploadFile) -> str:
    raw = (up.filename or "").rsplit(".", 1)
    suf = f".{raw[-1].lower()}" if len(raw) > 1 else ".jpg"
    if suf not in ALLOWED_IMAGE_EXT:
        suf = ".jpg"
    return suf


def save_profile_image(
    user_id: str, upload: UploadFile, role: Literal["avatar", "hero"]
) -> str:
    ct = (upload.content_type or "").lower()
    if not ct.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    ext = _ext_for_upload(upload)
    base = upload_base()
    media_dir = base / "media" / user_id
    media_dir.mkdir(parents=True, exist_ok=True)

    prefix = "avatar" if role == "avatar" else "hero"
    for p in media_dir.glob(f"{prefix}.*"):
        try:
            p.unlink()
        except OSError:
            pass

    dest_name = f"{prefix}{ext}"
    dest_path = media_dir / dest_name

    size = 0
    with dest_path.open("wb") as f:
        while True:
            chunk = upload.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_IMAGE_BYTES:
                try:
                    dest_path.unlink()
                except OSError:
                    pass
                raise HTTPException(400, "Image too large (max 5MB)")
            f.write(chunk)

    if size == 0:
        try:
            dest_path.unlink()
        except OSError:
            pass
        raise HTTPException(400, "Empty file")

    return f"media/{user_id}/{dest_name}"


def delete_stored_media(rel: str | None) -> None:
    if not rel or not rel.startswith("media/"):
        return
    base = upload_base()
    if ".." in rel or rel.startswith(("/", "\\")):
        return
    path = (base / rel).resolve()
    try:
        path.relative_to(base)
    except ValueError:
        return
    if path.is_file():
        try:
            path.unlink()
        except OSError:
            pass
