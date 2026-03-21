import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creators",
  description:
    "Browse Bahamian creators on PileIt — comedy, music, lifestyle, and more. Follow channels and subscribe.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Browse creators | PileIt",
    description:
      "Discover Bahamian creators on PileIt. Watch, follow, tip, and subscribe.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse creators | PileIt",
    description:
      "Discover Bahamian creators on PileIt. Watch, follow, tip, and subscribe.",
  },
};

export default function CreatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
