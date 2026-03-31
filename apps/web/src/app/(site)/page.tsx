import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { getDefaultOgImageUrl, getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const ogImageAbsolute = getDefaultOgImageUrl();

export const metadata: Metadata = {
  title: {
    absolute: "PileIt — Bahamian streaming & creators",
  },
  description:
    "Watch Bahamian creators, join The Pile, send tips, and subscribe. Streaming built for The Bahamas with KemisPay.",
  alternates: { canonical: `${siteUrl}/` },
  openGraph: {
    title: "PileIt — Bahamian streaming & creators",
    description:
      "Stream Bahamian creators — browse, subscribe, tip, and join The Pile. Built for The Bahamas.",
    url: `${siteUrl}/`,
    images: [
      {
        url: ogImageAbsolute,
        width: 1200,
        height: 630,
        alt: "PileIt — Bahamian creators. Watch, tip, shop, pile on.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PileIt — Bahamian streaming & creators",
    description:
      "Stream Bahamian creators — browse, subscribe, tip, and join The Pile.",
    images: [ogImageAbsolute],
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "PileIt",
        description:
          "Bahamian-first streaming — watch creators, join The Pile, tip, and subscribe.",
        inLanguage: "en-BS",
        publisher: { "@id": `${siteUrl}/#org` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#org`,
        name: "PileIt",
        url: siteUrl,
        description:
          "PileIt is part of the Kemis Group — digital infrastructure and creator tools for The Bahamas.",
        areaServed: "BS",
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <HomePageClient />
    </>
  );
}
