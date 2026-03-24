import type { Creator } from "@/types/content";
import { IMG } from "@/lib/imageUrls";
import { resolveMediaUrl } from "@/lib/mediaUrls";

/** GET /creators row (list or compatible detail) */
export type ApiCreatorRow = {
  id: string;
  handle: string;
  display_name: string;
  category: string | null;
  subscriber_count: number;
  verified: boolean;
  accent_color: string;
  avatar_url: string;
  banner_color?: string | null;
  hero_image_url?: string | null;
  bio?: string | null;
  subscription_price?: number | null;
  video_count?: number;
  total_tips_received?: number;
  member_since?: string;
  social_links?: Record<string, string> | null;
  monetization_eligible?: boolean;
  claim_status?: string | null;
};

export function mapApiToCreator(row: ApiCreatorRow): Creator {
  const avatar = row.avatar_url ? resolveMediaUrl(row.avatar_url) : "";
  const heroRaw = row.hero_image_url ? resolveMediaUrl(row.hero_image_url) : "";
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    category: row.category ?? "",
    subscriberCount: row.subscriber_count,
    verified: row.verified,
    accentColor: row.accent_color,
    avatarUrl: avatar ? IMG.avatar(avatar) : "",
    bannerColor: row.banner_color ?? row.accent_color,
    heroImageUrl: heroRaw ? IMG.heroBackdrop(heroRaw) : undefined,
    bio: row.bio ?? undefined,
    subscriptionPrice: row.subscription_price ?? undefined,
    monetizationEligible: row.monetization_eligible === true,
    socialLinks: row.social_links ?? undefined,
    memberSince: row.member_since,
    totalTipsReceived: row.total_tips_received,
    videoCount: row.video_count,
    claimStatus: row.claim_status ?? undefined,
  };
}
