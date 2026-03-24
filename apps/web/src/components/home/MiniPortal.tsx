"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import AddIcon from "@mui/icons-material/Add";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CreatorBadges from "@/components/brand/CreatorBadges";
import type { PileItVideo } from "@/types/content";
import { usePortal } from "@/providers/PortalProvider";
import { useDetailModal } from "@/providers/DetailModalProvider";
import { formatCount, formatDuration } from "@/utils/format";
import { IMG } from "@/lib/imageUrls";
import CategoryMediaPlaceholder from "@/components/brand/CategoryMediaPlaceholder";

type Props = { video: PileItVideo; anchorElement: HTMLElement };

/** Hover preview: slightly wider than the tile, but capped so it stays a “mini” popup. */
function miniPortalWidth(rectWidth: number): number {
  const w = Math.round(rectWidth * 1.06);
  return Math.min(240, Math.max(168, w));
}

export default function MiniPortal({ video, anchorElement }: Props) {
  const setPortal = usePortal();
  const { openDetail } = useDetailModal();
  const rect = anchorElement.getBoundingClientRect();
  const watchHref = `/watch/${encodeURIComponent(video.id)}`;
  const cardWidth = miniPortalWidth(rect.width);

  return (
    <Card
      onPointerLeave={() => setPortal(null, null)}
      sx={{
        width: cardWidth,
        maxWidth: "min(240px, 92vw)",
        bgcolor: "#2a2a2a",
        border: "1px solid #333",
        borderRadius: 1,
        boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
        overflow: "hidden",
        "&:hover .pileit-mini-play": {
          color: "primary.main",
          transform: "scale(1.07)",
          filter: "drop-shadow(0 0 10px rgba(234, 88, 12, 0.5))",
        },
      }}
    >
      <Box
        component={Link}
        href={watchHref}
        sx={{
          display: "block",
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: 2,
          },
        }}
        aria-label={`Play ${video.title}`}
      >
        <BoxImage video={video} />
      </Box>
      <CardContent sx={{ pt: 1, pb: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
        <Stack spacing={0.5}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ flexWrap: "nowrap" }}
          >
            <IconButton
              className="pileit-mini-play"
              component={Link}
              href={watchHref}
              sx={{
                p: 0,
                color: "text.primary",
                transition: "color 0.18s ease, transform 0.18s ease, filter 0.18s ease",
                "&:hover": {
                  color: "primary.light",
                  transform: "scale(1.14)",
                  filter: "drop-shadow(0 0 12px rgba(234, 88, 12, 0.65))",
                },
              }}
              aria-label={`Play ${video.title}`}
            >
              <PlayCircleIcon sx={{ width: 28, height: 28 }} />
            </IconButton>
            <IconButton size="small" sx={{ color: "text.primary", p: 0.35 }} aria-label="Add to list">
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" sx={{ color: "text.primary", p: 0.35 }} aria-label="Like">
              <ThumbUpOffAltIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 8 }} />
            <IconButton
              size="small"
              sx={{ color: "primary.main", p: 0.35 }}
              aria-label="Tip creator"
            >
              <AttachMoneyIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => openDetail(video)}
              sx={{ color: "text.primary", p: 0.35 }}
              aria-label="More info"
            >
              <ExpandMoreIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.5}>
            <Typography
              variant="caption"
              component="span"
              sx={{ color: "text.primary", fontWeight: 500, lineHeight: 1.35 }}
            >
              {formatCount(video.viewCount)} views
              <Box component="span" sx={{ color: "text.secondary", mx: 0.75 }}>
                •
              </Box>
              {formatDuration(video.durationSeconds)}
              <Box component="span" sx={{ color: "text.secondary", mx: 0.75 }}>
                •
              </Box>
              {formatCount(video.tipCount)} tips
            </Typography>
            {video.isLocked ? (
              <Chip
                label="Subs Only"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  bgcolor: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  border: "1px solid #444",
                }}
              />
            ) : (
              <Chip label="Free" size="small" sx={{ height: 20, fontSize: "0.65rem" }} />
            )}
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Avatar
              src={
                video.creator.avatarUrl
                  ? IMG.avatar(video.creator.avatarUrl)
                  : undefined
              }
              alt={`${video.creator.displayName} avatar`}
              sx={{ width: 22, height: 22 }}
            />
            <Typography variant="caption" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {video.creator.displayName}
            </Typography>
            <CreatorBadges
              verified={video.creator.verified}
              monetizationEligible={video.creator.monetizationEligible}
              size="small"
            />
          </Stack>
          <Typography variant="body2" fontWeight={800} fontStyle="italic" sx={{ lineHeight: 1.25 }}>
            {video.title}
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            <Chip
              label={video.category}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.65rem" }}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function BoxImage({ video }: { video: PileItVideo }) {
  const src = video.backdropUrl || video.thumbnailUrl;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const showPlaceholder = !src || imgFailed;

  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        paddingTop: "calc(9 / 16 * 100%)",
      }}
    >
      {showPlaceholder ? (
        <CategoryMediaPlaceholder category={video.category} variant="portal" />
      ) : null}
      {src && !imgFailed ? (
        <Image
          src={IMG.portalThumb(src)}
          alt={`${video.title} preview image`}
          fill
          sizes="240px"
          quality={68}
          loading="lazy"
          style={{ objectFit: "cover" }}
          onError={() => setImgFailed(true)}
        />
      ) : null}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          left: 0,
          right: 0,
          bottom: 0,
          px: 1,
          pb: 0.25,
          position: "absolute",
          pointerEvents: "none",
        }}
      >
        <Typography
          component="p"
          variant="caption"
          sx={{ fontWeight: 700, width: "90%", m: 0, lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.85)" }}
        >
          {video.title}
        </Typography>
      </Box>
    </div>
  );
}
