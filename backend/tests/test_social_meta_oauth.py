"""Meta OAuth start/callback + connection management."""

from __future__ import annotations

import json
from unittest.mock import patch

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app import models
from app.deps import get_current_user, get_current_user_optional

FAKE_USER = models.User(
    id="creator-meta-test",
    email="meta@test.pileit",
    password_hash="fakehash",
    display_name="MetaTester",
    handle="metatester",
    account_type="creator",
)

# Stable Fernet key so tests can construct ciphertext deterministically.
TEST_FERNET_KEY = Fernet.generate_key().decode()


def _override_user():
    return FAKE_USER


def _override_user_optional():
    return FAKE_USER


app.dependency_overrides[get_current_user] = _override_user
app.dependency_overrides[get_current_user_optional] = _override_user_optional

client = TestClient(app)


def _ensure_user_row():
    db = SessionLocal()
    try:
        if not db.get(models.User, FAKE_USER.id):
            db.add(
                models.User(
                    id=FAKE_USER.id,
                    email=FAKE_USER.email,
                    password_hash=FAKE_USER.password_hash,
                    display_name=FAKE_USER.display_name,
                    handle=FAKE_USER.handle,
                    account_type=FAKE_USER.account_type,
                )
            )
            db.commit()
    finally:
        db.close()


def _wipe_account():
    db = SessionLocal()
    try:
        db.query(models.UserSocialAccount).filter(
            models.UserSocialAccount.user_id == FAKE_USER.id
        ).delete()
        db.commit()
    finally:
        db.close()


def _patch_settings(s):
    s.meta_app_id = "test_app_id"
    s.meta_app_secret = "test_app_secret"
    s.meta_oauth_redirect_uri = "http://127.0.0.1:8000/social/meta/oauth/callback"
    s.meta_token_encryption_key = TEST_FERNET_KEY
    s.public_web_url = "http://localhost:3000"
    s.jwt_secret = "test-jwt-secret"
    s.jwt_algorithm = "HS256"


class _SettingsCtx:
    """Patch settings on every module that reads them so encryption + OAuth see the same key."""

    def __enter__(self):
        self._stack = [
            patch("app.routers.social_meta.settings"),
            patch("app.services.meta_graph.settings"),
            patch("app.services.secrets.settings"),
        ]
        for p in self._stack:
            _patch_settings(p.start())
        return self

    def __exit__(self, *exc):
        for p in self._stack:
            p.stop()


def setup_function(_fn):
    # Other test files mutate app.dependency_overrides at module-import time, so when
    # the full suite runs the auth override may have been replaced by a later file.
    # Re-bind to this file's user before every test.
    app.dependency_overrides[get_current_user] = _override_user
    app.dependency_overrides[get_current_user_optional] = _override_user_optional
    _ensure_user_row()
    _wipe_account()
    from app.services import secrets as secrets_mod
    secrets_mod._fernet.cache_clear()


def test_oauth_start_returns_authorize_url():
    with _SettingsCtx():
        r = client.get("/social/meta/oauth/start")
    assert r.status_code == 200
    body = r.json()
    assert body["authorize_url"].startswith("https://www.facebook.com/")
    assert "client_id=test_app_id" in body["authorize_url"]
    assert "state=" in body["authorize_url"]


def test_oauth_start_503_when_app_creds_missing():
    with patch("app.services.meta_graph.settings") as gs:
        gs.meta_app_id = ""
        gs.meta_app_secret = ""
        gs.meta_oauth_redirect_uri = ""
        gs.jwt_secret = "test-jwt-secret"
        gs.jwt_algorithm = "HS256"
        with patch("app.routers.social_meta.settings") as s:
            s.jwt_secret = "test-jwt-secret"
            s.jwt_algorithm = "HS256"
            r = client.get("/social/meta/oauth/start")
    assert r.status_code == 503


def test_oauth_callback_persists_account_and_redirects():
    fake_pages = [
        {
            "id": "page_111",
            "name": "Test Page",
            "access_token": "page_token_aaa",
            "instagram_business_account": {"id": "ig_222", "username": "creatorx"},
        }
    ]
    # Mint a state JWT the same way the start endpoint does.
    from app.routers.social_meta import _mint_state_token

    with _SettingsCtx():
        state = _mint_state_token(FAKE_USER.id)
        with patch(
            "app.routers.social_meta.meta_graph.exchange_code_for_token",
            return_value="short_token",
        ), patch(
            "app.routers.social_meta.meta_graph.get_long_lived_user_token",
            return_value="long_token",
        ), patch(
            "app.routers.social_meta.meta_graph.get_me",
            return_value={"id": "fb_user_999", "name": "Test"},
        ), patch(
            "app.routers.social_meta.meta_graph.list_user_pages",
            return_value=fake_pages,
        ):
            r = client.get(
                f"/social/meta/oauth/callback?code=abc&state={state}",
                follow_redirects=False,
            )
    assert r.status_code == 302
    assert "meta_connected=1" in r.headers["location"]

    db = SessionLocal()
    try:
        acct = (
            db.query(models.UserSocialAccount)
            .filter(
                models.UserSocialAccount.user_id == FAKE_USER.id,
                models.UserSocialAccount.provider == "meta",
            )
            .first()
        )
        assert acct is not None
        assert acct.external_user_id == "fb_user_999"
        # Tokens must be encrypted, not stored plaintext.
        assert acct.user_token_enc and acct.user_token_enc != "long_token"
        assert acct.pages_enc and "page_token_aaa" not in acct.pages_enc
        # Decrypts correctly.
        from app.services.secrets import decrypt_token
        assert decrypt_token(acct.user_token_enc) == "long_token"
        decrypted_pages = json.loads(decrypt_token(acct.pages_enc))
        assert decrypted_pages[0]["access_token"] == "page_token_aaa"
    finally:
        db.close()


def test_oauth_callback_rejects_invalid_state():
    with _SettingsCtx():
        r = client.get(
            "/social/meta/oauth/callback?code=abc&state=not.a.jwt",
            follow_redirects=False,
        )
    assert r.status_code == 400


def test_get_connection_redacts_page_tokens():
    pages = [
        {"id": "p1", "name": "Page One", "access_token": "secret_tok", "instagram_business_account": None},
    ]
    with _SettingsCtx():
        from app.services.secrets import encrypt_token

        db = SessionLocal()
        try:
            db.add(
                models.UserSocialAccount(
                    user_id=FAKE_USER.id,
                    provider="meta",
                    external_user_id="fb_user_1",
                    user_token_enc=encrypt_token("user_tok"),
                    pages_enc=encrypt_token(json.dumps(pages)),
                )
            )
            db.commit()
        finally:
            db.close()
        r = client.get("/social/meta/connection")
    assert r.status_code == 200
    body = r.json()
    assert body["connected"] is True
    assert body["pages"][0]["id"] == "p1"
    assert "access_token" not in body["pages"][0]


def test_delete_connection_removes_row():
    with _SettingsCtx():
        from app.services.secrets import encrypt_token

        db = SessionLocal()
        try:
            db.add(
                models.UserSocialAccount(
                    user_id=FAKE_USER.id,
                    provider="meta",
                    user_token_enc=encrypt_token("u"),
                    pages_enc=encrypt_token("[]"),
                )
            )
            db.commit()
        finally:
            db.close()
        r = client.delete("/social/meta/connection")
    assert r.status_code == 204
    db = SessionLocal()
    try:
        assert (
            db.query(models.UserSocialAccount)
            .filter(models.UserSocialAccount.user_id == FAKE_USER.id)
            .first()
            is None
        )
    finally:
        db.close()
