# Security

## Reporting

Report security issues through a private channel to the maintainers (do not open public issues for undisclosed vulnerabilities).

## Historical incidents and rotation

When repository files contained real third-party secrets (for example Meta / Instagram app credentials in `.env.example`), treat them as **compromised** if they were ever used with a live app:

1. **Rotate** the secret in the vendor console (Meta Developer Dashboard, etc.).
2. **Record** the date and scope here (no secret values).

| Date | Credential | Reason | Rotated by |
|------|------------|--------|------------|
| _Add a row when you rotate a live secret._ | | | |

**Repository cleanup (not a rotation event by itself):** `backend/.env.example` now uses obvious Meta/Instagram placeholders. **Git history may still contain older concrete-looking values.** If those ever matched a **live** Meta app, rotate **META_APP_SECRET** (and any other exposed tokens) in [Meta Developer](https://developers.facebook.com/) and add a row to the table above (no secret values in the repo).

Git history may still contain old values even after file cleanup; rotation in the vendor console remains the remediation when a live secret was exposed.

## Dependency auditing

CI runs `python -m pip_audit -r requirements.txt` in `backend/` (after `pip install -r requirements.txt`) and `npm audit --audit-level=high` in `apps/web/` after `npm ci`. Both steps are **blocking** on failure. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

The web app pins **Next.js 15.5.x** (and matching `eslint-config-next`) so `npm audit --audit-level=high` stays clean; keep upgrades on a regular cadence.
