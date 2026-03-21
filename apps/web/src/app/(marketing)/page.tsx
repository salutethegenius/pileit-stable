import type { Metadata } from "next";
import LandingPageClient from "@/components/landing/LandingPageClient";
import JsonLd from "@/components/seo/JsonLd";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

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
  },
  twitter: {
    card: "summary_large_image",
    title: "PileIt — Built for Bahamian creators",
    description:
      "Built for Bahamian creators — watch, tip, subscribe, and pile on.",
  },
};

export default function LandingPage() {
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
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/#landing`,
        url: siteUrl,
        name: "PileIt — Built for Bahamian creators",
        isPartOf: { "@id": `${siteUrl}/#website` },
        description:
          "Landing page for PileIt — built for Bahamian creators. Streaming, KemisPay, The Pile, and more.",
      },
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <LandingPageClient />
    </>
  );
}
