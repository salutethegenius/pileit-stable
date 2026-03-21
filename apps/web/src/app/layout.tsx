import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import ThemeRegistry from "@/components/ThemeRegistry";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dmsans",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PileIt — Bahamian streaming & creators",
    template: "%s | PileIt",
  },
  description:
    "Watch Bahamian creators, join The Pile, send tips, and subscribe. Streaming built for The Bahamas with KemisPay.",
  applicationName: "PileIt",
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon.ico" }],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_BS",
    url: siteUrl,
    siteName: "PileIt",
    title: "PileIt — Bahamian streaming & creators",
    description:
      "Watch Bahamian creators, join The Pile, send tips, and subscribe. Built for The Bahamas.",
    images: [
      {
        url: "/pileit-og-image.png",
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
      "Watch Bahamian creators, join The Pile, send tips, and subscribe. Built for The Bahamas.",
    images: ["/pileit-og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${barlowCondensed.variable}`}>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
