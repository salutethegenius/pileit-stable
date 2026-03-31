import type { MetadataRoute } from "next";
import { getServerApiBase } from "@/lib/serverCatalog";
import type { ApiCreatorRow } from "@/lib/mapApiCreator";
import type { ApiVideoRow } from "@/lib/mapApiVideo";
import { getSiteUrl } from "@/lib/site";

const STATIC_PATHS = [
  "",
  "/creators",
  "/live",
  "/login",
  "/register",
  "/privacy",
  "/terms",
] as const;

async function fetchCreatorHandles(base: string): Promise<string[]> {
  try {
    const res = await fetch(`${base}/creators`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as ApiCreatorRow[];
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => r.handle).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchVideoIds(base: string): Promise<string[]> {
  try {
    const res = await fetch(`${base}/videos`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as ApiVideoRow[];
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => r.id).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteUrl();
  const base = getServerApiBase();

  const [handles, videoIds] = await Promise.all([
    fetchCreatorHandles(base),
    fetchVideoIds(base),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${origin}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority:
      path === ""
        ? 1
        : path === "/creators"
          ? 0.9
          : 0.7,
  }));

  const creatorEntries: MetadataRoute.Sitemap = handles.map((handle) => ({
    url: `${origin}/creator/${encodeURIComponent(handle)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const watchEntries: MetadataRoute.Sitemap = videoIds.map((id) => ({
    url: `${origin}/watch/${encodeURIComponent(id)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [...staticEntries, ...creatorEntries, ...watchEntries];
}
