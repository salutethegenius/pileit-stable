/** Use only absolute HTTPS URLs for og:image / twitter:image (Next/Image remotePatterns). */
export function pickHttpsImage(...candidates: (string | undefined | null)[]): string | undefined {
  for (const u of candidates) {
    if (typeof u === "string" && u.startsWith("https://")) return u;
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
