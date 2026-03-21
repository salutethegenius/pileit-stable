# PileIt (alpha)

Bahamian-first streaming and creator economy platform: Netflix-style browse, creator channels, **The Pile** (text / voice / video replies + live chat on the watch page), KemisPay for tips, subscriptions, and shop checkout.

## Structure

- **`apps/web`** — Next.js 14 (App Router), MUI v5, Framer Motion, react-slick, Video.js
- **`backend`** — FastAPI, SQLAlchemy, JWT auth, SQLite by default (set `DATABASE_URL` for PostgreSQL). **Money is BSD** (Bahamian dollars) everywhere tips, subs, and shop amounts are shown or accepted.
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

## Verification (before a release)

From the repo root (no `npm install` at root required):

```bash
npm run verify          # lint + TypeScript + production build (apps/web only)
npm run verify:all      # web verify + backend compile + import check (needs backend .venv)
```

If `next build` fails with odd page errors, remove `apps/web/.next` and run `npm run verify` again.

## Base UI reference

Netflix clone used as a porting reference: [jason-liu22/netflix-clone-react-typescript](https://github.com/jason-liu22/netflix-clone-react-typescript).
