import type { Creator, PileItVideo } from "@/types/content";
import {
  mapApiVideoDetailToPileItVideo,
  mapApiToPileItVideo,
  type ApiVideoDetailRow,
  type ApiVideoRow,
} from "@/lib/mapApiVideo";
import { mapApiToCreator, type ApiCreatorRow } from "@/lib/mapApiCreator";

export function getServerApiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    process.env.API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000"
  );
}

const REVALIDATE_SEC = 30;

export async function fetchVideoById(id: string): Promise<PileItVideo | null> {
  const base = getServerApiBase();
  try {
    const res = await fetch(`${base}/videos/${encodeURIComponent(id)}`, {
      next: { revalidate: REVALIDATE_SEC },
    });
    if (!res.ok) return null;
    const row = (await res.json()) as ApiVideoDetailRow;
    return mapApiVideoDetailToPileItVideo(row);
  } catch {
    return null;
  }
}

export async function fetchCreatorChannel(
  handle: string
): Promise<{ creator: Creator; videos: PileItVideo[] } | null> {
  const base = getServerApiBase();
  const h = encodeURIComponent(handle);
  try {
    const [cRes, vRes] = await Promise.all([
      fetch(`${base}/creators/${h}`, { next: { revalidate: REVALIDATE_SEC } }),
      fetch(`${base}/creators/${h}/videos`, { next: { revalidate: REVALIDATE_SEC } }),
    ]);
    if (!cRes.ok) return null;
    const cRow = (await cRes.json()) as ApiCreatorRow;
    const creator = mapApiToCreator(cRow);
    let videos: PileItVideo[] = [];
    if (vRes.ok) {
      const rows = (await vRes.json()) as ApiVideoRow[];
      if (Array.isArray(rows)) {
        videos = rows.map(mapApiToPileItVideo);
      }
    }
    return { creator, videos };
  } catch {
    return null;
  }
}
