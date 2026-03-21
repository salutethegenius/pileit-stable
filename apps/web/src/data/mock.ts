import type { Creator, PileItVideo } from "@/types/content";

/** Lean defaults: smaller assets = faster LCP / carousel paint */
const img = (seed: string, w = 480, h = 270) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=${w}&h=${h}&q=68`;

export const mockCreators: Creator[] = [
  {
    id: "c1",
    handle: "jaydenfox",
    displayName: "Jayden Fox",
    category: "Comedy",
    subscriberCount: 18400,
    verified: true,
    monetizationEligible: true,
    accentColor: "#f97316",
    avatarUrl: img("photo-1507003211169-0a1dd7228f2d", 96, 96),
    bannerColor: "#f97316",
    bio: "Nassau-born comic documenting island life one skit at a time.",
    subscriptionPrice: 4.99,
    videoCount: 42,
    totalTipsReceived: 12840,
    memberSince: "2022-03-12",
    socialLinks: { instagram: "https://instagram.com/jaydenfox" },
  },
  {
    id: "c2",
    handle: "amarawells",
    displayName: "Amara Wells",
    category: "Lifestyle",
    subscriberCount: 31200,
    verified: true,
    accentColor: "#a855f7",
    avatarUrl: img("photo-1494790108377-be9c29b29330", 96, 96),
    bannerColor: "#a855f7",
    bio: "Slow mornings, ocean air, and honest lifestyle from the Bahamas.",
    subscriptionPrice: 6.99,
    videoCount: 88,
    totalTipsReceived: 22100,
    memberSince: "2021-08-01",
  },
  {
    id: "c3",
    handle: "darioking",
    displayName: "Dario King",
    category: "Music",
    subscriberCount: 9800,
    verified: false,
    monetizationEligible: true,
    accentColor: "#3b82f6",
    avatarUrl: img("photo-1500648767791-00dcc994a43e", 96, 96),
    bannerColor: "#3b82f6",
    subscriptionPrice: 3.99,
    videoCount: 34,
    totalTipsReceived: 8900,
    memberSince: "2023-01-15",
  },
  {
    id: "c4",
    handle: "tianamoss",
    displayName: "Tiana Moss",
    category: "Food",
    subscriberCount: 14100,
    verified: true,
    monetizationEligible: true,
    accentColor: "#22c55e",
    avatarUrl: img("photo-1438761681033-6461ffad8d80", 96, 96),
    bannerColor: "#22c55e",
    subscriptionPrice: 4.49,
    videoCount: 56,
    totalTipsReceived: 15400,
    memberSince: "2020-11-20",
  },
  {
    id: "c5",
    handle: "marcusb",
    displayName: "Marcus B",
    category: "Sports",
    subscriberCount: 22700,
    verified: true,
    monetizationEligible: true,
    accentColor: "#ec4899",
    avatarUrl: img("photo-1472099645785-5658abf4ff4e", 96, 96),
    bannerColor: "#ec4899",
    subscriptionPrice: 5.99,
    videoCount: 120,
    totalTipsReceived: 31000,
    memberSince: "2019-05-04",
  },
  {
    id: "c6",
    handle: "keziacole",
    displayName: "Kezia Cole",
    category: "Fashion",
    subscriberCount: 41000,
    verified: true,
    monetizationEligible: true,
    accentColor: "#facc15",
    avatarUrl: img("photo-1534528741775-53994a69daeb", 96, 96),
    bannerColor: "#facc15",
    subscriptionPrice: 7.99,
    videoCount: 210,
    totalTipsReceived: 58200,
    memberSince: "2018-02-14",
  },
];

const creator = (handle: string) =>
  mockCreators.find((c) => c.handle === handle)!;

/**
 * Short, low-bitrate CC0 clip for fast loads and UI layout checks (not production CDN).
 * MDN interactive examples — ~1.3s, small file vs. multi-minute studio samples.
 */
const MOCK_VIDEO_DEMO_MP4 =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

/** Legacy variety kept for optional sampleIndex overrides; defaults to demo clip. */
const SAMPLE_MP4 = [
  MOCK_VIDEO_DEMO_MP4,
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
] as const;

/** Image seeds — Unsplash IDs reused from proven rows in this file (avoid 404s). */
const U = {
  street: "photo-1529156069898-49953e39b3ac",
  beach: "photo-1507525428034-b723cf961d3e",
  music1: "photo-1493225457124-a3eb161ffa5f",
  food: "photo-1546069901-ba9599a7e63c",
  sports: "photo-1574629810360-7efbbe195018",
  fashion: "photo-1445205170230-053b83016050",
  crowd: "photo-1529156069898-49953e39b3ac",
  mic: "photo-1493225457124-a3eb161ffa5f",
  studio: "photo-1493225457124-a3eb161ffa5f",
  palm: "photo-1507525428034-b723cf961d3e",
  cafe: "photo-1546069901-ba9599a7e63c",
  run: "photo-1574629810360-7efbbe195018",
  dj: "photo-1493225457124-a3eb161ffa5f",
  yoga: "photo-1507525428034-b723cf961d3e",
  night: "photo-1445205170230-053b83016050",
  market: "photo-1546069901-ba9599a7e63c",
  court: "photo-1574629810360-7efbbe195018",
  runway: "photo-1445205170230-053b83016050",
  comedy2: "photo-1529156069898-49953e39b3ac",
  waves: "photo-1507525428034-b723cf961d3e",
} as const;

function makeVideo(
  id: string,
  title: string,
  category: string,
  creatorHandle: string,
  imageSeed: string,
  opts: {
    description?: string;
    durationSeconds: number;
    isLocked: boolean;
    isNew?: boolean;
    viewCount: number;
    tipCount: number;
    pileCount?: number;
    shareCount?: number;
    sampleIndex?: number;
  }
): PileItVideo {
  const c = creator(creatorHandle);
  const videoUrl =
    opts.sampleIndex != null
      ? SAMPLE_MP4[opts.sampleIndex % SAMPLE_MP4.length]!
      : MOCK_VIDEO_DEMO_MP4;
  return {
    id,
    title,
    description:
      opts.description ?? `${title} — PileIt original from The Bahamas.`,
    thumbnailUrl: img(imageSeed, 400, 225),
    backdropUrl: img(imageSeed, 1200, 675),
    videoUrl,
    durationSeconds: opts.durationSeconds,
    category,
    isLocked: opts.isLocked,
    isNew: opts.isNew,
    viewCount: opts.viewCount,
    tipCount: opts.tipCount,
    pileCount: opts.pileCount ?? Math.max(12, Math.floor(opts.viewCount / 40)),
    shareCount: opts.shareCount ?? Math.max(8, Math.floor(opts.viewCount / 120)),
    creator: {
      id: c.id,
      handle: c.handle,
      displayName: c.displayName,
      verified: c.verified,
      accentColor: c.accentColor,
      avatarUrl: c.avatarUrl,
      subscriberCount: c.subscriberCount,
      subscriptionPrice: c.subscriptionPrice,
      monetizationEligible: c.monetizationEligible === true,
    },
    createdAt: new Date().toISOString(),
  };
}

export const mockVideos: PileItVideo[] = [
  makeVideo("v1", "Nassau Streets Be Different", "Comedy", "jaydenfox", U.street, {
    description:
      "A love letter to the quirks of downtown Nassau — traffic, humor, and island pace.",
    durationSeconds: 272,
    isLocked: false,
    isNew: true,
    viewCount: 12400,
    tipCount: 890,
    pileCount: 420,
    shareCount: 112,
    sampleIndex: 0,
  }),
  makeVideo("v2", "My Morning Routine in Paradise", "Lifestyle", "amarawells", U.beach, {
    description: "Sunrise coffee, a walk on the sand, and how I plan the day.",
    durationSeconds: 1100,
    isLocked: true,
    isNew: true,
    viewCount: 9100,
    tipCount: 1200,
    pileCount: 210,
    shareCount: 88,
    sampleIndex: 1,
  }),
  makeVideo("v3", "Harbour Nights (New Track)", "Music", "darioking", U.music1, {
    description: "Live session from the harbour — new single drop.",
    durationSeconds: 227,
    isLocked: true,
    isNew: true,
    viewCount: 31800,
    tipCount: 5400,
    pileCount: 890,
    shareCount: 400,
    sampleIndex: 2,
  }),
  makeVideo("v4", "Cooking Conch Salad from Scratch", "Food", "tianamoss", U.food, {
    description: "Family recipe, market run, and the perfect citrus balance.",
    durationSeconds: 1334,
    isLocked: false,
    viewCount: 7100,
    tipCount: 620,
    pileCount: 305,
    shareCount: 54,
    sampleIndex: 3,
  }),
  makeVideo("v5", "Bahamas vs Caribbean: Who Balling?", "Sports", "marcusb", U.sports, {
    description: "Hot takes, stats, and a little trash talk — all love.",
    durationSeconds: 665,
    isLocked: false,
    viewCount: 19000,
    tipCount: 2100,
    pileCount: 670,
    shareCount: 201,
    sampleIndex: 4,
  }),
  makeVideo("v6", "Spring Collection Drop 2024", "Fashion", "keziacole", U.fashion, {
    description: "Island tailoring, breathable fabrics, runway in Freeport.",
    durationSeconds: 521,
    isLocked: false,
    isNew: true,
    viewCount: 24600,
    tipCount: 4100,
    pileCount: 512,
    shareCount: 330,
    sampleIndex: 5,
  }),
  // Comedy — pad row (5+ cards total in category)
  makeVideo("v7", "Island Traffic Chronicles", "Comedy", "jaydenfox", U.comedy2, {
    durationSeconds: 412,
    isLocked: false,
    viewCount: 9800,
    tipCount: 720,
  }),
  makeVideo("v8", "Open Mic at Arawak Cay", "Comedy", "jaydenfox", U.crowd, {
    durationSeconds: 318,
    isLocked: true,
    viewCount: 15200,
    tipCount: 1100,
  }),
  makeVideo("v9", "Conch Salad Jokes Vol. 2", "Comedy", "jaydenfox", U.market, {
    durationSeconds: 245,
    isLocked: false,
    isNew: true,
    viewCount: 6200,
    tipCount: 410,
  }),
  makeVideo("v10", "When Your Cousin Visits Nassau", "Comedy", "jaydenfox", U.night, {
    durationSeconds: 384,
    isLocked: false,
    viewCount: 22100,
    tipCount: 1680,
  }),
  makeVideo("v11", "Skits from the Fish Fry", "Comedy", "jaydenfox", U.street, {
    durationSeconds: 501,
    isLocked: false,
    viewCount: 8700,
    tipCount: 590,
  }),
  // Music
  makeVideo("v12", "Junkanoo Drums in the Yard", "Music", "darioking", U.dj, {
    durationSeconds: 198,
    isLocked: false,
    isNew: true,
    viewCount: 14200,
    tipCount: 920,
  }),
  makeVideo("v13", "Sunset Freestyle (Acoustic)", "Music", "darioking", U.palm, {
    durationSeconds: 256,
    isLocked: true,
    viewCount: 18900,
    tipCount: 2400,
  }),
  makeVideo("v14", "Studio Session: Island Soul", "Music", "darioking", U.studio, {
    durationSeconds: 340,
    isLocked: false,
    viewCount: 11200,
    tipCount: 880,
  }),
  makeVideo("v15", "Cable Beach Afterparty Set", "Music", "darioking", U.mic, {
    durationSeconds: 289,
    isLocked: false,
    viewCount: 25600,
    tipCount: 3200,
  }),
  makeVideo("v16", "Steel Pan on the Dock", "Music", "darioking", U.waves, {
    durationSeconds: 176,
    isLocked: false,
    viewCount: 7400,
    tipCount: 510,
  }),
  // Lifestyle
  makeVideo("v17", "Slow Sunday: Exuma Blues", "Lifestyle", "amarawells", U.palm, {
    durationSeconds: 620,
    isLocked: false,
    isNew: true,
    viewCount: 13400,
    tipCount: 980,
  }),
  makeVideo("v18", "Home Tour — Coastal Minimal", "Lifestyle", "amarawells", U.beach, {
    durationSeconds: 445,
    isLocked: true,
    viewCount: 20100,
    tipCount: 1500,
  }),
  makeVideo("v19", "Skincare in Humid Island Air", "Lifestyle", "amarawells", U.yoga, {
    durationSeconds: 312,
    isLocked: false,
    viewCount: 9600,
    tipCount: 640,
  }),
  makeVideo("v20", "Coffee & Journaling by the Marina", "Lifestyle", "amarawells", U.cafe, {
    durationSeconds: 268,
    isLocked: false,
    viewCount: 11800,
    tipCount: 720,
  }),
  makeVideo("v21", "Packing for a Weekend in Bimini", "Lifestyle", "amarawells", U.run, {
    durationSeconds: 356,
    isLocked: false,
    viewCount: 8300,
    tipCount: 540,
  }),
  // Extra free + variety for Trending / Free rows
  makeVideo("v22", "Beach Run Club: Nassau Chapter", "Sports", "marcusb", U.run, {
    durationSeconds: 412,
    isLocked: false,
    viewCount: 5600,
    tipCount: 320,
  }),
  makeVideo("v23", "Fish Fry Taste Test", "Food", "tianamoss", U.market, {
    durationSeconds: 298,
    isLocked: false,
    isNew: true,
    viewCount: 10200,
    tipCount: 760,
  }),
  makeVideo("v24", "Court Vision: Summer League", "Sports", "marcusb", U.court, {
    durationSeconds: 524,
    isLocked: false,
    viewCount: 7800,
    tipCount: 450,
  }),
  makeVideo("v25", "Resort Strip Lookbook", "Fashion", "keziacole", U.runway, {
    durationSeconds: 387,
    isLocked: false,
    viewCount: 16500,
    tipCount: 2100,
  }),
];

export function getVideoById(id: string): PileItVideo | null {
  return mockVideos.find((v) => v.id === id) ?? null;
}

export function getCreatorByHandle(handle: string): Creator | null {
  return mockCreators.find((c) => c.handle === handle) ?? null;
}

export function getVideosByCreatorHandle(handle: string): PileItVideo[] {
  return mockVideos.filter((v) => v.creator.handle === handle);
}

export const trendingVideos = [...mockVideos].sort(
  (a, b) => b.viewCount - a.viewCount
);

export const newReleases = mockVideos.filter((v) => v.isNew);

export const freeVideos = mockVideos.filter((v) => !v.isLocked);

export function videosInCategory(category: string): PileItVideo[] {
  return mockVideos.filter(
    (v) => v.category.toLowerCase() === category.toLowerCase()
  );
}
