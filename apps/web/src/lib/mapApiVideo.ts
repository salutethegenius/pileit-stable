import type { PileItVideo } from "@/types/content";
import { IMG } from "@/lib/imageUrls";
import { resolveMediaUrl } from "@/lib/mediaUrls";
import { muxThumbnailUrl } from "@/lib/muxThumbnails";

/** Backend GET /videos row shape */
export type ApiVideoRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  backdrop_url?: string | null;
  video_url?: string | null;
  playback_id?: string | null;
  duration_seconds: number;
  category?: string | null;
  is_locked: boolean;
  isrc?: string | null;
  stream_source?: string | null;
  mux_live_status?: string | null;
  view_count: number;
  tip_total?: number;
  creator: {
    id: string;
    handle: string;
    display_name: string;
    verified: boolean;
    accent_color: string;
    avatar_url: string;
    subscriber_count: number;
    follower_count?: number;
    subscription_price?: number | null;
    monetization_eligible?: boolean;
  };
  created_at?: string;
};

/** GET /videos/{id} adds counts; list rows omit these */
export type ApiVideoDetailRow = ApiVideoRow & {
  tip_count?: number;
  pile_count?: number;
  share_count?: number;
};

export function mapApiToPileItVideo(row: ApiVideoRow): PileItVideo {
  return mapApiVideoToPileItVideoInternal(row, {});
}

/** Skip malformed rows so one bad payload does not empty the whole catalog. */
export function safeMapApiVideos(rows: ApiVideoRow[]): PileItVideo[] {
  const out: PileItVideo[] = [];
  for (const row of rows) {
    try {
      out.push(mapApiToPileItVideo(row));
    } catch {
      /* ignore */
    }
  }
  return out;
}

export function mapApiVideoDetailToPileItVideo(row: ApiVideoDetailRow): PileItVideo {
  return mapApiVideoToPileItVideoInternal(row, {
    tipCount: row.tip_count ?? row.tip_total ?? 0,
    pileCount: row.pile_count ?? 0,
    shareCount: row.share_count ?? 0,
  });
}

function mapApiVideoToPileItVideoInternal(
  row: ApiVideoRow,
  overrides: {
    tipCount?: number;
    pileCount?: number;
    shareCount?: number;
  }
): PileItVideo {
  const thumb =
    (row.thumbnail_url && row.thumbnail_url.trim()) ||
    muxThumbnailUrl(row.playback_id) ||
    "";
  const back =
    (row.backdrop_url && row.backdrop_url.trim()) ||
    (row.thumbnail_url && row.thumbnail_url.trim()) ||
    muxThumbnailUrl(row.playback_id) ||
    "";
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    thumbnailUrl: thumb ? IMG.cardThumb(thumb) : "",
    backdropUrl: back ? IMG.heroBackdrop(back) : "",
    playbackId: row.playback_id?.trim() || undefined,
    streamSource: row.stream_source?.trim() || "vod",
    muxLiveStatus: row.mux_live_status ?? null,
    videoUrl: row.video_url || undefined,
    durationSeconds: row.duration_seconds ?? 0,
    category: row.category ?? "",
    isrc: row.isrc?.trim() || undefined,
    isLocked: Boolean(row.is_locked),
    viewCount: row.view_count,
    tipCount: overrides.tipCount ?? row.tip_total ?? 0,
    pileCount: overrides.pileCount ?? 0,
    shareCount: overrides.shareCount ?? 0,
    creator: {
      id: row.creator.id,
      handle: row.creator.handle || "",
      displayName: row.creator.display_name,
      verified: row.creator.verified,
      accentColor: row.creator.accent_color,
      avatarUrl: row.creator.avatar_url
        ? IMG.avatar(resolveMediaUrl(row.creator.avatar_url))
        : "",
      subscriberCount: row.creator.subscriber_count,
      followerCount: row.creator.follower_count ?? 0,
      subscriptionPrice:
        row.creator.monetization_eligible === false
          ? undefined
          : row.creator.subscription_price ?? undefined,
      monetizationEligible: row.creator.monetization_eligible === true,
    },
    createdAt: row.created_at || new Date().toISOString(),
  };
}
