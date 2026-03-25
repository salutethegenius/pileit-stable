import logging
import os
import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app import models
from app.security import hash_password

logger = logging.getLogger(__name__)

CLAIM_DEMO_HANDLE = "pileitunclaimed"

# Local/dev demo admin (README). Restored on startup for SQLite when not running on Railway.
DEMO_ADMIN_EMAIL = "admin@pileit.bs"
DEMO_ADMIN_PASSWORD = "admin123"
DEMO_ADMIN_HANDLE = "pileitadmin"

DEMO_MP4 = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"

# Public Mux demo asset (VOD) for local/dev playback via Mux Player
DEMO_MUX_PLAYBACK_ID = "EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC200RI6lNxnhs"

# Previous single thumbnail for all core rows — used to backfill older Postgres seeds.
LEGACY_UNIFIED_THUMB = (
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac"
    "?auto=format&fit=crop&w=640&h=360&q=68"
)


def _unsplash(photo_id: str, w: int = 640, h: int = 360) -> str:
    return (
        f"https://images.unsplash.com/{photo_id}"
        f"?auto=format&fit=crop&w={w}&h={h}&q=68"
    )


def seed_if_empty(db: Session) -> None:
    if db.query(models.User).first():
        return

    admin = models.User(
        id="admin-1",
        email=DEMO_ADMIN_EMAIL,
        password_hash=hash_password(DEMO_ADMIN_PASSWORD),
        display_name="Platform Admin",
        handle=DEMO_ADMIN_HANDLE,
        account_type="admin",
    )
    db.add(admin)

    creators_data = [
        ("c1", "jaydenfox@pileit.bs", "Jayden Fox", "jaydenfox", "Comedy"),
        ("c2", "amara@pileit.bs", "Amara Wells", "amarawells", "Lifestyle"),
        ("c3", "dario@pileit.bs", "Dario King", "darioking", "Music"),
        ("c4", "tiana@pileit.bs", "Tiana Moss", "tianamoss", "Food"),
        ("c5", "marcus@pileit.bs", "Marcus B", "marcusb", "Sports"),
        ("c6", "kezia@pileit.bs", "Kezia Cole", "keziacole", "Fashion"),
    ]
    for uid, email, name, handle, cat in creators_data:
        u = models.User(
            id=uid,
            email=email,
            password_hash=hash_password("creator123"),
            display_name=name,
            handle=handle,
            account_type="creator",
        )
        db.add(u)
        db.add(
            models.CreatorProfile(
                user_id=uid,
                verified=True,
                category=cat,
                subscription_price=Decimal("4.99") if uid == "c1" else Decimal("5.99"),
                banner_color="#f97316",
                monetization_eligible=True,
                payout_status="approved",
            )
        )

    viewer = models.User(
        id="viewer-1",
        email="viewer@pileit.bs",
        password_hash=hash_password("viewer123"),
        display_name="Test Viewer",
        handle="testviewer",
        account_type="viewer",
    )
    db.add(viewer)

    # Photo IDs aligned with apps/web/src/data/mock.ts (U.*) for consistent art.
    videos = [
        (
            "v1",
            "c1",
            "Nassau Streets Be Different",
            "A love letter to the quirks of downtown Nassau.",
            False,
            "Comedy",
            "photo-1529156069898-49953e39b3ac",
            272,
            12400,
        ),
        (
            "v2",
            "c2",
            "My Morning Routine in Paradise",
            "Sunrise coffee and a walk on the sand.",
            True,
            "Lifestyle",
            "photo-1507525428034-b723cf961d3e",
            1100,
            9100,
        ),
        (
            "v3",
            "c3",
            "Harbour Nights (New Track)",
            "Live session from the harbour.",
            True,
            "Music",
            "photo-1493225457124-a3eb161ffa5f",
            227,
            31800,
        ),
        (
            "v4",
            "c4",
            "Cooking Conch Salad from Scratch",
            "Family recipe and market run.",
            False,
            "Food",
            "photo-1546069901-ba9599a7e63c",
            1334,
            7100,
        ),
        (
            "v5",
            "c5",
            "Bahamas vs Caribbean: Who Balling?",
            "Hot takes and stats.",
            False,
            "Sports",
            "photo-1574629810360-7efbbe195018",
            665,
            19000,
        ),
        (
            "v6",
            "c6",
            "Spring Collection Drop 2024",
            "Island tailoring in Freeport.",
            False,
            "Fashion",
            "photo-1445205170230-053b83016050",
            521,
            24600,
        ),
    ]
    for vid, cid, title, desc, locked, cat, photo_id, duration, views in videos:
        db.add(
            models.Video(
                id=vid,
                creator_id=cid,
                title=title,
                description=desc,
                is_locked=locked,
                category=cat,
                status="published",
                duration_seconds=duration,
                view_count=views,
                video_url=DEMO_MP4,
                playback_id=DEMO_MUX_PLAYBACK_ID,
                thumbnail_url=_unsplash(photo_id),
            )
        )

    # PostgreSQL enforces FKs at flush time; without an explicit flush, SQLAlchemy may
    # emit live_chat_messages / pile_comments before videos in one commit batch.
    db.flush()

    db.add(
        models.PileComment(
            video_id="v1",
            user_id="viewer-1",
            comment_type="text",
            content="This is pure Nassau energy — laughed the whole way through.",
            like_count=12,
        )
    )

    db.add(
        models.LiveChatMessage(
            video_id="v1",
            user_id="viewer-1",
            body="Harbour view crew in the chat!",
        )
    )

    db.commit()


# v7–v25: matches mock catalog IDs so /watch/v7… and SSR fetches succeed when the API is live.
# Tuple: id, creator_id, title, description, is_locked, category, unsplash_photo_id, duration_seconds, view_count
_EXTRA_DEMO_VIDEOS = [
    (
        "v7",
        "c1",
        "Island Traffic Chronicles",
        "More comedy from downtown Nassau.",
        False,
        "Comedy",
        "photo-1529156069898-49953e39b3ac",
        412,
        9800,
    ),
    (
        "v8",
        "c1",
        "Open Mic at Arawak Cay",
        "Crowd work and island crowd energy.",
        True,
        "Comedy",
        "photo-1529156069898-49953e39b3ac",
        318,
        15200,
    ),
    (
        "v9",
        "c1",
        "Conch Salad Jokes Vol. 2",
        "Fresh bits from the market line.",
        False,
        "Comedy",
        "photo-1546069901-ba9599a7e63c",
        245,
        6200,
    ),
    (
        "v10",
        "c1",
        "When Your Cousin Visits Nassau",
        "Family stories that hit too close.",
        False,
        "Comedy",
        "photo-1445205170230-053b83016050",
        384,
        22100,
    ),
    (
        "v11",
        "c1",
        "Skits from the Fish Fry",
        "Late-night energy by the water.",
        False,
        "Comedy",
        "photo-1529156069898-49953e39b3ac",
        501,
        8700,
    ),
    (
        "v12",
        "c3",
        "Junkanoo Drums in the Yard",
        "Rhythm session in the neighbourhood.",
        False,
        "Music",
        "photo-1493225457124-a3eb161ffa5f",
        198,
        14200,
    ),
    (
        "v13",
        "c3",
        "Sunset Freestyle (Acoustic)",
        "Strings and salt air.",
        True,
        "Music",
        "photo-1507525428034-b723cf961d3e",
        256,
        18900,
    ),
    (
        "v14",
        "c3",
        "Studio Session: Island Soul",
        "Tracking vocals and grooves.",
        False,
        "Music",
        "photo-1493225457124-a3eb161ffa5f",
        340,
        11200,
    ),
    (
        "v15",
        "c3",
        "Cable Beach Afterparty Set",
        "DJ set recap from the strip.",
        False,
        "Music",
        "photo-1493225457124-a3eb161ffa5f",
        289,
        25600,
    ),
    (
        "v16",
        "c3",
        "Steel Pan on the Dock",
        "Sunset pan by the water.",
        False,
        "Music",
        "photo-1507525428034-b723cf961d3e",
        176,
        7400,
    ),
    (
        "v17",
        "c2",
        "Slow Sunday: Exuma Blues",
        "Reset day on the cays.",
        False,
        "Lifestyle",
        "photo-1507525428034-b723cf961d3e",
        620,
        13400,
    ),
    (
        "v18",
        "c2",
        "Home Tour — Coastal Minimal",
        "Spaces that breathe with the tide.",
        True,
        "Lifestyle",
        "photo-1507525428034-b723cf961d3e",
        445,
        20100,
    ),
    (
        "v19",
        "c2",
        "Skincare in Humid Island Air",
        "Routine that survives August.",
        False,
        "Lifestyle",
        "photo-1507525428034-b723cf961d3e",
        312,
        9600,
    ),
    (
        "v20",
        "c2",
        "Coffee & Journaling by the Marina",
        "Morning pages with a harbour view.",
        False,
        "Lifestyle",
        "photo-1546069901-ba9599a7e63c",
        268,
        11800,
    ),
    (
        "v21",
        "c2",
        "Packing for a Weekend in Bimini",
        "Bags, boats, and a light carry-on.",
        False,
        "Lifestyle",
        "photo-1574629810360-7efbbe195018",
        356,
        8300,
    ),
    (
        "v22",
        "c5",
        "Beach Run Club: Nassau Chapter",
        "Miles with the crew at dawn.",
        False,
        "Sports",
        "photo-1574629810360-7efbbe195018",
        412,
        5600,
    ),
    (
        "v23",
        "c4",
        "Fish Fry Taste Test",
        "Sampling the strip, one stall at a time.",
        False,
        "Food",
        "photo-1546069901-ba9599a7e63c",
        298,
        10200,
    ),
    (
        "v24",
        "c5",
        "Court Vision: Summer League",
        "Highlights and hustle in the heat.",
        False,
        "Sports",
        "photo-1574629810360-7efbbe195018",
        524,
        7800,
    ),
    (
        "v25",
        "c6",
        "Resort Strip Lookbook",
        "Island tailoring on the runway.",
        False,
        "Fashion",
        "photo-1445205170230-053b83016050",
        387,
        16500,
    ),
]

_CORE_DEMO_THUMB_PHOTO: dict[str, str] = {
    "v1": "photo-1529156069898-49953e39b3ac",
    "v2": "photo-1507525428034-b723cf961d3e",
    "v3": "photo-1493225457124-a3eb161ffa5f",
    "v4": "photo-1546069901-ba9599a7e63c",
    "v5": "photo-1574629810360-7efbbe195018",
    "v6": "photo-1445205170230-053b83016050",
}


def backfill_core_demo_thumbnails(db: Session) -> None:
    """Older deployments used one Unsplash URL for v1–v6; restore distinct thumbs in place."""
    changed = False
    for vid, photo_id in _CORE_DEMO_THUMB_PHOTO.items():
        v = db.get(models.Video, vid)
        if v and v.thumbnail_url == LEGACY_UNIFIED_THUMB:
            v.thumbnail_url = _unsplash(photo_id)
            changed = True
    if changed:
        db.commit()


def ensure_extra_demo_videos(db: Session) -> None:
    """Insert v7–v25 when missing so API matches web mock IDs (stops GET /videos/v7 404 noise)."""
    if not db.query(models.User).filter(models.User.id == "c1").first():
        return
    added = False
    for row in _EXTRA_DEMO_VIDEOS:
        vid, cid, title, desc, locked, cat, photo_id, duration, views = row
        if db.get(models.Video, vid):
            continue
        db.add(
            models.Video(
                id=vid,
                creator_id=cid,
                title=title,
                description=desc,
                is_locked=locked,
                category=cat,
                status="published",
                duration_seconds=duration,
                view_count=views,
                video_url=DEMO_MP4,
                playback_id=DEMO_MUX_PLAYBACK_ID,
                thumbnail_url=_unsplash(photo_id),
            )
        )
        added = True
    if added:
        db.commit()


def ensure_local_demo_admin(db: Session, *, database_url: str) -> None:
    """
    Idempotently ensure the README demo admin exists with a known password on local SQLite.

    Skips on Railway (production) and on non-SQLite databases unless you need this elsewhere.
    """
    if (os.getenv("RAILWAY_ENVIRONMENT") or "").strip():
        return
    url = (database_url or "").strip().lower()
    if not url.startswith("sqlite:"):
        return

    u = db.query(models.User).filter(models.User.email == DEMO_ADMIN_EMAIL).first()
    if u:
        u.account_type = "admin"
        u.password_hash = hash_password(DEMO_ADMIN_PASSWORD)
        u.display_name = "Platform Admin"
        db.add(u)
        db.commit()
        logger.info(
            "Local SQLite: demo admin %s password reset to README default",
            DEMO_ADMIN_EMAIL,
        )
        return

    uid = "admin-1"
    if db.get(models.User, uid) is not None:
        uid = str(uuid.uuid4())

    handle = DEMO_ADMIN_HANDLE
    if (
        db.query(models.User)
        .filter(models.User.handle == DEMO_ADMIN_HANDLE)
        .first()
    ):
        handle = None

    db.add(
        models.User(
            id=uid,
            email=DEMO_ADMIN_EMAIL,
            password_hash=hash_password(DEMO_ADMIN_PASSWORD),
            display_name="Platform Admin",
            handle=handle,
            account_type="admin",
        )
    )
    db.commit()
    logger.info(
        "Local SQLite: ensured demo admin at %s (password reset to README default)",
        DEMO_ADMIN_EMAIL,
    )


def ensure_claim_demo_stub(db: Session) -> None:
    """Idempotent: one unclaimed channel for claim-flow demos (safe on non-empty DB)."""
    if db.query(models.User).filter(models.User.handle == CLAIM_DEMO_HANDLE).first():
        return
    uid = str(uuid.uuid4())
    email = f"unclaimed+{CLAIM_DEMO_HANDLE}@stub.pileit.local"
    u = models.User(
        id=uid,
        email=email,
        password_hash=hash_password(uuid.uuid4().hex),
        display_name="Demo Unclaimed Creator",
        handle=CLAIM_DEMO_HANDLE,
        account_type="creator",
        bio="This is a demo unclaimed channel — use Claim this page to try the flow.",
    )
    db.add(u)
    db.add(
        models.CreatorProfile(
            user_id=uid,
            verified=False,
            category="Demo",
            banner_color="#6366f1",
            monetization_eligible=False,
            payout_status="not_started",
            claim_status="unclaimed",
            verification_social_method="instagram",
        )
    )
    db.commit()
