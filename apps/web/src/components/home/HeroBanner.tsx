"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import CreatorBadges from "@/components/brand/CreatorBadges";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { PileItVideo } from "@/types/content";
import { useDetailModal } from "@/providers/DetailModalProvider";
import { formatCount } from "@/utils/format";
import { categoryHeroChipBg } from "@/utils/categoryStyles";
import { IMG } from "@/lib/imageUrls";

type Slide = { video: PileItVideo; badge: string };

export default function HeroBanner({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const { openDetail } = useDetailModal();

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 8000);
    return () => clearInterval(t);
  }, [slides.length]);

  const { video, badge } = slides[index] ?? slides[0];
  const chipBg = categoryHeroChipBg(video.category);

  return (
    <Box
      sx={{
        position: "relative",
        height: "70vh",
        minHeight: 420,
        width: "100%",
        overflow: "hidden",
      }}
    >
      {slides.map((s, i) => (
        <Box
          key={s.video.id}
          sx={{
            position: "absolute",
            inset: 0,
            opacity: i === index ? 1 : 0,
            transition: "opacity 0.8s ease",
            backgroundImage: `linear-gradient(120deg, rgba(20,20,20,0.92) 35%, rgba(20,20,20,0.4) 100%), url(${IMG.heroBackdrop(s.video.backdropUrl || s.video.thumbnailUrl)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ))}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          p: { xs: 3, md: 5 },
          pb: 6,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(20,20,20,0.95) 100%)",
        }}
      >
        <Chip
          label={badge}
          size="small"
          sx={{
            mb: 2,
            bgcolor: chipBg,
            color: "#fff",
            fontWeight: 700,
            letterSpacing: 0.02,
            "& .MuiChip-label": { px: 1.25 },
          }}
        />
        <Typography
          component="h1"
          variant="h3"
          sx={{
            fontSize: { xs: 36, md: 56 },
            lineHeight: 1.05,
            maxWidth: 720,
            mb: 2,
          }}
        >
          {video.creator.displayName}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            maxWidth: 560,
            color: "text.secondary",
            mb: 3,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {video.description}
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 2 }}>
          <Button
            component={Link}
            href={`/watch/${video.id}`}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PlayArrowIcon />}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Watch Now
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<InfoOutlinedIcon />}
            onClick={() => openDetail(video)}
            sx={{
              textTransform: "none",
              borderColor: "#666",
              color: "text.primary",
              "&:hover": { borderColor: "#999" },
            }}
          >
            More Info
          </Button>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={
              video.creator.avatarUrl
                ? IMG.avatar(video.creator.avatarUrl)
                : undefined
            }
            alt={`${video.creator.displayName} avatar`}
            sx={{ width: 48, height: 48 }}
          />
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
              <Typography fontWeight={700}>{video.creator.displayName}</Typography>
              <CreatorBadges
                verified={video.creator.verified}
                monetizationEligible={video.creator.monetizationEligible}
                size="medium"
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {formatCount(video.creator.subscriberCount)} subscribers
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
