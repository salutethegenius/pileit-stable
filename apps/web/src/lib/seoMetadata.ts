/** Use only absolute HTTPS URLs for og:image / twitter:image (Next/Image remotePatterns). */
export function pickHttpsImage(...candidates: (string | undefined | null)[]): string | undefined {
  for (const u of candidates) {
    if (typeof u === "string" && u.startsWith("https://")) return u;
  }
  return undefined;
}

const OG_HTTP_UPGRADE_HOSTS = new Set([
  "images.unsplash.com",
  "storage.googleapis.com",
]);

/**
 * Like `pickHttpsImage`, but upgrades `http://` to `https://` for known image CDN hosts
 * so social crawlers still get a valid og:image when the API stored http URLs.
 */
export function pickHttpsImageForOg(...candidates: (string | undefined | null)[]): string | undefined {
  const https = pickHttpsImage(...candidates);
  if (https) return https;
  for (const u of candidates) {
    if (typeof u !== "string" || !u.startsWith("http://")) continue;
    try {
      const host = new URL(u).hostname;
      if (OG_HTTP_UPGRADE_HOSTS.has(host) || host.endsWith(".storage.googleapis.com")) {
        return `https://${u.slice("http://".length)}`;
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export function truncateMetaDescription(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
}

export function truncateMetaTitle(text: string, max = 58): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
}
