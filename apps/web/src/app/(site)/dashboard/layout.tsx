import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator dashboard",
  description:
    "PileIt creator dashboard — earnings, subscribers, videos, and monetization tools.",
  robots: { index: false, follow: true },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
