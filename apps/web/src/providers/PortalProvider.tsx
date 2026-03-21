"use client";

import { ReactNode, useState, useCallback } from "react";
import type { PileItVideo } from "@/types/content";
import createSafeContext from "@/lib/createSafeContext";

export const [usePortal, PortalProviderInner] =
  createSafeContext<
    (anchor: HTMLElement | null, video: PileItVideo | null) => void
  >();

export const [usePortalData, PortalDataProvider] = createSafeContext<{
  anchorElement: HTMLElement | null;
  miniModalVideo: PileItVideo | null;
}>();

export default function PortalProvider({ children }: { children: ReactNode }) {
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [miniModalVideo, setMiniModalVideo] = useState<PileItVideo | null>(null);

  const handleChangePortal = useCallback(
    (anchor: HTMLElement | null, video: PileItVideo | null) => {
      setAnchorElement(anchor);
      setMiniModalVideo(video);
    },
    []
  );

  return (
    <PortalProviderInner value={handleChangePortal}>
      <PortalDataProvider
        value={{ anchorElement, miniModalVideo: miniModalVideo }}
      >
        {children}
      </PortalDataProvider>
    </PortalProviderInner>
  );
}
