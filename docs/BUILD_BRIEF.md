# PileIt build brief (reference)

The canonical product and UX specification lives in the repository PDF:

**[`pileit-cursor-brief.pdf`](../pileit-cursor-brief.pdf)** (repo root)

Use it for navigation patterns, account types, admin panel scope, theme tokens, and page-level requirements. This file exists so agents and contributors know where to look without duplicating the full brief.

## Stack (summary)

- **Web:** Next.js 14 App Router, TypeScript, MUI v5, Framer Motion, react-slick, Video.js  
- **API:** FastAPI, SQLAlchemy, JWT (access + refresh), SQLite default / PostgreSQL in production  
- **Money:** BSD; KemisPay integration planned (see CHANGELOG for current state)

## Account types (non-negotiable per brief)

- **Viewer** — default on sign-up; browse, tip, subscribe, pile, chat  
- **Creator** — application + admin approval; channel, uploads, storefront, earnings  
- **Admin** — `/admin`; applications, users, platform stats (moderation queue TBD)

## Related paths in this repo

- Web auth: [`apps/web/src/providers/AuthProvider.tsx`](../apps/web/src/providers/AuthProvider.tsx)  
- Admin UI: [`apps/web/src/app/(site)/admin/page.tsx`](../apps/web/src/app/(site)/admin/page.tsx)  
- Admin API: [`backend/app/routers/admin.py`](../backend/app/routers/admin.py)
