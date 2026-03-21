from pathlib import Path
from os.path import isabs

from pydantic import model_validator
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

    @model_validator(mode="after")
    def resolve_sqlite_url(self):
        u = self.database_url.strip()
        # Heroku / Railway-style URLs use postgres://; SQLAlchemy expects postgresql://
        if u.startswith("postgres://"):
            u = "postgresql://" + u[len("postgres://") :]
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
