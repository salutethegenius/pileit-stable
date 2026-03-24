import { getApiBase } from "@/lib/api";

/** Backend stores `media/{userId}/avatar.ext` — served at GET /public-files/{path}. */
export function resolveMediaUrl(
  url: string | null | undefined,
  apiBase?: string
): string {
  if (!url) return "";
  if (url.startsWith("media/")) {
    const base = (apiBase ?? getApiBase()).replace(/\/$/, "");
    return `${base}/public-files/${url}`;
  }
  return url;
}
