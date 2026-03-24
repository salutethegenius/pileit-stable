import mimetypes

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.profile_media import upload_base

router = APIRouter(tags=["public-files"])


@router.get("/public-files/{path:path}")
def serve_public_upload(path: str):
    if not path.startswith("media/"):
        raise HTTPException(404, "Not found")
    if ".." in path or path.startswith(("/", "\\")):
        raise HTTPException(404, "Not found")
    base = upload_base().resolve()
    dest = (base / path).resolve()
    try:
        dest.relative_to(base)
    except ValueError as e:
        raise HTTPException(404, "Not found") from e
    if not dest.is_file():
        raise HTTPException(404, "Not found")
    media_type, _ = mimetypes.guess_type(dest.name)
    if not media_type or not media_type.startswith("image/"):
        media_type = "application/octet-stream"
    return FileResponse(
        dest,
        media_type=media_type,
        filename=dest.name,
        content_disposition_type="inline",
    )
