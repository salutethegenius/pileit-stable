import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WatchPageClient from "@/components/watch/WatchPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { fetchVideoById } from "@/lib/serverCatalog";
import { getVideoById } from "@/data/mock";
import {
  pickHttpsImage,
  truncateMetaDescription,
  truncateMetaTitle,
} from "@/lib/seoMetadata";
import { getSiteUrl } from "@/lib/site";

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
  const image = pickHttpsImage(video.backdropUrl, video.thumbnailUrl);

  return {
    title: { absolute: titleShort },
    description,
    alternates: { canonical },
    openGraph: {
      title: titleShort,
      description,
      url: canonical,
      type: "video.other",
      ...(image ? { images: [{ url: image, alt: video.title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titleShort,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function WatchPage({ params }: Props) {
  const video =
    (await fetchVideoById(params.videoId)) ?? getVideoById(params.videoId);
  if (!video) notFound();
  const site = getSiteUrl();
  const videoPageUrl = `${site}/watch/${encodeURIComponent(video.id)}`;
  const image = pickHttpsImage(video.backdropUrl, video.thumbnailUrl);
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
    thumbnailUrl: image,
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
