import { Suspense } from "react";
import { notFound } from "next/navigation";
import CreatorChannelClient from "@/components/creator/CreatorChannelClient";
import { fetchCreatorChannel } from "@/lib/serverCatalog";
import {
  getCreatorByHandle,
  getVideosByCreatorHandle,
} from "@/data/mock";

export default async function CreatorPage({
  params,
}: {
  params: { handle: string };
}) {
  const fromApi = await fetchCreatorChannel(params.handle);
  if (fromApi) {
    return (
      <Suspense fallback={null}>
        <CreatorChannelClient creator={fromApi.creator} videos={fromApi.videos} />
      </Suspense>
    );
  }
  const creator = getCreatorByHandle(params.handle);
  if (!creator) notFound();
  const videos = getVideosByCreatorHandle(params.handle);
  return (
    <Suspense fallback={null}>
      <CreatorChannelClient creator={creator} videos={videos} />
    </Suspense>
  );
}
