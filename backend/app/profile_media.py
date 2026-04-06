from __future__ import annotations

from pathlib import Path
from typing import Literal

from fastapi import HTTPException, UploadFile

from app.config import settings
from app.object_storage import (
    delete_keys_with_prefix,
    delete_media_object,
    profile_bucket_configured,
    put_media_object,
)

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


def _read_upload_limited(upload: UploadFile) -> tuple[bytes, str]:
    ct = (upload.content_type or "").lower()
    if not ct.startswith("image/"):
        raise HTTPException(400, "File must be an image")
    chunks: list[bytes] = []
    size = 0
    while True:
        chunk = upload.file.read(1024 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_IMAGE_BYTES:
            raise HTTPException(400, "Image too large (max 5MB)")
        chunks.append(chunk)
    body = b"".join(chunks)
    if size == 0:
        raise HTTPException(400, "Empty file")
    return body, upload.content_type or "application/octet-stream"


def save_profile_image(
    user_id: str, upload: UploadFile, role: Literal["avatar", "hero"]
) -> str:
    prefix = "avatar" if role == "avatar" else "hero"
    ext = _ext_for_upload(upload)
    dest_name = f"{prefix}{ext}"
    rel_key = f"media/{user_id}/{dest_name}"

    body, content_type = _read_upload_limited(upload)

    if profile_bucket_configured():
        delete_keys_with_prefix(f"media/{user_id}/{prefix}.")
        put_media_object(rel_key, body, content_type)
        return rel_key

    base = upload_base()
    media_dir = base / "media" / user_id
    media_dir.mkdir(parents=True, exist_ok=True)
    for p in media_dir.glob(f"{prefix}.*"):
        try:
            p.unlink()
        except OSError:
            pass
    dest_path = media_dir / dest_name
    with dest_path.open("wb") as f:
        f.write(body)
    return rel_key


def save_video_thumbnail(user_id: str, video_id: str, upload: UploadFile) -> str:
    """Store a custom video poster under media/{user_id}/video_thumbs/{video_id}{ext}."""
    vid = (video_id or "").strip()
    if not vid or ".." in vid or "/" in vid or "\\" in vid:
        raise HTTPException(400, "Invalid video id")
    ext = _ext_for_upload(upload)
    dest_name = f"{vid}{ext}"
    rel_key = f"media/{user_id}/video_thumbs/{dest_name}"
    thumb_prefix = f"media/{user_id}/video_thumbs/{vid}."

    body, content_type = _read_upload_limited(upload)

    if profile_bucket_configured():
        delete_keys_with_prefix(thumb_prefix)
        put_media_object(rel_key, body, content_type)
        return rel_key

    base = upload_base()
    media_dir = base / "media" / user_id / "video_thumbs"
    media_dir.mkdir(parents=True, exist_ok=True)
    for p in media_dir.glob(f"{vid}.*"):
        try:
            p.unlink()
        except OSError:
            pass
    dest_path = media_dir / dest_name
    with dest_path.open("wb") as f:
        f.write(body)
    return rel_key


def delete_stored_media(rel: str | None) -> None:
    if not rel or not rel.startswith("media/"):
        return
    if ".." in rel or rel.startswith(("/", "\\")):
        return
    if profile_bucket_configured():
        delete_media_object(rel)
        return
    base = upload_base()
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
