import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live",
  description:
    "Live streams from Bahamian creators on PileIt — harbour sessions, premieres, and real-time community.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Live | PileIt",
    description:
      "Live streams from Bahamian creators — coming soon on PileIt.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live | PileIt",
    description:
      "Live streams from Bahamian creators — coming soon on PileIt.",
  },
};

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
