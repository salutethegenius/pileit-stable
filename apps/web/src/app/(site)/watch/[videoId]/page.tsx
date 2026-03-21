import { notFound } from "next/navigation";
import WatchPageClient from "@/components/watch/WatchPageClient";
import { fetchVideoById } from "@/lib/serverCatalog";
import { getVideoById } from "@/data/mock";

export default async function WatchPage({
  params,
}: {
  params: { videoId: string };
}) {
  const video =
    (await fetchVideoById(params.videoId)) ?? getVideoById(params.videoId);
  if (!video) notFound();
  return <WatchPageClient video={video} />;
}
