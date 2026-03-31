from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    handle: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    account_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="viewer"
    )
    accent_color: Mapped[str] = mapped_column(String(16), default="#f97316")
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )

    creator_profile: Mapped[Optional["CreatorProfile"]] = relationship(
        back_populates="user", uselist=False
    )


class CreatorProfile(Base):
    __tablename__ = "creator_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), primary_key=True
    )
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    subscription_price: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    banner_color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    hero_image_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    total_tips_received: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0")
    )
    social_links: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Payouts: tips/subs/store checkout credit this creator only when True (after KYC admin approval).
    monetization_eligible: Mapped[bool] = mapped_column(Boolean, default=False)
    payout_status: Mapped[str] = mapped_column(
        String(32), default="not_started"
    )  # not_started | submitted | approved | rejected
    kyc_id_document_url: Mapped[Optional[str]] = mapped_column(
        String(1024), nullable=True
    )
    kyc_selfie_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    payout_provider: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    payout_account_detail: Mapped[Optional[str]] = mapped_column(
        String(512), nullable=True
    )
    kyc_submitted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    kyc_reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    kyc_reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    monetization_reject_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    # Channel claim (unclaimed stub → email + Instagram DM → intro → live)
    claim_status: Mapped[Optional[str]] = mapped_column(
        String(32), nullable=True
    )  # unclaimed | email_verified | identity_review | social_verified | live
    claim_pending_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    claim_email_token_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    claim_email_token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_social_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    verification_social_method: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    verification_social_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    verification_social_code_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_social_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_social_ig_user_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    verification_email_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_attempt_count_email: Mapped[int] = mapped_column(Integer, default=0)
    verification_attempt_count_social: Mapped[int] = mapped_column(Integer, default=0)
    verification_social_last_attempt_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_email_last_attempt_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    claim_initiated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    claimed_by_user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    user: Mapped["User"] = relationship(back_populates="creator_profile")


class CreatorApplication(Base):
    __tablename__ = "creator_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    social_links: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    channels_json: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    mission_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_plan_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )


class Video(Base):
    __tablename__ = "videos"
    __table_args__ = (
        Index("ix_videos_creator_id", "creator_id"),
        Index("ix_videos_status_created", "status", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    playback_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    mux_upload_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    mux_pending_publish: Mapped[bool] = mapped_column(Boolean, default=False)
    # Mux Live: stream_source vod | mux_live; mux_live_stream_id + mux_live_status from Mux API
    stream_source: Mapped[str] = mapped_column(String(16), default="vod")
    mux_live_stream_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    mux_live_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    tip_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
    # Compact 12-char ISRC for performance-rights usage reporting (PRS / BMI / ASCAP, etc.).
    isrc: Mapped[Optional[str]] = mapped_column(String(12), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class IsrcPlayEvent(Base):
    """One row per qualified play when a video with an ISRC receives a view (for usage reports)."""

    __tablename__ = "isrc_play_events"
    __table_args__ = (
        Index("ix_isrc_play_events_isrc_played", "isrc", "played_at"),
        Index("ix_isrc_play_events_video", "video_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"))
    isrc: Mapped[str] = mapped_column(String(12), nullable=False)
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    country_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)


class VideoViewEvent(Base):
    """Per-view event log used for dedupe and quality controls."""

    __tablename__ = "video_view_events"
    __table_args__ = (
        Index("ix_video_view_events_video_viewed", "video_id", "viewed_at"),
        Index("ix_video_view_events_fingerprint", "fingerprint_hash"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False
    )
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    country_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    fingerprint_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (
        UniqueConstraint("subscriber_id", "creator_id", name="uq_subscription"),
        Index("ix_subscriptions_subscriber", "subscriber_id"),
        Index("ix_subscriptions_creator_status", "creator_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    subscriber_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(32), default="active")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    monthly_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2))


class Tip(Base):
    __tablename__ = "tips"
    __table_args__ = (
        Index("ix_tips_creator_id", "creator_id"),
        Index("ix_tips_sender_id", "sender_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    sender_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    video_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("videos.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    kemispay_tx_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class PileComment(Base):
    __tablename__ = "pile_comments"
    __table_args__ = (
        Index("ix_pile_comments_video_id", "video_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("videos.id", ondelete="CASCADE")
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("pile_comments.id", ondelete="CASCADE"), nullable=True
    )
    comment_type: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class StoreProduct(Base):
    __tablename__ = "store_products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    product_type: Mapped[str] = mapped_column(String(32), default="digital")
    stock_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Watchlist(Base):
    __tablename__ = "watchlist"
    __table_args__ = (UniqueConstraint("user_id", "video_id", name="uq_watch"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id"), primary_key=True)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class CreatorFollow(Base):
    """Free follow (bookmarks / social signal); separate from paid Subscription."""

    __tablename__ = "creator_follows"
    __table_args__ = (
        UniqueConstraint("follower_id", "creator_id", name="uq_creator_follow"),
        Index("ix_creator_follows_creator", "creator_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    follower_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    creator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class LiveChatMessage(Base):
    __tablename__ = "live_chat_messages"
    __table_args__ = (
        Index("ix_live_chat_messages_video_id", "video_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("videos.id", ondelete="CASCADE")
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class RevokedToken(Base):
    """Refresh tokens rejected after logout (hash-only, no raw token stored)."""

    __tablename__ = "revoked_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class ContentReport(Base):
    """User-submitted moderation flags; admin reviews via /admin/moderation."""

    __tablename__ = "content_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    reporter_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    target_type: Mapped[str] = mapped_column(
        String(24), nullable=False
    )  # video | pile_comment | live_chat
    target_id: Mapped[str] = mapped_column(String(36), nullable=False)
    reason: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, default="pending"
    )  # pending | dismissed | resolved
    resolution_action: Mapped[Optional[str]] = mapped_column(
        String(32), nullable=True
    )  # none | unpublish_video | delete_pile | delete_chat
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )


class SiteSetting(Base):
    """Key-value site config (JSON payload)."""

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)


class CreatorAccountDeletionLog(Base):
    """Audit log for reversible creator-account removals by admins."""

    __tablename__ = "creator_account_deletion_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    deleted_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    deleted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow
    )
    restored_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    restored_by: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=True
    )
