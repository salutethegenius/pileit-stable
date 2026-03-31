"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import { alpha } from "@mui/material/styles";
import type { PileItVideo } from "@/types/content";
import { useDetailModal } from "@/providers/DetailModalProvider";
import { formatCount, formatDuration, formatRelativeTime } from "@/utils/format";
import { IMG } from "@/lib/imageUrls";
import CategoryMediaPlaceholder from "@/components/brand/CategoryMediaPlaceholder";
import CreatorBadges from "@/components/brand/CreatorBadges";
import VideoHoverPreview from "./VideoHoverPreview";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const HOVER_PREVIEW_DEBOUNCE_MS = 280;

type Props = { video: PileItVideo };

/**
 * YouTube-style row card: 16:9 thumbnail + always-visible metadata (no hover popup).
 * Fine-pointer hover on the thumbnail plays a Mux preview after a short delay; optional unmute via control.
 */
export default function VideoItemWithHover({ video }: Props) {
  const { openDetail } = useDetailModal();
  const [imgFailed, setImgFailed] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(true);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coarsePointer = useCoarsePointer();
  const prefersReducedMotion = usePrefersReducedMotion();
  const src = video.thumbnailUrl;
  const playbackId = video.playbackId?.trim() ?? "";
  const canHoverPreview =
    Boolean(playbackId) &&
    !video.isLocked &&
    !coarsePointer &&
    !prefersReducedMotion;

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current != null) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current != null) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  const onThumbPointerEnter = useCallback(() => {
    if (!canHoverPreview) return;
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      setPreviewActive(true);
    }, HOVER_PREVIEW_DEBOUNCE_MS);
  }, [canHoverPreview, clearPreviewTimer]);

  const onThumbPointerLeave = useCallback(() => {
    clearPreviewTimer();
    setPreviewActive(false);
    setPreviewMuted(true);
  }, [clearPreviewTimer]);

  const showPlaceholder = !src || imgFailed;
  const watchHref = `/watch/${encodeURIComponent(video.id)}`;
  const rel = formatRelativeTime(video.createdAt);
  const statsParts = [
    `${formatCount(video.viewCount)} views`,
    rel || formatDuration(video.durationSeconds),
    `${formatCount(video.tipCount)} tips`,
  ];

  const titleLineHeight = 1.3;

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        transition: (theme) =>
          theme.transitions.create("background-color", { duration: theme.transitions.duration.shortest }),
        "&:hover": {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          pt: "56.25%",
          bgcolor: "#000",
          isolation: "isolate",
          borderRadius: "8px 8px 0 0",
        }}
        onPointerEnter={onThumbPointerEnter}
        onPointerLeave={onThumbPointerLeave}
      >
        {showPlaceholder ? (
          <CategoryMediaPlaceholder category={video.category} variant="card" />
        ) : null}
        {src && !imgFailed ? (
          <Image
            src={IMG.cardThumb(src)}
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
            quality={70}
            loading="lazy"
            style={{
              objectFit: "cover",
              opacity: previewActive ? 0 : 1,
              transition: "opacity 0.2s ease",
            }}
            onError={() => setImgFailed(true)}
          />
        ) : null}
        <VideoHoverPreview
          playbackId={playbackId}
          accentColor={video.creator.accentColor}
          active={previewActive}
          muted={previewMuted}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            background:
              "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.55) 100%)",
            pointerEvents: "none",
          }}
        />
        <Box
          component={Link}
          href={watchHref}
          aria-label={`Watch ${video.title}`}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            color: "inherit",
            textDecoration: "none",
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
              zIndex: 4,
              pointerEvents: "none",
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
              right: previewActive && canHoverPreview ? 48 : 8,
              zIndex: 4,
              pointerEvents: "none",
              bgcolor: "rgba(0,0,0,0.75)",
              color: "#fff",
              height: 22,
              fontSize: 11,
            }}
          />
        )}
        {previewActive && canHoverPreview ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPreviewMuted((m) => !m);
            }}
            aria-label={previewMuted ? "Unmute preview" : "Mute preview"}
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              zIndex: 5,
              color: "#fff",
              bgcolor: "rgba(0,0,0,0.45)",
              "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
            }}
          >
            {previewMuted ? (
              <VolumeOffIcon sx={{ fontSize: 22 }} />
            ) : (
              <VolumeUpIcon sx={{ fontSize: 22 }} />
            )}
          </IconButton>
        ) : null}
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            zIndex: 4,
            pointerEvents: "none",
            color: "#fff",
            fontWeight: 700,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}
        >
          {formatDuration(video.durationSeconds)}
        </Typography>
      </Box>

      <Stack
        direction="row"
        spacing={1.25}
        alignItems="flex-start"
        sx={{ pt: 1.25, pb: 1, px: 1, pr: 0.5 }}
      >
        <Box
          component={Link}
          href={`/creator/${encodeURIComponent(video.creator.handle)}`}
          sx={{ flexShrink: 0, mt: "1px" }}
          aria-label={`${video.creator.displayName} channel`}
        >
          <Avatar
            src={video.creator.avatarUrl ? IMG.avatar(video.creator.avatarUrl) : undefined}
            alt=""
            sx={{
              width: 30,
              height: 30,
              fontSize: "0.65rem",
              border: `1px solid ${video.creator.accentColor}`,
              bgcolor: "#1a0f05",
            }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              minHeight: (theme) => {
                const sub = theme.typography.subtitle1;
                const fs =
                  typeof sub.fontSize === "string" ? sub.fontSize : `${sub.fontSize ?? 16}px`;
                return `calc(2 * ${titleLineHeight} * ${fs})`;
              },
              mb: 0.5,
            }}
          >
            <Link
              href={watchHref}
              style={{ textDecoration: "none", color: "inherit" }}
              aria-label={video.title}
            >
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  fontStyle: "normal",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: titleLineHeight,
                  fontSize: { xs: "0.9rem", sm: "1rem" },
                }}
              >
                {video.title}
              </Typography>
            </Link>
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" sx={{ mb: 0.25 }}>
            <Typography variant="caption" color="text.secondary" component="span">
              {video.creator.displayName}
            </Typography>
            <CreatorBadges
              verified={video.creator.verified}
              monetizationEligible={video.creator.monetizationEligible}
              size="small"
            />
          </Stack>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5} sx={{ rowGap: 0.25 }}>
            <Typography variant="caption" color="text.secondary" component="span">
              {statsParts.join(" • ")}
            </Typography>
            {video.isLocked ? (
              <Chip
                label="Subs Only"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  bgcolor: "rgba(0,0,0,0.35)",
                  color: "text.secondary",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            ) : (
              <Chip label="Free" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
            )}
          </Stack>
        </Box>
        <IconButton
          size="small"
          aria-label="More about this video"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openDetail(video);
          }}
          sx={{ flexShrink: 0, mt: -0.25, color: "text.secondary" }}
        >
          <MoreVertIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Stack>
    </Box>
  );
}
