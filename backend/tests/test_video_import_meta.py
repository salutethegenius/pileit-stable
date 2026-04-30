"""POST /videos/import/meta — creates draft Video rows via Mux URL ingest."""

from __future__ import annotations

import json
from unittest.mock import patch

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app import models
from app.deps import get_current_user, get_current_user_optional, require_creator

FAKE_CREATOR = models.User(
    id="creator-import-test",
    email="import@test.pileit",
    password_hash="fakehash",
    display_name="ImportCreator",
    handle="importcreator",
    account_type="creator",
)

TEST_FERNET_KEY = Fernet.generate_key().decode()


def _override():
    return FAKE_CREATOR


app.dependency_overrides[get_current_user] = _override
app.dependency_overrides[get_current_user_optional] = _override
app.dependency_overrides[require_creator] = _override

client = TestClient(app)


def _ensure_creator_row():
    db = SessionLocal()
    try:
        if not db.get(models.User, FAKE_CREATOR.id):
            db.add(
                models.User(
                    id=FAKE_CREATOR.id,
                    email=FAKE_CREATOR.email,
                    password_hash=FAKE_CREATOR.password_hash,
                    display_name=FAKE_CREATOR.display_name,
                    handle=FAKE_CREATOR.handle,
                    account_type=FAKE_CREATOR.account_type,
                )
            )
            db.commit()
    finally:
        db.close()


def _wipe_imports():
    db = SessionLocal()
    try:
        db.query(models.Video).filter(
            models.Video.creator_id == FAKE_CREATOR.id,
            models.Video.import_source == "facebook",
        ).delete()
        db.query(models.UserSocialAccount).filter(
            models.UserSocialAccount.user_id == FAKE_CREATOR.id
        ).delete()
        db.commit()
    finally:
        db.close()


def _seed_meta_account(pages: list[dict]):
    from app.services.secrets import encrypt_token

    db = SessionLocal()
    try:
        db.add(
            models.UserSocialAccount(
                user_id=FAKE_CREATOR.id,
                provider="meta",
                external_user_id="fb_test",
                user_token_enc=encrypt_token("user_tok"),
                pages_enc=encrypt_token(json.dumps(pages)),
            )
        )
        db.commit()
    finally:
        db.close()


def setup_function(_fn):
    app.dependency_overrides[get_current_user] = _override
    app.dependency_overrides[get_current_user_optional] = _override
    app.dependency_overrides[require_creator] = _override
    _ensure_creator_row()
    _wipe_imports()
    from app.services import secrets as secrets_mod
    secrets_mod._fernet.cache_clear()


def _patch_token_key(s):
    s.meta_token_encryption_key = TEST_FERNET_KEY


def test_import_creates_draft_video():
    pages = [{"id": "p1", "name": "Page1", "access_token": "tok1"}]
    with patch("app.services.secrets.settings") as s:
        _patch_token_key(s)
        _seed_meta_account(pages)

        with patch(
            "app.routers.video_import.meta_graph.get_page_video",
            return_value={
                "id": "fbvid_1",
                "title": "Hello FB",
                "description": "From Facebook",
                "source": "https://fb.example/dl/fbvid_1.mp4",
                "picture": "https://fb.example/thumb/fbvid_1.jpg",
            },
        ), patch(
            "app.routers.video_import.mux_create_asset_from_url",
            return_value={"id": "ast_new_1", "status": "preparing"},
        ):
            r = client.post(
                "/videos/import/meta",
                json={
                    "source": "facebook",
                    "page_id": "p1",
                    "items": [{"external_id": "fbvid_1", "publish_after_ready": True}],
                },
            )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["results"]) == 1
    res = body["results"][0]
    assert res["status"] == "created"
    assert res["mux_asset_id"] == "ast_new_1"

    db = SessionLocal()
    try:
        v = db.get(models.Video, res["video_id"])
        assert v is not None
        assert v.creator_id == FAKE_CREATOR.id
        assert v.import_source == "facebook"
        assert v.import_external_id == "fbvid_1"
        assert v.mux_asset_id == "ast_new_1"
        assert v.mux_pending_publish is True
        assert v.status == "draft"
        assert v.title == "Hello FB"
        assert v.thumbnail_url == "https://fb.example/thumb/fbvid_1.jpg"
    finally:
        db.close()


def test_import_dedupes_existing_external_id():
    pages = [{"id": "p1", "name": "Page1", "access_token": "tok1"}]
    with patch("app.services.secrets.settings") as s:
        _patch_token_key(s)
        _seed_meta_account(pages)

        # Pre-existing import.
        db = SessionLocal()
        try:
            db.add(
                models.Video(
                    id="vid-already-imported",
                    creator_id=FAKE_CREATOR.id,
                    title="Already there",
                    status="published",
                    import_source="facebook",
                    import_external_id="fbvid_dupe",
                    mux_asset_id="ast_old",
                )
            )
            db.commit()
        finally:
            db.close()

        with patch(
            "app.routers.video_import.meta_graph.get_page_video"
        ) as gp, patch(
            "app.routers.video_import.mux_create_asset_from_url"
        ) as mc:
            r = client.post(
                "/videos/import/meta",
                json={
                    "source": "facebook",
                    "page_id": "p1",
                    "items": [{"external_id": "fbvid_dupe"}],
                },
            )
        # Refetch + Mux must NOT be called for the duplicate path.
        gp.assert_not_called()
        mc.assert_not_called()
    assert r.status_code == 200
    res = r.json()["results"][0]
    assert res["status"] == "duplicate"
    assert res["video_id"] == "vid-already-imported"


def test_import_400_when_meta_not_connected():
    r = client.post(
        "/videos/import/meta",
        json={
            "source": "facebook",
            "page_id": "p1",
            "items": [{"external_id": "fbvid_1"}],
        },
    )
    assert r.status_code == 400
    assert "Facebook" in r.json()["detail"]


def test_import_404_when_page_unknown_for_user():
    pages = [{"id": "p_other", "name": "Other", "access_token": "tok"}]
    with patch("app.services.secrets.settings") as s:
        _patch_token_key(s)
        _seed_meta_account(pages)

        r = client.post(
            "/videos/import/meta",
            json={
                "source": "facebook",
                "page_id": "p_unlinked",
                "items": [{"external_id": "fbvid_1"}],
            },
        )
    assert r.status_code == 404


def test_import_failure_when_meta_returns_no_source_url():
    pages = [{"id": "p1", "name": "Page1", "access_token": "tok"}]
    with patch("app.services.secrets.settings") as s:
        _patch_token_key(s)
        _seed_meta_account(pages)

        with patch(
            "app.routers.video_import.meta_graph.get_page_video",
            return_value={"id": "fbvid_x", "title": "no source"},
        ), patch(
            "app.routers.video_import.mux_create_asset_from_url"
        ) as mc:
            r = client.post(
                "/videos/import/meta",
                json={
                    "source": "facebook",
                    "page_id": "p1",
                    "items": [{"external_id": "fbvid_x"}],
                },
            )
        mc.assert_not_called()
    assert r.status_code == 200
    res = r.json()["results"][0]
    assert res["status"] == "failed"
    assert res["video_id"] is None
