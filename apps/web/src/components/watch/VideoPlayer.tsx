"use client";

import Box from "@mui/material/Box";

type Props = {
  src: string;
  poster?: string;
  locked?: boolean;
};

/**
 * Native HTML5 video — avoids Video.js sizing issues (empty player with fill/fluid + MUI).
 * 16:9 via padding-bottom fallback (aspect-ratio as extra where supported).
 */
export default function VideoPlayer({ src, poster, locked }: Props) {
  if (locked || !src) return null;

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
        component="video"
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </Box>
  );
}
