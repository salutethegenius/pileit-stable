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
 * Fine-pointer hover on the thumbnail plays a muted Mux preview after a short delay.
 */
export default function VideoItemWithHover({ video }: Props) {
  const { openDetail } = useDetailModal();
  const [imgFailed, setImgFailed] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
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
  }, [clearPreviewTimer]);

  const showPlaceholder = !src || imgFailed;
  const watchHref = `/watch/${encodeURIComponent(video.id)}`;
  const rel = formatRelativeTime(video.createdAt);
  const statsParts = [
    `${formatCount(video.viewCount)} views`,
    rel || formatDuration(video.durationSeconds),
    `${formatCount(video.tipCount)} tips`,
  ];

  return (
    <Box
      sx={{
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "transparent",
      }}
    >
      <Link
        href={watchHref}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
        aria-label={`Watch ${video.title}`}
      >
        <Box
          sx={{
            position: "relative",
            pt: "56.25%",
            bgcolor: "#000",
            isolation: "isolate",
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
          {video.isNew && (
            <Chip
              label="NEW"
              size="small"
              sx={{
                position: "absolute",
                top: 8,
                left: 8,
                zIndex: 3,
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
                zIndex: 3,
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
              zIndex: 3,
              color: "#fff",
              fontWeight: 700,
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
            }}
          >
            {formatDuration(video.durationSeconds)}
          </Typography>
        </Box>
      </Link>

      <Stack
        direction="row"
        spacing={1.25}
        alignItems="flex-start"
        sx={{ pt: 1.25, pb: 1, px: 1, pr: 0.5 }}
      >
        <Box
          component={Link}
          href={`/creator/${encodeURIComponent(video.creator.handle)}`}
          sx={{ flexShrink: 0, mt: 0.25 }}
          aria-label={`${video.creator.displayName} channel`}
        >
          <Avatar
            src={video.creator.avatarUrl ? IMG.avatar(video.creator.avatarUrl) : undefined}
            alt=""
            sx={{ width: 36, height: 36 }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              /* Two lines: matches title Typography lineHeight 1.35 × body2 font size */
              minHeight: (theme) =>
                `calc(2 * 1.35 * ${theme.typography.body2.fontSize})`,
              mb: 0.5,
            }}
          >
            <Link
              href={watchHref}
              style={{ textDecoration: "none", color: "inherit" }}
              aria-label={video.title}
            >
              <Typography
                variant="body2"
                fontWeight={800}
                fontStyle="italic"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: 1.35,
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
