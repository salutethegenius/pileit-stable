"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import HeroBanner from "./HeroBanner";
import CreatorRow from "./CreatorRow";
import ContentRow from "./ContentRow";
import { mockCreators, mockVideos } from "@/data/mock";
import { getApiBase } from "@/lib/api";
import { allowMockCatalogFallback } from "@/lib/mockCatalog";
import { safeMapApiVideos, type ApiVideoRow } from "@/lib/mapApiVideo";
import { safeMapApiCreators, type ApiCreatorRow } from "@/lib/mapApiCreator";
import type { Creator, PileItVideo } from "@/types/content";
import { categoryHeroLabel } from "@/utils/categoryStyles";
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  mergeHomepageSections,
  type HomepageSectionsState,
} from "@/lib/homepageSections";

/** Newest published uploads first (by client createdAt, aligned with API created_at). */
function byNewestUpload(a: PileItVideo, b: PileItVideo) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function byMostViewed(a: PileItVideo, b: PileItVideo) {
  return b.viewCount - a.viewCount;
}

const NEW_RELEASES_ROW_LIMIT = 12;

/**
 * ~60% from newest uploads, ~40% from most viewed; dedupe by id; refill if the catalog is small.
 */
function blendNewReleasesRow(catalog: PileItVideo[], n: number): PileItVideo[] {
  if (catalog.length === 0) return [];
  const recent = [...catalog].sort(byNewestUpload);
  const hot = [...catalog].sort(byMostViewed);
  const slotRecent = Math.ceil(n * 0.6);
  const ids = new Set<string>();
  const out: PileItVideo[] = [];

  for (const v of recent) {
    if (out.length >= slotRecent) break;
    if (!ids.has(v.id)) {
      ids.add(v.id);
      out.push(v);
    }
  }
  for (const v of hot) {
    if (out.length >= n) break;
    if (!ids.has(v.id)) {
      ids.add(v.id);
      out.push(v);
    }
  }
  for (const v of recent) {
    if (out.length >= n) break;
    if (!ids.has(v.id)) {
      ids.add(v.id);
      out.push(v);
    }
  }
  for (const v of hot) {
    if (out.length >= n) break;
    if (!ids.has(v.id)) {
      ids.add(v.id);
      out.push(v);
    }
  }
  return out.slice(0, n);
}

function byNewestCreatorAccount(a: Creator, b: Creator) {
  const ta = a.memberSince ? new Date(a.memberSince).getTime() : 0;
  const tb = b.memberSince ? new Date(b.memberSince).getTime() : 0;
  return tb - ta;
}

/** Hero prioritizes approved/featured creator cover art, then falls back to video-led slides. */
function heroFromCatalog(videos: PileItVideo[], creators: Creator[]) {
  const creatorSlides = creators
    .filter((c) => c.heroImageUrl)
    .slice(0, 3)
    .map((creator) => {
      const fallbackVideo = videos.find((v) => v.creator.id === creator.id);
      return {
        kind: "creator" as const,
        creator,
        fallbackVideo,
        badge: "Featured Creator",
      };
    });
  const videoSlides = videos.slice(0, Math.min(4, videos.length)).map((video) => ({
    kind: "video" as const,
    video,
    badge: categoryHeroLabel(video.category),
  }));
  return [...creatorSlides, ...videoSlides];
}

export default function HomePageClient() {
  const [apiVideos, setApiVideos] = useState<PileItVideo[] | null>(null);
  const [apiCreators, setApiCreators] = useState<Creator[] | null>(null);
  const [catalogFetched, setCatalogFetched] = useState(false);
  const [homepageSections, setHomepageSections] = useState<HomepageSectionsState>(() => ({
    ...DEFAULT_HOMEPAGE_SECTIONS,
  }));

  useEffect(() => {
    const base = getApiBase();
    let cancelled = false;
    void Promise.all([
      fetch(`${base}/videos`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((rows: ApiVideoRow[]) => {
          if (cancelled) return;
          if (!Array.isArray(rows)) {
            setApiVideos([]);
            return;
          }
          setApiVideos(safeMapApiVideos(rows));
        })
        .catch(() => {
          if (!cancelled) setApiVideos([]);
        }),
      fetch(`${base}/creators`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((rows: ApiCreatorRow[]) => {
          if (cancelled) return;
          if (!Array.isArray(rows)) {
            setApiCreators([]);
            return;
          }
          setApiCreators(safeMapApiCreators(rows));
        })
        .catch(() => {
          if (!cancelled) setApiCreators([]);
        }),
      fetch(`${base}/site/homepage-sections`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: unknown) => {
          if (cancelled || !data || typeof data !== "object") return;
          const sections = (data as { sections?: unknown }).sections;
          if (sections && typeof sections === "object")
            setHomepageSections(mergeHomepageSections(sections as Record<string, boolean>));
        })
        .catch(() => {}),
    ]).finally(() => {
      if (!cancelled) setCatalogFetched(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo(() => {
    if (apiVideos !== null) {
      if (apiVideos.length > 0) return apiVideos;
      if (allowMockCatalogFallback()) return [...mockVideos].sort(byNewestUpload);
      return [];
    }
    if (allowMockCatalogFallback()) return [...mockVideos].sort(byNewestUpload);
    return [];
  }, [apiVideos]);

  const featuredCreators = useMemo(() => {
    if (apiCreators !== null) {
      if (apiCreators.length > 0) return apiCreators;
      if (allowMockCatalogFallback()) return [...mockCreators].sort(byNewestCreatorAccount);
      return [];
    }
    if (allowMockCatalogFallback()) return [...mockCreators].sort(byNewestCreatorAccount);
    return [];
  }, [apiCreators]);

  const inCategory = (cat: string) =>
    catalog.filter((v) => v.category.toLowerCase() === cat.toLowerCase());

  const heroSlides = useMemo(
    () => heroFromCatalog(catalog, featuredCreators),
    [catalog, featuredCreators]
  );

  const trend = useMemo(
    () => [...catalog].sort((a, b) => b.viewCount - a.viewCount),
    [catalog]
  );
  const newReleases = useMemo(
    () => blendNewReleasesRow(catalog, NEW_RELEASES_ROW_LIMIT),
    [catalog]
  );
  const free = useMemo(
    () => catalog.filter((v) => !v.isLocked),
    [catalog]
  );

  const showEmptyProd =
    catalogFetched &&
    !allowMockCatalogFallback() &&
    catalog.length === 0 &&
    featuredCreators.length === 0;

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <HeroBanner slides={heroSlides} />
      {showEmptyProd ? (
        <Box sx={{ maxWidth: 640, mx: "auto", px: 3, py: 6, textAlign: "center" }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            New creators and videos are on the way
          </Typography>
          <Typography color="text.secondary">
            The catalog is empty for now. Check back soon or browse from the menu when content is live.
          </Typography>
        </Box>
      ) : null}
      <Box
        sx={{
          maxWidth: 1440,
          mx: "auto",
          width: "100%",
          px: { xs: 2, md: "48px" },
          pt: { xs: 2, md: 5.5 },
        }}
      >
        {homepageSections.featured_creators ? (
          <CreatorRow title="Featured Creators" creators={featuredCreators} />
        ) : null}
        {homepageSections.trending ? (
          <Box id="trending" sx={{ scrollMarginTop: 88 }}>
            <ContentRow title="Trending This Week" seeAllHref="/browse#trending" videos={trend} />
          </Box>
        ) : null}
        {homepageSections.new_releases ? (
          <ContentRow title="New Releases" seeAllHref="/browse" videos={newReleases} />
        ) : null}
        {homepageSections.comedy ? (
          <ContentRow title="Comedy" seeAllHref="/browse" videos={inCategory("Comedy")} />
        ) : null}
        {homepageSections.music ? (
          <ContentRow title="Music" seeAllHref="/browse" videos={inCategory("Music")} />
        ) : null}
        {homepageSections.lifestyle ? (
          <ContentRow title="Lifestyle" seeAllHref="/browse" videos={inCategory("Lifestyle")} />
        ) : null}
        {homepageSections.free_to_watch ? (
          <ContentRow title="Free to Watch" seeAllHref="/browse" videos={free} />
        ) : null}
      </Box>
    </Box>
  );
}
