"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CreatorBadges from "@/components/brand/CreatorBadges";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { PileItVideo } from "@/types/content";
import { useDetailModal } from "@/providers/DetailModalProvider";
import { formatCount } from "@/utils/format";
import { categoryHeroChipBg } from "@/utils/categoryStyles";
import { IMG } from "@/lib/imageUrls";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { useMobileNarrow } from "@/hooks/useMobileNarrow";

type Slide = { video: PileItVideo; badge: string };

/** Bundle: mobile layout below 768px (MUI `md` is 900px — do not use theme md for this). */
const MQ_MAX_MOBILE = "@media (max-width: 767.98px)";
const MQ_MIN_DESKTOP = "@media (min-width: 768px)";

/** Default claim-art hero; swap to `/pileit-claim-hero.svg` via `leadBackdropSrc` if you need a brighter vector. */
const DEFAULT_CLAIM_HERO = "/pileit-claim-hero.png";

type Props = {
  slides: Slide[];
  /** Shown as the first hero backdrop before video slides (public path under /public). */
  leadBackdropSrc?: string | null;
};

export default function HeroBanner({
  slides,
  leadBackdropSrc = DEFAULT_CLAIM_HERO,
}: Props) {
  const [index, setIndex] = useState(0);
  const { openDetail } = useDetailModal();
  const coarsePointer = useCoarsePointer();
  const mobileNarrow = useMobileNarrow();

  const useLead = Boolean(leadBackdropSrc);
  const slideCount = slides.length + (useLead ? 1 : 0);

  useEffect(() => {
    if (slideCount <= 1 || coarsePointer) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slideCount);
    }, 8000);
    return () => clearInterval(t);
  }, [slideCount, coarsePointer]);

  const onClaimLead = useLead && index === 0;
  const videoSlide = onClaimLead ? slides[0] : useLead ? slides[index - 1] : slides[index];
  const video = videoSlide?.video;
  const badge = videoSlide?.badge ?? "Creators";

  if (slideCount === 0) {
    return null;
  }

  const chipBg = video ? categoryHeroChipBg(video.category) : "rgba(249, 115, 22, 0.35)";

  const btnStackSx = {
    display: "flex",
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 2,
    mb: 2,
    width: 1,
    [MQ_MAX_MOBILE]: { flexDirection: "column" as const, mb: 1 },
    [MQ_MIN_DESKTOP]: { flexDirection: "row" as const, mb: 2 },
  };

  const btnFullMobileSx = {
    [MQ_MAX_MOBILE]: { width: "100%" },
    [MQ_MIN_DESKTOP]: { width: "auto" },
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        [MQ_MAX_MOBILE]: { height: "50dvh", minHeight: 320 },
        [MQ_MIN_DESKTOP]: { height: "70vh", minHeight: 420 },
      }}
    >
      {useLead ? (
        <Box
          key="pileit-claim-hero"
          sx={{
            position: "absolute",
            inset: 0,
            opacity: index === 0 ? 1 : 0,
            transition: "opacity 0.8s ease",
            backgroundImage: `linear-gradient(120deg, rgba(12,10,8,0.72) 28%, rgba(20,18,16,0.35) 55%, rgba(14,12,10,0.2) 100%), url(${leadBackdropSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            [MQ_MAX_MOBILE]: { backgroundPosition: "75% top" },
          }}
        />
      ) : null}
      {slides.map((s, i) => {
        const layerIndex = useLead ? i + 1 : i;
        return (
          <Box
            key={s.video.id}
            sx={{
              position: "absolute",
              inset: 0,
              opacity: layerIndex === index ? 1 : 0,
              transition: "opacity 0.8s ease",
              backgroundImage: `linear-gradient(120deg, rgba(20,20,20,0.92) 35%, rgba(20,20,20,0.4) 100%), url(${IMG.heroBackdrop(s.video.backdropUrl || s.video.thumbnailUrl)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        );
      })}
      <Box
        sx={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(20,20,20,0.95) 100%)",
          [MQ_MAX_MOBILE]: {
            p: 3,
            pt: 4,
            pb: "calc(16px + env(safe-area-inset-bottom, 0px))",
          },
          [MQ_MIN_DESKTOP]: {
            p: 5,
            pt: 5,
            pb: "calc(48px + env(safe-area-inset-bottom, 0px))",
          },
        }}
      >
        {onClaimLead ? (
          <>
            <Chip
              label="For creators"
              size="small"
              sx={{
                mb: 2,
                bgcolor: "rgba(249, 115, 22, 0.28)",
                color: "#fed7aa",
                fontWeight: 800,
                letterSpacing: "0.12em",
                fontSize: 11,
                textTransform: "uppercase",
                border: "1px solid rgba(251, 146, 60, 0.35)",
                "& .MuiChip-label": { px: 1.25 },
              }}
            />
            <Typography
              component="h1"
              variant="h3"
              sx={{
                fontFamily: 'var(--font-barlow), "Barlow Condensed", Impact, sans-serif',
                fontWeight: 800,
                fontStyle: "italic",
                fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
                lineHeight: 1.05,
                [MQ_MAX_MOBILE]: {
                  fontSize: "clamp(1.85rem, 6vw, 2.75rem)",
                },
                maxWidth: 720,
                mb: 2,
                color: "#f5f5f5",
                textShadow: "0 2px 24px rgba(0,0,0,0.5)",
              }}
            >
              This is your stage.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                maxWidth: 520,
                color: "rgba(255,255,255,0.78)",
                mb: 3,
                lineHeight: 1.55,
                [MQ_MIN_DESKTOP]: { fontSize: "1.05rem" },
              }}
            >
              Claim this page and start building your audience on PileIt — tips, subs, and The Pile,
              built for The Bahamas.
            </Typography>
            <Stack sx={btnStackSx}>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                color="primary"
                size="large"
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  fontStyle: "italic",
                  ...btnFullMobileSx,
                }}
              >
                Claim your channel
              </Button>
              <Button
                component={Link}
                href={video ? `/watch/${encodeURIComponent(video.id)}` : "/browse#trending"}
                variant="outlined"
                size="large"
                startIcon={<PlayArrowIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "rgba(255,255,255,0.45)",
                  color: "#fff",
                  ...btnFullMobileSx,
                  "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.06)" },
                }}
              >
                Watch now
              </Button>
            </Stack>
          </>
        ) : (
          <>
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
              {video!.creator.displayName}
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
              {video!.description}
            </Typography>
            <Stack sx={btnStackSx}>
              <Button
                component={Link}
                href={`/watch/${video!.id}`}
                variant="contained"
                color="primary"
                size="large"
                startIcon={<PlayArrowIcon />}
                sx={{ textTransform: "none", fontWeight: 700, ...btnFullMobileSx }}
              >
                Watch Now
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<InfoOutlinedIcon />}
                onClick={() => openDetail(video!)}
                sx={{
                  textTransform: "none",
                  borderColor: "#666",
                  color: "text.primary",
                  ...btnFullMobileSx,
                  "&:hover": { borderColor: "#999" },
                }}
              >
                More Info
              </Button>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={
                  video!.creator.avatarUrl
                    ? IMG.avatar(video!.creator.avatarUrl)
                    : undefined
                }
                alt={`${video!.creator.displayName} avatar`}
                sx={{ width: 48, height: 48 }}
              />
              <Box>
                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                  <Typography fontWeight={700}>{video!.creator.displayName}</Typography>
                  <CreatorBadges
                    verified={video!.creator.verified}
                    monetizationEligible={video!.creator.monetizationEligible}
                    size="medium"
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {formatCount(video!.creator.subscriberCount)} subscribers
                </Typography>
              </Box>
            </Stack>
          </>
        )}

        {mobileNarrow && slideCount > 1 ? (
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            alignItems="center"
            role="tablist"
            aria-label="Hero slides"
            sx={{ mt: 2 }}
          >
            {Array.from({ length: slideCount }, (_, i) => (
              <IconButton
                key={i}
                size="small"
                aria-label={`Show slide ${i + 1} of ${slideCount}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                sx={{
                  p: 0.5,
                  color: i === index ? "primary.main" : "rgba(255,255,255,0.4)",
                }}
              >
                <Box
                  sx={{
                    width: i === index ? 10 : 8,
                    height: i === index ? 10 : 8,
                    borderRadius: "50%",
                    bgcolor: "currentColor",
                    boxShadow: i === index ? "0 0 0 2px rgba(249,115,22,0.35)" : "none",
                  }}
                />
              </IconButton>
            ))}
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
