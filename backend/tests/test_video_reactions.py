"""Video reactions: like/dislike toggle, count maintenance, unique constraint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app import models
from app.deps import get_current_user, get_current_user_optional

FAKE_USER = models.User(
    id="test-reactor-001",
    email="reactor@test.pileit",
    password_hash="fakehash",
    display_name="Reactor",
    handle="reactor",
    account_type="viewer",
)


def _override_current_user():
    return FAKE_USER


def _override_current_user_optional():
    return FAKE_USER


app.dependency_overrides[get_current_user] = _override_current_user
app.dependency_overrides[get_current_user_optional] = _override_current_user_optional

client = TestClient(app)


def _ensure_video():
    db = SessionLocal()
    try:
        v = db.get(models.Video, "vid-react-test")
        if not v:
            creator = db.get(models.User, "creator-react-test")
            if not creator:
                creator = models.User(
                    id="creator-react-test",
                    email="creator@test.pileit",
                    password_hash="fakehash",
                    display_name="Creator",
                    handle="creatortest",
                    account_type="creator",
                )
                db.add(creator)
                db.flush()
            v = models.Video(
                id="vid-react-test",
                creator_id=creator.id,
                title="Reaction Test Video",
                status="published",
            )
            db.add(v)
            db.commit()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _setup_teardown():
    _ensure_video()
    yield
    db = SessionLocal()
    try:
        db.query(models.VideoReaction).filter(
            models.VideoReaction.user_id == FAKE_USER.id
        ).delete(synchronize_session=False)
        v = db.get(models.Video, "vid-react-test")
        if v:
            v.like_count = 0
            v.dislike_count = 0
        db.commit()
    finally:
        db.close()


def test_like_creates_reaction():
    r = client.post("/videos/vid-react-test/like")
    assert r.status_code == 200
    data = r.json()
    assert data["liked"] is True
    assert data["disliked"] is False
    assert data["like_count"] == 1
    assert data["dislike_count"] == 0


def test_like_toggle_removes_reaction():
    client.post("/videos/vid-react-test/like")
    r = client.post("/videos/vid-react-test/like")
    assert r.status_code == 200
    data = r.json()
    assert data["liked"] is False
    assert data["like_count"] == 0


def test_switch_from_like_to_dislike():
    client.post("/videos/vid-react-test/like")
    r = client.post("/videos/vid-react-test/dislike")
    assert r.status_code == 200
    data = r.json()
    assert data["liked"] is False
    assert data["disliked"] is True
    assert data["like_count"] == 0
    assert data["dislike_count"] == 1


def test_get_reaction_reflects_current_state():
    client.post("/videos/vid-react-test/like")
    r = client.get("/videos/vid-react-test/reaction")
    assert r.status_code == 200
    data = r.json()
    assert data["liked"] is True
    assert data["disliked"] is False


def test_get_video_includes_reaction_fields():
    r = client.get("/videos/vid-react-test")
    assert r.status_code == 200
    data = r.json()
    assert "like_count" in data
    assert "dislike_count" in data
    assert "user_liked" in data
    assert "user_disliked" in data
    assert "viewer_follows" in data


def test_like_nonexistent_video_404():
    r = client.post("/videos/does-not-exist/like")
    assert r.status_code == 404


def test_pile_accepts_limit_param():
    r = client.get("/videos/vid-react-test/pile?limit=2")
    assert r.status_code == 200
    assert isinstance(r.json(), list)
