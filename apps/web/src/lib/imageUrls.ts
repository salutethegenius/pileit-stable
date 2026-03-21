/**
 * Clamp remote image request size for faster loads (Unsplash supports w/h/q).
 * Other URLs (e.g. GCS) pass through; Next/Image still optimizes them.
 */
const UNSPLASH = "images.unsplash.com";

export function sizedUnsplashUrl(
  url: string,
  w: number,
  h?: number,
  q = 68
): string {
  if (!url || !url.includes(UNSPLASH)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(w));
    if (h != null) u.searchParams.set("h", String(h));
    u.searchParams.set("q", String(q));
    if (!u.searchParams.has("auto")) u.searchParams.set("auto", "format");
    if (!u.searchParams.has("fit")) u.searchParams.set("fit", "crop");
    return u.toString();
  } catch {
    return url;
  }
}

/** Preset widths for common UI slots */
export const IMG = {
  avatar: (url: string) => sizedUnsplashUrl(url, 96, 96, 70),
  /** Carousel / grid video cards (~200–320px CSS width) */
  cardThumb: (url: string) => sizedUnsplashUrl(url, 360, 203, 68),
  /** Hover mini-portal (~1.5× card) */
  portalThumb: (url: string) => sizedUnsplashUrl(url, 520, 293, 70),
  /** Hero / modal banners (max ~1280 CSS) */
  heroBackdrop: (url: string) => sizedUnsplashUrl(url, 1280, 720, 72),
  /** Video.js poster */
  videoPoster: (url: string) => sizedUnsplashUrl(url, 854, 480, 70),
} as const;
