"""Mux webhook: video.asset.* events used by the URL-ingest (social import) flow."""

from __future__ import annotations

import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app import models

client = TestClient(app)


def _ensure_creator(db) -> str:
    creator = db.get(models.User, "creator-asset-test")
    if not creator:
        creator = models.User(
            id="creator-asset-test",
            email="asset@test.pileit",
            password_hash="fakehash",
            display_name="AssetTester",
            handle="assettester",
            account_type="creator",
        )
        db.add(creator)
        db.commit()
    return creator.id


def _ensure_video(asset_id: str, *, pending_publish: bool, vid_id: str) -> str:
    db = SessionLocal()
    try:
        creator_id = _ensure_creator(db)
        existing = db.get(models.Video, vid_id)
        if existing:
            db.delete(existing)
            db.commit()
        v = models.Video(
            id=vid_id,
            creator_id=creator_id,
            title="Pending import",
            mux_asset_id=asset_id,
            mux_pending_publish=pending_publish,
            status="draft",
            import_source="facebook",
            import_external_id=f"fb-{vid_id}",
        )
        db.add(v)
        db.commit()
    finally:
        db.close()
    return vid_id


def _post_webhook(payload: dict):
    # mux_webhook_secret is unset in tests; the handler skips signature verification when
    # mux_token_id is also unset. Patch settings to keep the handler permissive.
    with patch("app.routers.mux_webhook.settings") as s:
        s.mux_webhook_secret = ""
        s.mux_token_id = ""
        return client.post(
            "/mux/webhook",
            content=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )


def test_asset_ready_publishes_when_pending():
    asset_id = "ast_ready_publish"
    vid_id = "vid-asset-publish"
    _ensure_video(asset_id, pending_publish=True, vid_id=vid_id)

    r = _post_webhook(
        {
            "type": "video.asset.ready",
            "data": {
                "id": asset_id,
                "status": "ready",
                "duration": 42.6,
                "playback_ids": [{"id": "pid_abc123", "policy": "public"}],
            },
        }
    )
    assert r.status_code == 200
    db = SessionLocal()
    try:
        v = db.get(models.Video, vid_id)
        assert v is not None
        assert v.playback_id == "pid_abc123"
        assert v.duration_seconds == 43
        assert v.status == "published"
        assert v.mux_pending_publish is False
        assert v.thumbnail_url and v.thumbnail_url.startswith("https://image.mux.com/pid_abc123/")
    finally:
        db.close()


def test_asset_ready_keeps_draft_when_not_pending():
    asset_id = "ast_ready_keep_draft"
    vid_id = "vid-asset-draft"
    _ensure_video(asset_id, pending_publish=False, vid_id=vid_id)

    r = _post_webhook(
        {
            "type": "video.asset.ready",
            "data": {
                "id": asset_id,
                "status": "ready",
                "playback_ids": [{"id": "pid_keep_draft"}],
            },
        }
    )
    assert r.status_code == 200
    db = SessionLocal()
    try:
        v = db.get(models.Video, vid_id)
        assert v.playback_id == "pid_keep_draft"
        assert v.status == "draft"
    finally:
        db.close()


def test_asset_errored_resets_to_draft():
    asset_id = "ast_errored_x"
    vid_id = "vid-asset-errored"
    _ensure_video(asset_id, pending_publish=True, vid_id=vid_id)

    r = _post_webhook({"type": "video.asset.errored", "data": {"id": asset_id}})
    assert r.status_code == 200
    db = SessionLocal()
    try:
        v = db.get(models.Video, vid_id)
        assert v.mux_asset_id is None
        assert v.mux_pending_publish is False
        assert v.status == "draft"
        assert v.playback_id is None
    finally:
        db.close()


def test_asset_event_for_unknown_id_is_noop():
    r = _post_webhook(
        {"type": "video.asset.ready", "data": {"id": "ast_no_match", "playback_ids": []}}
    )
    assert r.status_code == 200
