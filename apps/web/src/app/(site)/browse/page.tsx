import type { Metadata } from "next";
import HomePageClient from "@/components/home/HomePageClient";
import JsonLd from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();
const canonical = `${siteUrl}/browse`;

export const metadata: Metadata = {
  title: {
    absolute: "Browse — PileIt",
  },
  description:
    "Stream Bahamian creators on PileIt — browse trending videos, subscribe, tip with KemisPay, and join The Pile.",
  alternates: { canonical },
  openGraph: {
    title: "Browse — PileIt",
    description:
      "Stream Bahamian creators — browse, subscribe, tip, and join The Pile. Built for The Bahamas.",
    url: canonical,
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse — PileIt",
    description:
      "Stream Bahamian creators — browse, subscribe, tip, and join The Pile.",
  },
};

export default function BrowsePage() {
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
