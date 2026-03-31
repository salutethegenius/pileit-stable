import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { getDefaultOgImageUrl, getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const ogImageAbsolute = getDefaultOgImageUrl();

export const metadata: Metadata = {
  title: {
    absolute: "PileIt — Built for Bahamian creators",
  },
  description:
    "PileIt is built for Bahamian creators — stream, tip, subscribe with KemisPay, and join The Pile. Built in Nassau for The Bahamas.",
  alternates: { canonical: `${siteUrl}/` },
  openGraph: {
    title: "PileIt — Built for Bahamian creators",
    description:
      "Streaming built for Bahamian creators. Watch, tip, subscribe, and see for yourself.",
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
    title: "PileIt — Built for Bahamian creators",
    description:
      "Built for Bahamian creators — watch, tip, subscribe, and pile on.",
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
