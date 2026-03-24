/**
 * Demo catalog in `@/data/mock` uses fake video ids (v1, v2, …) and creator handles that
 * are not in production DB. Using those fallbacks when `NODE_ENV === "production"` causes
 * the public site to link to `/watch/v1`, `/creator/jaydenfox`, etc., which spam the API
 * with 404s after demo data is removed.
 *
 * Set `NEXT_PUBLIC_USE_MOCK_CATALOG=true` to force mock fallbacks (e.g. marketing demos).
 */
export function allowMockCatalogFallback(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK_CATALOG === "true") return true;
  return process.env.NODE_ENV !== "production";
}
