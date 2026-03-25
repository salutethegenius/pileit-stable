"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import type { CSSProperties } from "react";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react").then((m) => m.default), {
  ssr: false,
  loading: () => null,
});

/** Hide Media Chrome; card uses a custom top-right mute control. */
const MUX_CHROME_HIDDEN: CSSProperties = {
  width: "100%",
  height: "100%",
  ["--controls" as string]: "none",
  ["--top-controls" as string]: "none",
  ["--center-controls" as string]: "none",
  ["--bottom-controls" as string]: "none",
  ["--play-button" as string]: "none",
  ["--top-play-button" as string]: "none",
  ["--center-play-button" as string]: "none",
  ["--bottom-play-button" as string]: "none",
  ["--mute-button" as string]: "none",
  ["--top-mute-button" as string]: "none",
  ["--center-mute-button" as string]: "none",
  ["--bottom-mute-button" as string]: "none",
  ["--captions-button" as string]: "none",
  ["--top-captions-button" as string]: "none",
  ["--center-captions-button" as string]: "none",
  ["--bottom-captions-button" as string]: "none",
  ["--fullscreen-button" as string]: "none",
  ["--top-fullscreen-button" as string]: "none",
  ["--center-fullscreen-button" as string]: "none",
  ["--bottom-fullscreen-button" as string]: "none",
  ["--pip-button" as string]: "none",
  ["--top-pip-button" as string]: "none",
  ["--volume-range" as string]: "none",
  ["--top-volume-range" as string]: "none",
  ["--time-range" as string]: "none",
  ["--top-time-range" as string]: "none",
  ["--bottom-time-range" as string]: "none",
  ["--time-display" as string]: "none",
  ["--duration-display" as string]: "none",
  ["--seek-backward-button" as string]: "none",
  ["--seek-forward-button" as string]: "none",
  ["--loading-indicator" as string]: "none",
};

type Props = {
  playbackId: string;
  accentColor?: string;
  active: boolean;
  muted: boolean;
};

/**
 * Muted/unmuted loop preview for card hover. Only mounted while `active` to avoid N players in the DOM.
 */
export default function VideoHoverPreview({ playbackId, accentColor, active, muted }: Props) {
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
          display: "block",
          ...MUX_CHROME_HIDDEN,
        },
      }}
    >
      <MuxPlayer
        playbackId={playbackId.trim()}
        muted={muted}
        autoPlay
        loop
        playsInline
        nohotkeys
        defaultHiddenCaptions
        thumbnailTime={0}
        accentColor={accentColor}
        proudlyDisplayMuxBadge={false}
        disableTracking
        style={{ ...MUX_CHROME_HIDDEN }}
      />
    </Box>
  );
}
