import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a free PileIt account to watch creators, join The Pile, and support Bahamian content.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Sign up | PileIt",
    description:
      "Create a free PileIt account to watch Bahamian creators and join The Pile.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign up | PileIt",
    description:
      "Create a free PileIt account to watch Bahamian creators and join The Pile.",
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
