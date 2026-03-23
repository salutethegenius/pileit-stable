export interface Creator {
  id: string;
  handle: string;
  displayName: string;
  category: string;
  subscriberCount: number;
  verified: boolean;
  accentColor: string;
  avatarUrl: string;
  bannerColor?: string;
  /** Channel hero / cover image (HTTPS URL). */
  heroImageUrl?: string;
  bio?: string;
  subscriptionPrice?: number;
  /** False until KYC + payout admin approval; tips/subs hidden when false */
  monetizationEligible?: boolean;
  socialLinks?: Record<string, string>;
  memberSince?: string;
  totalTipsReceived?: number;
  videoCount?: number;
  /** Backend claim_status: unclaimed | email_verified | identity_review | social_verified | live */
  claimStatus?: string;
}

export interface PileItVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  backdropUrl?: string;
  /** Streaming playback ID used by the in-app video player */
  playbackId?: string;
  /** Legacy direct file/stream URL (optional) */
  videoUrl?: string;
  durationSeconds: number;
  category: string;
  isLocked: boolean;
  isNew?: boolean;
  viewCount: number;
  tipCount: number;
  pileCount?: number;
  shareCount?: number;
  creator: Pick<
    Creator,
    | "id"
    | "handle"
    | "displayName"
    | "verified"
    | "accentColor"
    | "avatarUrl"
    | "subscriberCount"
  > & {
      subscriptionPrice?: number;
      monetizationEligible?: boolean;
    };
  createdAt: string;
}

export type AccountType = "viewer" | "creator" | "admin";

export interface UserMe {
  id: string;
  email: string;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  accountType: AccountType;
  accentColor: string;
  bio: string | null;
  monetizationEligible?: boolean | null;
  payoutStatus?: string | null;
  /** Creator profile: admin-verified (blue badge), independent of monetization */
  verified?: boolean | null;
  /** Creator channel hero image URL */
  heroImageUrl?: string | null;
}
