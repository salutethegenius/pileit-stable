import uuid
from decimal import Decimal

from sqlalchemy.orm import Session

from app import models
from app.security import hash_password

CLAIM_DEMO_HANDLE = "pileitunclaimed"


def seed_if_empty(db: Session) -> None:
    if db.query(models.User).first():
        return

    admin = models.User(
        id="admin-1",
        email="admin@pileit.bs",
        password_hash=hash_password("admin123"),
        display_name="Platform Admin",
        handle="pileitadmin",
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

    videos = [
        (
            "v1",
            "c1",
            "Nassau Streets Be Different",
            "A love letter to the quirks of downtown Nassau.",
            False,
            "Comedy",
        ),
        (
            "v2",
            "c2",
            "My Morning Routine in Paradise",
            "Sunrise coffee and a walk on the sand.",
            True,
            "Lifestyle",
        ),
        (
            "v3",
            "c3",
            "Harbour Nights (New Track)",
            "Live session from the harbour.",
            True,
            "Music",
        ),
        (
            "v4",
            "c4",
            "Cooking Conch Salad from Scratch",
            "Family recipe and market run.",
            False,
            "Food",
        ),
        (
            "v5",
            "c5",
            "Bahamas vs Caribbean: Who Balling?",
            "Hot takes and stats.",
            False,
            "Sports",
        ),
        (
            "v6",
            "c6",
            "Spring Collection Drop 2024",
            "Island tailoring in Freeport.",
            False,
            "Fashion",
        ),
    ]
    for vid, cid, title, desc, locked, cat in videos:
        db.add(
            models.Video(
                id=vid,
                creator_id=cid,
                title=title,
                description=desc,
                is_locked=locked,
                category=cat,
                status="published",
                duration_seconds=300,
                view_count=1000,
                video_url="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                thumbnail_url="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=640&h=360&q=68",
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
