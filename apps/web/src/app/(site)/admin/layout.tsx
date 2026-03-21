import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "PileIt platform administration.",
  robots: { index: false, follow: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
