import type { Metadata } from "next";
import DashboardUploadPageClient from "@/components/dashboard/DashboardUploadPageClient";

export const metadata: Metadata = {
  title: "Upload video",
  description: "Add a video to your channel using a Mux playback ID.",
  robots: { index: false, follow: true },
};

export default function DashboardUploadPage() {
  return <DashboardUploadPageClient />;
}
