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

export default function MiniPortal({ video, anchorElement }: Props) {
  const setPortal = usePortal();
  const { openDetail } = useDetailModal();
  const rect = anchorElement.getBoundingClientRect();

  return (
    <Card
      onPointerLeave={() => setPortal(null, null)}
      sx={{
        width: rect.width * 1.5,
        height: "100%",
        bgcolor: "#2a2a2a",
        border: "1px solid #333",
        borderRadius: 1,
        boxShadow: "0 16px 48px rgba(0,0,0,0.65)",
        overflow: "hidden",
      }}
    >
      <BoxImage video={video} />
      <CardContent sx={{ pt: 1.5, pb: 1 }}>
        <Stack spacing={1}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ flexWrap: "nowrap" }}
          >
            <IconButton
              component={Link}
              href={`/watch/${video.id}`}
              sx={{ p: 0, color: "text.primary" }}
              aria-label="Play"
            >
              <PlayCircleIcon sx={{ width: 40, height: 40 }} />
            </IconButton>
            <IconButton size="small" sx={{ color: "text.primary" }} aria-label="Add to list">
              <AddIcon />
            </IconButton>
            <IconButton size="small" sx={{ color: "text.primary" }} aria-label="Like">
              <ThumbUpOffAltIcon />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 8 }} />
            <IconButton
              size="small"
              sx={{ color: "primary.main" }}
              aria-label="Tip creator"
            >
              <AttachMoneyIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => openDetail(video)}
              sx={{ color: "text.primary" }}
              aria-label="More info"
            >
              <ExpandMoreIcon />
            </IconButton>
          </Stack>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
            <Typography
              variant="body2"
              component="span"
              sx={{ color: "text.primary", fontWeight: 500 }}
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
                  height: 22,
                  bgcolor: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  border: "1px solid #444",
                }}
              />
            ) : (
              <Chip label="Free" size="small" sx={{ height: 22 }} />
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar
              src={
                video.creator.avatarUrl
                  ? IMG.avatar(video.creator.avatarUrl)
                  : undefined
              }
              sx={{ width: 28, height: 28 }}
            />
            <Typography variant="body2" fontWeight={700}>
              {video.creator.displayName}
            </Typography>
            <CreatorBadges
              verified={video.creator.verified}
              monetizationEligible={video.creator.monetizationEligible}
              size="small"
            />
          </Stack>
          <Typography variant="subtitle1" fontWeight={800} fontStyle="italic">
            {video.title}
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            <Chip label={video.category} size="small" variant="outlined" />
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
          alt=""
          fill
          sizes="520px"
          quality={72}
          loading="lazy"
          style={{ objectFit: "cover" }}
          onError={() => setImgFailed(true)}
        />
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          left: 0,
          right: 0,
          bottom: 0,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 4,
          position: "absolute",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, width: "80%" }}>
          {video.title}
        </Typography>
      </div>
    </div>
  );
}
