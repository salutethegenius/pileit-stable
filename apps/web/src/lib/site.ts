/**
 * Canonical public site origin for metadata, sitemap, robots, and absolute og:image URLs.
 *
 * Do not use VERCEL_URL here: preview deployment URLs often return HTML to social crawlers
 * (deployment protection, auth splash), which breaks og:image with “invalid content type”.
 * Set NEXT_PUBLIC_SITE_URL on Vercel (e.g. https://pileit.app) so previews still emit valid OG URLs.
 */
const PRODUCTION_DEFAULT_ORIGIN = "https://pileit.app";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return PRODUCTION_DEFAULT_ORIGIN;
  return "http://localhost:3000";
}

/** Absolute URL for the default Open Graph / Twitter card image. */
export function getDefaultOgImageUrl(): string {
  return `${getSiteUrl()}/pileit-og-image.png`;
}
