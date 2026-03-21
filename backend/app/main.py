import logging
import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.db_migrate import migrate_sqlite
from app.seed import ensure_claim_demo_stub, seed_if_empty
from app.routers import (
    admin,
    auth,
    channel_claim,
    creators,
    dashboard,
    kemispay,
    meta_webhook,
    pile,
    reports,
    store,
    subscriptions,
    tips,
    users,
    videos,
)

logger = logging.getLogger(__name__)


def _init_database_sync() -> None:
    """Runs after the process binds the port so /health can pass during slow Postgres connects."""
    try:
        Base.metadata.create_all(bind=engine)
        migrate_sqlite(engine)
        db = SessionLocal()
        try:
            seed_if_empty(db)
            ensure_claim_demo_stub(db)
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    auth,
    users,
    videos,
    channel_claim,
    meta_webhook,
    creators,
    pile,
    reports,
    tips,
    subscriptions,
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
