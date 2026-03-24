"use client";

import "@mux/mux-player/themes/microvideo";
import dynamic from "next/dynamic";
import Box from "@mui/material/Box";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react").then((m) => m.default), {
  ssr: false,
  loading: () => null,
});

type Props = {
  playbackId: string;
  accentColor?: string;
  active: boolean;
};

/**
 * Muted loop preview for card hover. Only mounted while `active` to avoid N players in the DOM.
 */
export default function VideoHoverPreview({ playbackId, accentColor, active }: Props) {
  if (!active || !playbackId.trim()) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        bgcolor: "#000",
        "& mux-player": {
          width: "100%",
          height: "100%",
          display: "block",
        },
      }}
    >
      <MuxPlayer
        playbackId={playbackId.trim()}
        theme="microvideo"
        muted
        autoPlay
        loop
        playsInline
        nohotkeys
        thumbnailTime={0}
        accentColor={accentColor}
        proudlyDisplayMuxBadge={false}
        disableTracking
        style={{ width: "100%", height: "100%" }}
      />
    </Box>
  );
}
