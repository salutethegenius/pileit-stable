/**
 * Canonical public site origin for metadata, sitemap, robots, and absolute og:image URLs.
 * Prefer NEXT_PUBLIC_SITE_URL in every deployed environment (e.g. https://www.pileit.app).
 */
const PRODUCTION_DEFAULT_ORIGIN = "https://pileit.app";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  if (process.env.NODE_ENV === "production") return PRODUCTION_DEFAULT_ORIGIN;
  return "http://localhost:3000";
}

/** Absolute URL for the default Open Graph / Twitter card image. */
export function getDefaultOgImageUrl(): string {
  return `${getSiteUrl()}/pileit-og-image.png`;
}
