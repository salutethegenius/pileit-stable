"use client";

import {
  ReactNode,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { PileItVideo } from "@/types/content";

type DetailCtx = {
  detailVideo: PileItVideo | null;
  openDetail: (video: PileItVideo) => void;
  closeDetail: () => void;
};

const Ctx = createContext<DetailCtx | null>(null);

export function useDetailModal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDetailModal must be used within DetailModalProvider");
  return v;
}

export default function DetailModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [detailVideo, setDetailVideo] = useState<PileItVideo | null>(null);
  const openDetail = useCallback((video: PileItVideo) => {
    setDetailVideo(video);
  }, []);
  const closeDetail = useCallback(() => setDetailVideo(null), []);

  return (
    <Ctx.Provider value={{ detailVideo, openDetail, closeDetail }}>
      {children}
    </Ctx.Provider>
  );
}
