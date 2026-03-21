import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply as a creator",
  description:
    "Apply to become a PileIt creator — share your channels, mission, and content plan for review.",
  robots: { index: false, follow: true },
};

export default function CreatorApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
