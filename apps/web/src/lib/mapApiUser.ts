import type { AccountType, UserMe } from "@/types/content";
import { resolveMediaUrl } from "@/lib/mediaUrls";

/** FastAPI `/users/me` JSON shape */
export type ApiUserMe = {
  id: string;
  email: string;
  display_name: string;
  handle: string | null;
  avatar_url: string | null;
  account_type: string;
  accent_color: string;
  bio: string | null;
  monetization_eligible?: boolean | null;
  payout_status?: string | null;
  verified?: boolean | null;
  hero_image_url?: string | null;
};

export function mapApiUserMe(row: ApiUserMe): UserMe {
  const rawAvatar = row.avatar_url ?? null;
  const rawHero = row.hero_image_url ?? null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    handle: row.handle,
    avatarUrl: rawAvatar ? resolveMediaUrl(rawAvatar) : null,
    avatarUrlRaw: rawAvatar,
    accountType: row.account_type as AccountType,
    accentColor: row.accent_color,
    bio: row.bio,
    monetizationEligible: row.monetization_eligible ?? null,
    payoutStatus: row.payout_status ?? null,
    verified: row.verified ?? null,
    heroImageUrl: rawHero ? resolveMediaUrl(rawHero) : null,
    heroImageUrlRaw: rawHero,
  };
}
