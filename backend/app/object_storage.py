"""Optional S3-compatible object storage (e.g. Railway Buckets) for profile media."""

from __future__ import annotations

import mimetypes
from functools import lru_cache
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import settings


def profile_bucket_configured() -> bool:
    return bool(
        settings.s3_bucket.strip()
        and settings.s3_endpoint_url.strip()
        and settings.s3_access_key_id.strip()
        and settings.s3_secret_access_key.strip()
    )


@lru_cache
def _s3_client():
    style = settings.s3_addressing_style.strip().lower()
    if style not in ("virtual", "path", "auto"):
        style = "virtual"
    cfg = Config(signature_version="s3v4", s3={"addressing_style": style})
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url.strip().rstrip("/"),
        aws_access_key_id=settings.s3_access_key_id.strip(),
        aws_secret_access_key=settings.s3_secret_access_key.strip(),
        region_name=settings.s3_region.strip() or "auto",
        config=cfg,
    )


def s3_bucket_name() -> str:
    return settings.s3_bucket.strip()


def delete_keys_with_prefix(prefix: str) -> None:
    """Delete all object keys starting with prefix (e.g. media/uuid/avatar.)."""
    if not profile_bucket_configured():
        return
    client = _s3_client()
    bucket = s3_bucket_name()
    paginator = client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents") or []:
            key = obj.get("Key")
            if key:
                client.delete_object(Bucket=bucket, Key=key)


def put_media_object(key: str, body: bytes, content_type: str | None) -> None:
    if not profile_bucket_configured():
        raise RuntimeError("S3 profile storage not configured")
    extra = {}
    if content_type:
        extra["ContentType"] = content_type
    _s3_client().put_object(Bucket=s3_bucket_name(), Key=key, Body=body, **extra)


def delete_media_object(key: str) -> None:
    if not profile_bucket_configured():
        return
    try:
        _s3_client().delete_object(Bucket=s3_bucket_name(), Key=key)
    except ClientError:
        pass


def get_media_object(key: str) -> tuple[bytes, str] | None:
    """Return (body, content_type) or None if missing."""
    if not profile_bucket_configured():
        return None
    try:
        r = _s3_client().get_object(Bucket=s3_bucket_name(), Key=key)
    except ClientError as e:
        code = (e.response.get("Error") or {}).get("Code", "")
        if code in ("NoSuchKey", "404"):
            return None
        raise
    body = r["Body"].read()
    ct = r.get("ContentType") or mimetypes.guess_type(key)[0] or "application/octet-stream"
    return body, ct
