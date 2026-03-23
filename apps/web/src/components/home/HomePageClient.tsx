"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import HeroBanner from "./HeroBanner";
import CreatorRow from "./CreatorRow";
import ContentRow from "./ContentRow";
import { mockCreators, mockVideos } from "@/data/mock";
import { getApiBase } from "@/lib/api";
import { mapApiToPileItVideo, type ApiVideoRow } from "@/lib/mapApiVideo";
import { mapApiToCreator, type ApiCreatorRow } from "@/lib/mapApiCreator";
import type { Creator, PileItVideo } from "@/types/content";
import { categoryHeroLabel } from "@/utils/categoryStyles";

/** Mock / fallback: newest uploads first (API list is already newest-creators-first). */
function byNewestUpload(a: PileItVideo, b: PileItVideo) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

  useEffect(() => {
    const base = getApiBase();
    fetch(`${base}/videos`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: ApiVideoRow[]) => {
        if (!Array.isArray(rows)) return;
        const mapped = rows.map(mapApiToPileItVideo);
        // Only replace mocks when API returns real rows ([] must NOT win over mocks — ?? is not enough if state were []).
        if (mapped.length > 0) setApiVideos(mapped);
      })
      .catch(() => {});
    fetch(`${base}/creators`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: ApiCreatorRow[]) => {
        if (!Array.isArray(rows)) return;
        const mapped = rows.map(mapApiToCreator);
        if (mapped.length > 0) setApiCreators(mapped);
      })
      .catch(() => {});
  }, []);

  /**
   * Prefer API list only when it has items; empty API / errors keep Bahamian mocks.
   * API returns newest creator accounts first (videos ordered by creator signup, then upload time).
   * Mocks are sorted the same way client-side for consistent hero + featured rows.
   */
  const catalog = useMemo(() => {
    if (apiVideos != null && apiVideos.length > 0) return apiVideos;
    return [...mockVideos].sort(byNewestUpload);
  }, [apiVideos]);

  const featuredCreators = useMemo(() => {
    if (apiCreators != null && apiCreators.length > 0) return apiCreators;
    return [...mockCreators].sort(byNewestCreatorAccount);
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
  const fresh = useMemo(
    () => catalog.filter((v) => v.isNew),
    [catalog]
  );
  const free = useMemo(
    () => catalog.filter((v) => !v.isLocked),
    [catalog]
  );

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <HeroBanner slides={heroSlides} />
      <Box sx={{ maxWidth: 1440, mx: "auto", width: "100%", px: { xs: 2, md: 3, xl: 4 }, pt: 2 }}>
        <CreatorRow title="Featured Creators" creators={featuredCreators} />
        <Box id="trending" sx={{ scrollMarginTop: 88 }}>
          <ContentRow title="Trending This Week" videos={trend} />
        </Box>
        <ContentRow
          title="New Releases"
          videos={fresh.length ? fresh : catalog.slice(0, 6)}
        />
        <ContentRow title="Comedy" videos={inCategory("Comedy")} />
        <ContentRow title="Music" videos={inCategory("Music")} />
        <ContentRow title="Lifestyle" videos={inCategory("Lifestyle")} />
        <ContentRow title="Free to Watch" videos={free} />
      </Box>
    </Box>
  );
}
