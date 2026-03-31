import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import ThemeRegistry from "@/components/ThemeRegistry";
import { getDefaultOgImageUrl, getSiteUrl } from "@/lib/site";
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
const ogImageAbsolute = getDefaultOgImageUrl();

function metadataBaseUrl(): URL {
  try {
    const u = new URL(siteUrl);
    if (!u.hostname) throw new Error("missing host");
    return u;
  } catch {
    return new URL("https://pileit.app");
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ea580c",
};

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: {
    default: "PileIt — Bahamian streaming & creators",
    template: "%s | PileIt",
  },
  description:
    "Watch Bahamian creators, join The Pile, send tips, and subscribe. Streaming built for The Bahamas with KemisPay.",
  applicationName: "PileIt",
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-icon",
  },
  appleWebApp: {
    capable: true,
    title: "PileIt",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
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
      "Watch Bahamian creators, join The Pile, send tips, and subscribe. Built for The Bahamas.",
    images: [ogImageAbsolute],
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
