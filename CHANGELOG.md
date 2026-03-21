# Changelog

All notable changes to this project are documented here.

## [0.1.0] - 2026-03-21

### Creator onboarding and monetization gates

- **Application portal** at `/creator/apply`: structured channels (URLs), mission, content plan, optional category; `GET /creators/apply/me` for status. Profile + navbar link for viewers.
- **Admin**: expanded creator application rows (channels, mission, plan); **Monetization / KYC** queue with ID/selfie file download, approve/reject; creators table shows `monetization_eligible` and `payout_status`.
- **Payouts**: new creators (post-application approval) are **not** monetized until KYC (ID + selfie) and local payout provider (Cash n Go, Sun Cash, other) are submitted and admin-approved. `POST /tips`, `POST /subscriptions`, and `POST /store/checkout` return **403** with `PAYOUT_SETUP_REQUIRED` until then. Seeded demo creators remain monetized; SQLite migration backfills existing `creator_profiles` rows on first column add.
- **Dashboard**: “Unlock earnings” form uploads KYC artifacts to `backend/uploads/` (see `upload_dir` in config).

### Catalog and data layer

- Wired browse catalog to FastAPI: home (`GET /videos`, `GET /creators`), watch (`GET /videos/{id}`), creator channel (`GET /creators/{handle}`, `/{handle}/videos`) with mock fallbacks when the API is unreachable.
- Detail modal “More from” uses `GET /creators/{handle}/videos` with `AbortController`, stale-response guards, and mock fallback on errors.

### Payments

- KemisPay hosted embed deferred. Tips use `POST /tips` with server-side `charge_amount` (stub when `kemispay_secret_key` is test mode).

### Auth (this release)

- JWT access + refresh: `apiFetch` retries once on 401 after `POST /auth/refresh`.
- Login/register support safe `?next=` redirect; navbar loading state and avatar menu polish.
- Admin panel: `GET /admin/creators` for an all-creators table (brief §6.8 partial).

### Content moderation

- **Reports:** `POST /reports` (auth) for `video`, `pile_comment`, or `live_chat` with reason + optional details; one pending report per user per target.
- **Admin:** `GET /admin/moderation/reports?status=pending|all`, `POST .../dismiss`, `POST .../resolve` with `acknowledge` | `unpublish_video` | `delete_pile` | `delete_chat`.
- **Web:** Report on watch page (video), pile cards, and live chat; admin table under Content moderation.
- Unpublished videos are hidden from public `GET /videos/{id}` unless the requester is the creator or an admin.

### Known limitations

- Backend `POST /auth/logout` does not revoke refresh tokens (no server-side token store yet).
- Moderation has no auto-escalation, strike counts, or appeals workflow yet.
