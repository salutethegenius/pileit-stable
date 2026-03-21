import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CreatorChannelClient from "@/components/creator/CreatorChannelClient";
import JsonLd from "@/components/seo/JsonLd";
import { fetchCreatorChannel } from "@/lib/serverCatalog";
import {
  getCreatorByHandle,
  getVideosByCreatorHandle,
} from "@/data/mock";
import {
  pickHttpsImage,
  truncateMetaDescription,
  truncateMetaTitle,
} from "@/lib/seoMetadata";
import { getSiteUrl } from "@/lib/site";

type Props = { params: { handle: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fromApi = await fetchCreatorChannel(params.handle);
  const creator = fromApi?.creator ?? getCreatorByHandle(params.handle);
  if (!creator) {
    return {
      title: "Creator not found",
      robots: { index: false, follow: true },
    };
  }
  const site = getSiteUrl();
  const canonical = `${site}/creator/${encodeURIComponent(creator.handle)}`;
  const titleRaw = `${creator.displayName} (@${creator.handle})`;
  const titleShort = truncateMetaTitle(titleRaw);
  const fallbackDesc = `Watch ${creator.displayName} on PileIt — ${creator.category} creator from The Bahamas.`;
  const description = truncateMetaDescription(
    creator.bio?.trim() ? creator.bio.trim() : fallbackDesc
  );
  const image = pickHttpsImage(creator.heroImageUrl, creator.avatarUrl);

  return {
    title: { absolute: titleShort },
    description,
    alternates: { canonical },
    openGraph: {
      title: titleShort,
      description,
      url: canonical,
      type: "profile",
      ...(image ? { images: [{ url: image, alt: creator.displayName }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titleShort,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function CreatorPage({
  params,
}: Props) {
  const fromApi = await fetchCreatorChannel(params.handle);
  if (fromApi) {
    const site = getSiteUrl();
    const profileUrl = `${site}/creator/${encodeURIComponent(fromApi.creator.handle)}`;
    const image = pickHttpsImage(
      fromApi.creator.heroImageUrl,
      fromApi.creator.avatarUrl
    );
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfilePage",
          "@id": `${profileUrl}#page`,
          url: profileUrl,
          name: `${fromApi.creator.displayName} on PileIt`,
          mainEntity: { "@id": `${profileUrl}#person` },
        },
        {
          "@type": "Person",
          "@id": `${profileUrl}#person`,
          name: fromApi.creator.displayName,
          url: profileUrl,
          ...(image ? { image: { "@type": "ImageObject", url: image } } : {}),
          jobTitle: `${fromApi.creator.category} creator`,
        },
      ],
    };
    return (
      <Suspense fallback={null}>
        <JsonLd data={jsonLd} />
        <CreatorChannelClient creator={fromApi.creator} videos={fromApi.videos} />
      </Suspense>
    );
  }
  const creator = getCreatorByHandle(params.handle);
  if (!creator) notFound();
  const videos = getVideosByCreatorHandle(params.handle);
  const site = getSiteUrl();
  const profileUrl = `${site}/creator/${encodeURIComponent(creator.handle)}`;
  const image = pickHttpsImage(creator.heroImageUrl, creator.avatarUrl);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": `${profileUrl}#page`,
        url: profileUrl,
        name: `${creator.displayName} on PileIt`,
        mainEntity: { "@id": `${profileUrl}#person` },
      },
      {
        "@type": "Person",
        "@id": `${profileUrl}#person`,
        name: creator.displayName,
        url: profileUrl,
        ...(image ? { image: { "@type": "ImageObject", url: image } } : {}),
        jobTitle: `${creator.category} creator`,
      },
    ],
  };
  return (
    <Suspense fallback={null}>
      <JsonLd data={jsonLd} />
      <CreatorChannelClient creator={creator} videos={videos} />
    </Suspense>
  );
}
