import type { Metadata } from "next";
import DashboardUploadPageClient from "@/components/dashboard/DashboardUploadPageClient";

export const metadata: Metadata = {
  title: "Upload to PileIt",
  description: "Add a video to your channel on PileIt.",
  robots: { index: false, follow: true },
};

export default function DashboardUploadPage() {
  return <DashboardUploadPageClient />;
}
