import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WatchPageClient from "@/components/watch/WatchPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { fetchVideoById } from "@/lib/serverCatalog";
import { getVideoById } from "@/data/mock";
import {
  pickHttpsImageForOg,
  truncateMetaDescription,
  truncateMetaTitle,
} from "@/lib/seoMetadata";
import { getDefaultOgImageUrl, getSiteUrl } from "@/lib/site";

type Props = { params: { videoId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const video =
    (await fetchVideoById(params.videoId)) ?? getVideoById(params.videoId);
  if (!video) {
    return {
      title: "Video not found",
      robots: { index: false, follow: true },
    };
  }
  const site = getSiteUrl();
  const canonical = `${site}/watch/${encodeURIComponent(video.id)}`;
  const titleShort = truncateMetaTitle(video.title);
  const fallbackDesc = `Watch ${video.title} by ${video.creator.displayName} on PileIt — Bahamian streaming.`;
  const description = truncateMetaDescription(
    video.description?.trim() ? video.description.trim() : fallbackDesc
  );
  const videoThumbOg = pickHttpsImageForOg(video.backdropUrl, video.thumbnailUrl);
  const ogImageUrl = videoThumbOg ?? getDefaultOgImageUrl();
  const defaultOgMeta = {
    width: 1200,
    height: 630,
    alt: "PileIt — Bahamian creators. Watch, tip, shop, pile on.",
  } as const;

  return {
    title: { absolute: titleShort },
    description,
    alternates: { canonical },
    openGraph: {
      title: titleShort,
      description,
      url: canonical,
      type: "video.other",
      images: [
        videoThumbOg
          ? { url: ogImageUrl, alt: video.title }
          : { url: ogImageUrl, ...defaultOgMeta },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleShort,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function WatchPage({ params }: Props) {
  const video =
    (await fetchVideoById(params.videoId)) ?? getVideoById(params.videoId);
  if (!video) notFound();
  const site = getSiteUrl();
  const videoPageUrl = `${site}/watch/${encodeURIComponent(video.id)}`;
  const ogImageUrl =
    pickHttpsImageForOg(video.backdropUrl, video.thumbnailUrl) ?? getDefaultOgImageUrl();
  const durationIso =
    typeof video.durationSeconds === "number" && video.durationSeconds > 0
      ? `PT${Math.round(video.durationSeconds)}S`
      : undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: truncateMetaDescription(
      video.description || `Video by ${video.creator.displayName} on PileIt.`,
      500
    ),
    thumbnailUrl: ogImageUrl,
    uploadDate: video.createdAt,
    url: videoPageUrl,
    ...(durationIso ? { duration: durationIso } : {}),
    author: {
      "@type": "Person",
      name: video.creator.displayName,
      url: `${site}/creator/${encodeURIComponent(video.creator.handle)}`,
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <WatchPageClient video={video} />
    </>
  );
}
