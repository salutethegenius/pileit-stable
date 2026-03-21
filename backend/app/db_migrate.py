"""SQLite-only additive migrations (create_all does not alter existing tables)."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _sqlite_columns(conn, table: str) -> set[str]:
    rows = conn.execute(text(f'PRAGMA table_info("{table}")')).fetchall()
    return {r[1] for r in rows}


def migrate_sqlite(engine: Engine) -> None:
    if engine.dialect.name != "sqlite":
        return
    with engine.begin() as conn:
        # creator_applications
        if inspect(engine).has_table("creator_applications"):
            cols = _sqlite_columns(conn, "creator_applications")
            if "channels_json" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_applications ADD COLUMN channels_json TEXT"
                    )
                )
            if "mission_text" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_applications ADD COLUMN mission_text TEXT"
                    )
                )
            if "content_plan_text" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_applications ADD COLUMN content_plan_text TEXT"
                    )
                )
            if "primary_category" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_applications ADD COLUMN primary_category VARCHAR(64)"
                    )
                )

        # creator_profiles
        if inspect(engine).has_table("creator_profiles"):
            cols = _sqlite_columns(conn, "creator_profiles")
            added_monetization = False
            if "monetization_eligible" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN monetization_eligible BOOLEAN NOT NULL DEFAULT 0"
                    )
                )
                added_monetization = True
            if "payout_status" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN payout_status VARCHAR(32) NOT NULL DEFAULT 'not_started'"
                    )
                )
            if "kyc_id_document_url" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN kyc_id_document_url VARCHAR(1024)"
                    )
                )
            if "kyc_selfie_url" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN kyc_selfie_url VARCHAR(1024)"
                    )
                )
            if "payout_provider" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN payout_provider VARCHAR(32)"
                    )
                )
            if "payout_account_detail" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN payout_account_detail VARCHAR(512)"
                    )
                )
            if "kyc_submitted_at" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN kyc_submitted_at DATETIME"
                    )
                )
            if "kyc_reviewed_at" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN kyc_reviewed_at DATETIME"
                    )
                )
            if "kyc_reviewed_by" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN kyc_reviewed_by VARCHAR(36)"
                    )
                )
            if "monetization_reject_reason" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN monetization_reject_reason TEXT"
                    )
                )
            if "hero_image_url" not in cols:
                conn.execute(
                    text(
                        "ALTER TABLE creator_profiles ADD COLUMN hero_image_url VARCHAR(1024)"
                    )
                )
            claim_cols = [
                ("claim_status", "VARCHAR(32) DEFAULT 'live'"),
                ("claim_pending_email", "VARCHAR(255)"),
                ("claim_email_token_hash", "VARCHAR(64)"),
                ("claim_email_token_expires_at", "DATETIME"),
                ("verification_social_url", "VARCHAR(1024)"),
                ("verification_social_method", "VARCHAR(32) DEFAULT 'instagram'"),
                ("verification_social_code", "VARCHAR(32)"),
                ("verification_social_code_expires_at", "DATETIME"),
                ("verification_social_verified_at", "DATETIME"),
                ("verification_social_ig_user_id", "VARCHAR(64)"),
                ("verification_email_verified_at", "DATETIME"),
                ("verification_attempt_count_email", "INTEGER NOT NULL DEFAULT 0"),
                ("verification_attempt_count_social", "INTEGER NOT NULL DEFAULT 0"),
                ("verification_social_last_attempt_at", "DATETIME"),
                ("verification_email_last_attempt_at", "DATETIME"),
                ("claim_initiated_at", "DATETIME"),
                ("claimed_by_user_id", "VARCHAR(36)"),
            ]
            for col_name, col_def in claim_cols:
                if col_name not in cols:
                    conn.execute(
                        text(f"ALTER TABLE creator_profiles ADD COLUMN {col_name} {col_def}")
                    )
            # One-time backfill: existing creator rows were full creators before monetization gate
            if added_monetization:
                conn.execute(
                    text(
                        "UPDATE creator_profiles SET monetization_eligible = 1, "
                        "payout_status = 'approved'"
                    )
                )
