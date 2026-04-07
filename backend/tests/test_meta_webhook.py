"""F03: Meta Instagram webhook must reject unsigned or invalid requests."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_meta_webhook_post_403_when_app_secret_unset():
    with patch("app.routers.meta_webhook.settings") as s:
        s.meta_app_secret = ""
        s.meta_webhook_verify_token = "verify_token"
        r = client.post(
            "/meta/webhook",
            content=b'{"entry":[]}',
            headers={"Content-Type": "application/json"},
        )
    assert r.status_code == 403
    assert r.json()["detail"] == "Forbidden"


def test_meta_webhook_post_403_when_signature_invalid():
    with patch("app.routers.meta_webhook.settings") as s:
        s.meta_app_secret = "not-the-real-secret"
        s.meta_webhook_verify_token = "verify_token"
        r = client.post(
            "/meta/webhook",
            content=b'{"entry":[]}',
            headers={
                "Content-Type": "application/json",
                "X-Hub-Signature-256": "sha256=deadbeef",
            },
        )
    assert r.status_code == 403
    assert r.json()["detail"] == "Invalid signature"
