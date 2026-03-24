"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Paper from "@mui/material/Paper";
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

type Props = { video: PileItVideo };

/**
 * YouTube-style row card: 16:9 thumbnail + always-visible metadata (no hover popup).
 */
export default function VideoItemWithHover({ video }: Props) {
  const { openDetail } = useDetailModal();
  const [imgFailed, setImgFailed] = useState(false);
  const src = video.thumbnailUrl;

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const showPlaceholder = !src || imgFailed;
  const watchHref = `/watch/${encodeURIComponent(video.id)}`;
  const rel = formatRelativeTime(video.createdAt);
  const statsParts = [
    `${formatCount(video.viewCount)} views`,
    rel || formatDuration(video.durationSeconds),
    `${formatCount(video.tipCount)} tips`,
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
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
          }}
        >
          {showPlaceholder ? (
            <CategoryMediaPlaceholder category={video.category} variant="card" />
          ) : null}
          {src && !imgFailed ? (
            <Image
              src={IMG.cardThumb(src)}
              alt=""
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
                mb: 0.5,
              }}
            >
              {video.title}
            </Typography>
          </Link>
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
    </Paper>
  );
}
