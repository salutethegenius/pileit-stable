"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { PileItVideo } from "@/types/content";
import { usePortal } from "@/providers/PortalProvider";
import { formatDuration } from "@/utils/format";
import { IMG } from "@/lib/imageUrls";
import CategoryMediaPlaceholder from "@/components/brand/CategoryMediaPlaceholder";

type Props = { video: PileItVideo };

const VideoItemWithHoverPure = forwardRef<
  HTMLDivElement,
  {
    src: string;
    onHover: (v: boolean) => void;
    video: PileItVideo;
  }
>(function VideoItemWithHoverPure({ src, onHover, video }, ref) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const showPlaceholder = !src || imgFailed;

  return (
    <Paper
      ref={ref}
      elevation={0}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
      sx={{
        bgcolor: "background.paper",
        borderRadius: 1,
        overflow: "hidden",
        transition: "transform 0.2s ease",
        "&:hover": { transform: "scale(1.08)", zIndex: 2 },
      }}
    >
      <Box
        sx={{
          position: "relative",
          pt: "56.25%",
          bgcolor: "#000",
        }}
      >
        {showPlaceholder ? (
          <CategoryMediaPlaceholder category={video.category} variant="card" />
        ) : null}
        {src && !imgFailed ? (
          <Image
            src={IMG.cardThumb(src)}
            alt={`${video.title} — video thumbnail`}
            fill
            sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, (max-width: 1200px) 25vw, 16vw"
            quality={70}
            loading="lazy"
            style={{ objectFit: "cover" }}
            onError={() => setImgFailed(true)}
          />
        ) : null}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)",
            pointerEvents: "none",
          }}
        />
        {video.isNew && (
          <Chip
            label="NEW"
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              left: 8,
              bgcolor: "primary.main",
              color: "#fff",
              fontWeight: 800,
              height: 22,
              fontSize: 11,
            }}
          />
        )}
        {video.isLocked && (
          <Chip
            label="Subs Only"
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(0,0,0,0.75)",
              color: "#fff",
              height: 22,
              fontSize: 11,
            }}
          />
        )}
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            color: "#fff",
            fontWeight: 700,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          {formatDuration(video.durationSeconds)}
        </Typography>
      </Box>
    </Paper>
  );
});

export default function VideoItemWithHover({ video }: Props) {
  const setPortal = usePortal();
  const elementRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (hovered && elementRef.current) {
      setPortal(elementRef.current, video);
    }
  }, [hovered, video, setPortal]);

  return (
    <VideoItemWithHoverPure
      ref={elementRef}
      src={video.thumbnailUrl}
      onHover={setHovered}
      video={video}
    />
  );
}
