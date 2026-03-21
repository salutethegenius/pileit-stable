import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import ThemeRegistry from "@/components/ThemeRegistry";
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

export const metadata: Metadata = {
  title: "PileIt — Bahamian streaming & creators",
  description:
    "Watch creators, pile on with comments, tips, and subscriptions. Built for The Bahamas.",
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "PileIt",
    description: "Bahamian-first streaming and creator economy platform.",
    type: "website",
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
