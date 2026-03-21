import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your PileIt profile, handle, and creator application status.",
  robots: { index: false, follow: true },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
