import logging
import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.db_migrate import migrate_postgres, migrate_sqlite
from app.seed import (
    backfill_core_demo_thumbnails,
    ensure_claim_demo_stub,
    ensure_extra_demo_videos,
    ensure_local_demo_admin,
    seed_if_empty,
)
from app.routers import (
    admin,
    auth,
    channel_claim,
    creators,
    dashboard,
    follows,
    kemispay,
    live_gateway_internal,
    live_streams,
    meta_webhook,
    mux_webhook,
    pile,
    public_files,
    reports,
    site,
    social_meta,
    store,
    subscriptions,
    tips,
    usage,
    users,
    video_import,
    videos,
)

logger = logging.getLogger(__name__)


_LOCAL_DEV_ORIGINS_ALWAYS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://pileit-web.localhost:1355",
    "http://127.0.0.1:1355",
)


def _cors_allow_origins() -> list[str]:
    """Comma-separated CORS_ORIGINS plus PUBLIC_WEB_URL (normalized), de-duplicated."""
    raw = (settings.cors_origins or "").strip()
    origins = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    extra = settings.public_web_url.strip().rstrip("/")
    if extra and extra not in origins:
        origins.append(extra)
    # Preflight returns 400 "Disallowed CORS origin" if Origin is missing from this list.
    # Locally, .env often lists portless hosts only while Next runs on :3000; merge safe dev origins
    # unless we're on Railway (production API).
    if not (os.getenv("RAILWAY_ENVIRONMENT") or "").strip():
        for o in _LOCAL_DEV_ORIGINS_ALWAYS:
            if o not in origins:
                origins.append(o)
    seen: set[str] = set()
    out: list[str] = []
    for o in origins:
        if o not in seen:
            seen.add(o)
            out.append(o)
    return out


def _cors_allow_origin_regex() -> str | None:
    """
    Optional regex for dev: portless assigns Next an ephemeral port (e.g. :4862) while the public
    URL is pileit-web.localhost:1355. Browsing http://localhost:<ephemeral> must still pass CORS.
    """
    explicit = (settings.cors_origin_regex or "").strip() or None
    if explicit:
        return explicit
    if (os.getenv("RAILWAY_ENVIRONMENT") or "").strip():
        return None
    # Local only: localhost / 127.0.0.1 on any port + pileit-web.localhost (portless stable URL).
    return (
        r"^http://(pileit-web\.localhost|localhost|127\.0\.0\.1):\d+$"
    )


def _init_database_sync() -> None:
    """Runs after the process binds the port so /health can pass during slow Postgres connects."""
    try:
        Base.metadata.create_all(bind=engine)
        migrate_sqlite(engine)
        migrate_postgres(engine)
        db = SessionLocal()
        try:
            seed_if_empty(db)
            ensure_local_demo_admin(db, database_url=settings.database_url)
            ensure_claim_demo_stub(db)
            ensure_extra_demo_videos(db)
            backfill_core_demo_thumbnails(db)
        finally:
            db.close()
        logger.info("Database initialized and seed complete")
    except Exception:
        logger.exception("Database initialization failed — exiting process")
        os._exit(1)


def _start_db_init_thread() -> None:
    t = threading.Thread(target=_init_database_sync, name="pileit-db-init", daemon=False)
    t.start()


app = FastAPI(title="PileIt API", version="0.1.0")

_cors_origins = _cors_allow_origins()
_cors_regex = _cors_allow_origin_regex()
logger.info(
    "CORS allow_origins=%s allow_origin_regex=%s",
    _cors_origins,
    _cors_regex or "(none)",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    public_files,
    auth,
    users,
    videos,
    video_import,
    live_gateway_internal,
    live_streams,
    mux_webhook,
    channel_claim,
    meta_webhook,
    social_meta,
    creators,
    follows,
    pile,
    reports,
    usage,
    tips,
    subscriptions,
    site,
    store,
    dashboard,
    admin,
    kemispay,
):
    app.include_router(r.router)


@app.get("/health")
def health():
    return {"status": "ok"}


_start_db_init_thread()
