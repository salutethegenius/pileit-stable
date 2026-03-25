"use client";

import Box from "@mui/material/Box";
import MuxPlayer from "@mux/mux-player-react";
import type { ComponentProps, CSSProperties } from "react";

export type VideoPlayerProps = {
  /** PileIt / streaming playback ID for this video */
  playbackId: string;
  poster?: string;
  accentColor?: string;
  /** When true, renders nothing (parent may show a lock / poster instead). */
  locked?: boolean;
  /** Mux Live edge; defaults to on-demand VOD. */
  streamType?: "live" | "on-demand";
} & Omit<
  ComponentProps<typeof MuxPlayer>,
  "playbackId" | "poster" | "accentColor" | "streamType"
>;

/**
 * PileIt video player — 16:9 responsive shell. Pass a `playbackId` from your video record.
 */
export default function VideoPlayer({
  playbackId,
  poster,
  accentColor,
  locked,
  streamType = "on-demand",
  style,
  className,
  ...muxRest
}: VideoPlayerProps) {
  if (locked || !playbackId.trim()) return null;

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: 0,
        paddingTop: "56.25%",
        bgcolor: "#000",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          "& mux-player": {
            width: "100%",
            height: "100%",
            display: "block",
          },
        }}
      >
        <MuxPlayer
          playbackId={playbackId.trim()}
          streamType={streamType}
          poster={poster}
          accentColor={accentColor}
          style={{ width: "100%", height: "100%", ...(style as CSSProperties) }}
          className={className}
          {...muxRest}
        />
      </Box>
    </Box>
  );
}
