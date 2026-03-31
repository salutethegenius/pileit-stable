import os
from pathlib import Path
from os.path import isabs

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Relative sqlite paths are resolved to this package's parent (`backend/`) so cwd does not
    # change which file is used (fixes missing admin rows when uvicorn is started from repo root).
    database_url: str = "sqlite:///./pileit.db"
    jwt_secret: str = "dev-change-me-in-production"
    jwt_refresh_secret: str = "dev-refresh-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://pileit-web.localhost:1355,http://127.0.0.1:1355"
    )
    # Optional regex (e.g. ^https://.*\\.vercel\\.app$) merged with allow_origins for previews.
    cors_origin_regex: str = ""
    kemispay_api_url: str = "https://api.kemispay.com"
    kemispay_secret_key: str = "sk_test_stub"
    platform_fee_tips: float = 0.15
    platform_fee_store: float = 0.10
    # KYC uploads (created under this directory when running uvicorn from `backend/`)
    upload_dir: str = "uploads"
    # Public web origin for claim redirects (no trailing slash)
    public_web_url: str = "http://localhost:3000"
    # Absolute API URL for claim verification emails / logs (no trailing slash)
    api_public_url: str = "http://127.0.0.1:8000"
    # Meta / Instagram claim verification (optional until wired in production)
    meta_app_secret: str = ""
    meta_instagram_access_token: str = ""
    meta_instagram_business_account_id: str = ""
    meta_webhook_verify_token: str = ""
    # Instagram username shown in “DM @…” instructions (no @)
    pileit_instagram_username: str = "PileItOfficial"
    # Mux Video — Direct Upload (browser → signed URL) + Live Streams.
    mux_token_id: str = ""
    mux_token_secret: str = ""
    # Mux webhook signing secret (Dashboard → Webhooks). Optional; verification skipped if empty.
    mux_webhook_secret: str = ""
    # WebRTC browser live → LiveKit egress → Mux: shared secret for services/webrtc-rtmp-gateway → API.
    live_gateway_shared_secret: str = ""
    # HS256 secret for short-lived JWTs (browser → gateway only). If empty, falls back to jwt_secret (dev only).
    live_browser_ingest_secret: str = ""
    # Optional S3-compatible bucket (e.g. Railway Buckets — private; serve via GET /public-files/…).
    # Wire Railway variable references: BUCKET, ENDPOINT, REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY.
    s3_bucket: str = Field(
        default="",
        validation_alias=AliasChoices(
            "BUCKET",
            "AWS_S3_BUCKET_NAME",
            "PILEIT_S3_BUCKET",
        ),
    )
    s3_endpoint_url: str = Field(
        default="",
        validation_alias=AliasChoices(
            "ENDPOINT",
            "AWS_ENDPOINT_URL",
            "S3_ENDPOINT",
            "PILEIT_S3_ENDPOINT",
        ),
    )
    s3_region: str = Field(
        default="auto",
        validation_alias=AliasChoices(
            "REGION",
            "AWS_DEFAULT_REGION",
            "AWS_REGION",
            "S3_REGION",
            "PILEIT_S3_REGION",
        ),
    )
    s3_access_key_id: str = Field(
        default="",
        validation_alias=AliasChoices(
            "ACCESS_KEY_ID",
            "AWS_ACCESS_KEY_ID",
            "PILEIT_S3_ACCESS_KEY_ID",
        ),
    )
    s3_secret_access_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "SECRET_ACCESS_KEY",
            "AWS_SECRET_ACCESS_KEY",
            "PILEIT_S3_SECRET_ACCESS_KEY",
        ),
    )
    # Railway docs: virtual-hosted (default) vs path-style; credentials UI may indicate which.
    s3_addressing_style: str = Field(
        default="virtual",
        validation_alias=AliasChoices(
            "S3_ADDRESSING_STYLE",
            "PILEIT_S3_ADDRESSING_STYLE",
        ),
    )

    @model_validator(mode="after")
    def reject_default_secrets_in_production(self):
        """Fail fast if production is running with placeholder dev secrets."""
        if not os.getenv("RAILWAY_ENVIRONMENT"):
            return self
        _defaults = {"dev-change-me-in-production", "dev-refresh-change-me"}
        if self.jwt_secret in _defaults or self.jwt_refresh_secret in _defaults:
            raise ValueError(
                "jwt_secret / jwt_refresh_secret must be changed from their "
                "default values in production. Set them as environment variables."
            )
        return self

    @model_validator(mode="after")
    def resolve_sqlite_url(self):
        u = self.database_url.strip()
        # Heroku / Railway-style URLs use postgres://; SQLAlchemy expects postgresql://
        if u.startswith("postgres://"):
            u = "postgresql://" + u[len("postgres://") :]
            self.database_url = u
        # Railway Postgres expects TLS; without sslmode, connections can hang until timeout.
        if u.startswith("postgresql") and os.getenv("RAILWAY_ENVIRONMENT") and "sslmode=" not in u:
            sep = "&" if "?" in u else "?"
            u = f"{u}{sep}sslmode=require"
            self.database_url = u
        if not u.lower().startswith("sqlite:"):
            return self
        prefix = "sqlite:///"
        if not u.startswith(prefix):
            return self
        rest = u[len(prefix) :]
        if not rest or isabs(rest):
            return self
        path = (_BACKEND_DIR / rest.lstrip("./")).resolve()
        self.database_url = f"sqlite:///{path.as_posix()}"
        return self


settings = Settings()
