# Staging readiness (LiveKit Cloud + browser live)

Operational checklist for **Railway** (FastAPI + `webrtc-rtmp-gateway`), **Vercel** (Next.js), **Mux**, and **LiveKit Cloud**. Use this to verify env vars before the [12-step mobile E2E](./staging-browser-live-e2e.md).

**LiveKit Cloud:** No FFmpeg or manual TURN checklist on your side. **Test browser live on Aliv or BTC LTE**, not WiFi-only.

---

## 1. Railway — FastAPI (`backend/`)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes (prod) | Railway Postgres; `sslmode=require` per backend config |
| `JWT_SECRET` | Yes | Access tokens |
| `JWT_REFRESH_SECRET` | Yes | Refresh tokens |
| `CORS_ORIGINS` | Yes | Comma-separated **Vercel** origins (`https://your-app.vercel.app`, custom domain). No trailing slash |
| `PUBLIC_WEB_URL` | Yes | Same canonical web origin users open (merged into CORS) |
| `API_PUBLIC_URL` | Yes | Public **API** base (`https://your-api.up.railway.app`), no trailing slash |
| `MUX_TOKEN_ID` | Yes | Mux access token |
| `MUX_TOKEN_SECRET` | Yes | |
| `MUX_WEBHOOK_SECRET` | Strongly recommended | Mux Dashboard → Webhooks signing secret for `POST /mux/webhook` |
| `LIVE_GATEWAY_SHARED_SECRET` | Yes (browser live) | Same value on **gateway** service; gateway calls `POST /internal/live-gateway/mux-rtmp` |
| `LIVE_BROWSER_INGEST_SECRET` | Recommended | JWT for browser→gateway; if empty API falls back to `JWT_SECRET` (avoid in prod if you want separation) |
| `RAILWAY_ENVIRONMENT` | Auto | Set by Railway; ensures Postgres TLS behavior |

**Mux webhook URL (staging/production):** Must be **`https://<your-railway-api-host>/mux/webhook`** — not `localhost`. If Step 7 (`video.live_stream.active`) never fires, this is the first place to check.

---

## 2. Railway — `webrtc-rtmp-gateway` (`services/webrtc-rtmp-gateway/`)

Create a **second Railway service**; set **root directory** to `services/webrtc-rtmp-gateway` (or deploy from that path).

| Variable | Required | Notes |
|----------|----------|--------|
| `PORT` | Optional | Railway sets automatically |
| `PILEIT_API_URL` | Yes | `https://<same-or-other-railway-api>` — must reach `/internal/live-gateway/mux-rtmp` |
| `LIVE_GATEWAY_SHARED_SECRET` | Yes | **Identical** to API `LIVE_GATEWAY_SHARED_SECRET` |
| `LIVE_BROWSER_INGEST_SECRET` | Yes | **Identical** to API `LIVE_BROWSER_INGEST_SECRET` (or match `JWT_SECRET` if API uses fallback) |
| `LIVEKIT_URL` | Yes | LiveKit Cloud **HTTP** API host (see LiveKit dashboard) |
| `LIVEKIT_EGRESS_URL` | Often same as Cloud | LiveKit Cloud egress API URL if different from `LIVEKIT_URL` |
| `LIVEKIT_API_KEY` | Yes | |
| `LIVEKIT_API_SECRET` | Yes | |
| `LIVEKIT_PUBLIC_WS_URL` | Yes | `wss://…` URL browsers use (LiveKit Cloud) |
| `TURN_*` / `ICE_SERVERS_JSON` | Optional | LiveKit Cloud supplies ICE/TURN; optional extra relay |

**Public URL:** Assign a Railway **public domain** for the gateway. That **HTTPS origin** (no path) is what you set as `NEXT_PUBLIC_PILEIT_LIVE_GATEWAY_URL` on Vercel (`https://gateway-production-xxx.up.railway.app`).

**Health check:** `GET /health` → `{"status":"ok"}`.

---

## 3. Vercel — Next.js (`apps/web/`)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Production site URL (no trailing slash) |
| `NEXT_PUBLIC_API_URL` | Yes\* | FastAPI origin if browser calls API directly; must be in API `CORS_ORIGINS` |
| `API_URL` | Often Yes | Server-side rewrites / ISR; same API base as above |
| `NEXT_PUBLIC_PILEIT_LIVE_GATEWAY_URL` | Yes (browser live) | **Railway gateway** public URL — no trailing slash |
| `NEXT_PUBLIC_KEMISPAY_PUBLIC_KEY` | If tips/checkout | |

\*Or rely on Next rewrites only — match [apps/web/.env.example](../apps/web/.env.example) and your production setup.

---

## 4. Quick verification commands

After deploy:

```bash
# API
curl -sS "https://YOUR_API/health"

# Gateway
curl -sS "https://YOUR_GATEWAY/health"
```

---

## 5. Sign-off

- [ ] All tables above filled in production/staging dashboards  
- [ ] Mux webhook → Railway API `/mux/webhook`  
- [ ] [12-step E2E on carrier LTE](./staging-browser-live-e2e.md) completed (especially steps 7–9)  
