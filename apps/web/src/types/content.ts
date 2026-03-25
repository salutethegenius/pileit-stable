export interface Creator {
  id: string;
  handle: string;
  displayName: string;
  category: string;
  subscriberCount: number;
  /** Free follows (separate from paid subscribers). */
  followerCount?: number;
  /** Present when the API had an auth context (usually false from public SSR). */
  viewerFollows?: boolean;
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
  /** vod | mux_live — when mux_live, player uses live edge */
  streamSource?: string;
  /** Mux live lifecycle: idle | active | disabled (etc.) */
  muxLiveStatus?: string | null;
  /** Legacy direct file/stream URL (optional) */
  videoUrl?: string;
  durationSeconds: number;
  category: string;
  /** Compact ISRC when set (performance-rights / PRO reporting). */
  isrc?: string | null;
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
    | "followerCount"
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
  /** Absolute URL for <img src> */
  avatarUrl: string | null;
  /** Value from API (e.g. media/… or https://…) for PUT /users/me */
  avatarUrlRaw: string | null;
  accountType: AccountType;
  accentColor: string;
  bio: string | null;
  monetizationEligible?: boolean | null;
  payoutStatus?: string | null;
  /** Creator profile: admin-verified (blue badge), independent of monetization */
  verified?: boolean | null;
  /** Creator channel hero — absolute URL for display */
  heroImageUrl?: string | null;
  /** Raw hero URL for PUT /creators/me */
  heroImageUrlRaw?: string | null;
}
