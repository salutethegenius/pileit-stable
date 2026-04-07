# PileIt (alpha)

Bahamian-first streaming and creator economy platform: Netflix-style browse, creator channels, **The Pile** (text / voice / video replies + live chat on the watch page), KemisPay for tips, subscriptions, and shop checkout.

## Structure

- **`apps/web`** — Next.js 15 (App Router), MUI v5, Framer Motion, react-slick, Video.js
- **`backend`** — FastAPI, SQLAlchemy, JWT auth, SQLite by default (set `DATABASE_URL` for PostgreSQL). **Money is BSD** (Bahamian dollars) everywhere tips, subs, and shop amounts are shown or accepted.
- **`services/webrtc-rtmp-gateway`** — Node service: browser → LiveKit → RTMP → Mux (see [`docs/staging-readiness.md`](docs/staging-readiness.md)).
- **`pileit-brand-01.jsx`** — brand lab reference (production components live under `apps/web/src/components/brand/`)

## Quick start

### Portless (recommended — stable URLs, no port clashes)

Requires **Node.js 20+** and a **global** install (per [portless](https://port1355.dev/) docs):

```bash
npm install -g portless
```

From the repo root, use **two terminals**:

1. **API:** `npm run dev:api` — serves FastAPI via `http://pileit-api.localhost:1355` (proxy forwards to an ephemeral port).
2. **Web:** `npm run dev:web` — Next.js via `http://pileit-web.localhost:1355`.

Copy env examples so the browser calls the named API host:

- `apps/web/.env.local` — use `NEXT_PUBLIC_API_URL=http://pileit-api.localhost:1355` (see `apps/web/.env.example`).
- `backend/.env` — extend `CORS_ORIGINS` with `http://pileit-web.localhost:1355` (see `backend/.env.example`). The backend default `cors_origins` already includes these hosts if you omit `.env`.

Escape hatch without portless: `npm run dev:direct --prefix apps/web` and run uvicorn on `8000` as below.

### API (direct / no portless)

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # optional
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Seeded logins (after first boot): `admin@pileit.bs` / `admin123`, `viewer@pileit.bs` / `viewer123`, creators e.g. `jaydenfox@pileit.bs` / `creator123`. New accounts apply at `/creator/apply`; tips/subs require admin-approved KYC + payout setup (see CHANGELOG). KYC files land under `backend/uploads/` (gitignored).

### Web (direct / no portless)

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev:direct
```

Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` when the API listens on port 8000. The UI still includes Bahamian mock data for offline layout demos; wire pages to `/videos`, `/creators`, etc. as you harden data fetching.

**Product spec:** see [`pileit-cursor-brief.pdf`](pileit-cursor-brief.pdf) and [`docs/BUILD_BRIEF.md`](docs/BUILD_BRIEF.md).

## Deploy (Railway API + Vercel web)

### Railway (FastAPI + PostgreSQL)

1. Create a project from GitHub repo [salutethegenius/pileit-stable](https://github.com/salutethegenius/pileit-stable).
2. Add a **PostgreSQL** database; link it to the API service so **`DATABASE_URL`** is set automatically.
3. Create a **service** from the same repo, set **Root Directory** to **`backend`** (so `railway.toml` applies).
4. In the service **Variables**, set at least:
   - **`JWT_SECRET`** / **`JWT_REFRESH_SECRET`** — strong random strings (not the dev defaults).
   - **`CORS_ORIGINS`** — comma-separated origins that may call the API, e.g. `https://your-app.vercel.app,https://yourdomain.com`.
   - **`PUBLIC_WEB_URL`** — public site URL (no trailing slash), e.g. `https://your-app.vercel.app`.
   - **`API_PUBLIC_URL`** — public API URL (no trailing slash), e.g. `https://your-api.up.railway.app`.
   - **`MUX_TOKEN_ID`** / **`MUX_TOKEN_SECRET`** — Mux Video; **`MUX_WEBHOOK_SECRET`** for signed webhooks.
   - **`LIVE_GATEWAY_SHARED_SECRET`** / **`LIVE_BROWSER_INGEST_SECRET`** — same values on the **`webrtc-rtmp-gateway`** Railway service (browser live).
   - Copy the rest from **`backend/.env.example`** (KemisPay, Meta, etc.) as you enable those integrations.

The API exposes **`GET /health`** for Railway’s health check. Tables are created on boot via SQLAlchemy; use a strong Postgres password and restrict access to the DB service.

**Mux webhooks:** In the Mux dashboard, point the webhook URL to **`https://<your-api-host>/mux/webhook`** (never localhost in production).

### Railway (browser live gateway)

1. Add another **service** from the repo; set **Root Directory** to **`services/webrtc-rtmp-gateway`**.
2. Use the **`Dockerfile`** in that folder (or Nixpacks with `npm start` / `node src/server.js`).
3. Set variables from **`services/webrtc-rtmp-gateway/.env.example`**. **`PILEIT_API_URL`** must be your public Railway API base. Assign a **public domain** for the gateway.
4. On Vercel, set **`NEXT_PUBLIC_PILEIT_LIVE_GATEWAY_URL`** to that gateway URL (no trailing slash).

Full tables + 12-step mobile E2E: **[`docs/staging-readiness.md`](docs/staging-readiness.md)** and **[`docs/staging-browser-live-e2e.md`](docs/staging-browser-live-e2e.md)**.

### Vercel (Next.js)

1. Import the same GitHub repo in Vercel.
2. Set **Root Directory** to **`apps/web`** (Framework: Next.js; `vercel.json` marks the framework explicitly).
3. Add **`NEXT_PUBLIC_SITE_URL`** = your live site origin (HTTPS, no trailing slash) for canonical URLs, Open Graph, `sitemap.xml`, and `robots.txt`.
4. Add **`NEXT_PUBLIC_API_URL`** = your Railway API base URL (e.g. `https://your-api.up.railway.app`, no trailing slash).
5. Optional: **`API_URL`** — same as the API URL but **server-only**; use when `NEXT_PUBLIC_API_URL` is unset or sitemap/SSR fetches must hit a private URL.
6. Set **`NEXT_PUBLIC_KEMISPAY_PUBLIC_KEY`** and any other vars from **`apps/web/.env.example`**.
7. **`NEXT_PUBLIC_PILEIT_LIVE_GATEWAY_URL`** — public Railway URL for **`services/webrtc-rtmp-gateway`** (browser live).

After deploy, confirm the browser can reach the API (CORS must include your Vercel URL) and that login/API calls succeed.

## Verification (before a release)

From the repo root (no `npm install` at root required):

```bash
npm run verify          # lint + TypeScript + production build (apps/web only)
npm run verify:all      # web verify + backend compile + import check (needs backend .venv)
```

If `next build` fails with odd page errors, remove `apps/web/.next` and run `npm run verify` again.

## Base UI reference

Netflix clone used as a porting reference: [jason-liu22/netflix-clone-react-typescript](https://github.com/jason-liu22/netflix-clone-react-typescript).
