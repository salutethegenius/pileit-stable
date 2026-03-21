"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CreatorBadges from "@/components/brand/CreatorBadges";
import { useDetailModal } from "@/providers/DetailModalProvider";
import { formatCount, formatDuration } from "@/utils/format";
import ContentRow from "./ContentRow";
import { getVideosByCreatorHandle } from "@/data/mock";
import { getApiBase } from "@/lib/api";
import { mapApiToPileItVideo, type ApiVideoRow } from "@/lib/mapApiVideo";
import { IMG } from "@/lib/imageUrls";
import { formatBsd } from "@/utils/currency";
import type { PileItVideo } from "@/types/content";

function moreFromFallback(handle: string, excludeId: string): PileItVideo[] {
  return getVideosByCreatorHandle(handle).filter((v) => v.id !== excludeId);
}

export default function DetailModal() {
  const { detailVideo, closeDetail } = useDetailModal();
  const open = Boolean(detailVideo);
  const [moreFrom, setMoreFrom] = useState<PileItVideo[]>([]);
  const activeVideoIdRef = useRef<string | null>(null);
  activeVideoIdRef.current = detailVideo?.id ?? null;

  useEffect(() => {
    if (!detailVideo) {
      setMoreFrom([]);
      return;
    }

    const videoId = detailVideo.id;
    const handle = detailVideo.creator.handle;
    const controller = new AbortController();

    const stillActive = () =>
      !controller.signal.aborted && activeVideoIdRef.current === videoId;

    const applyFallback = () => {
      if (!stillActive()) return;
      setMoreFrom(moreFromFallback(handle, videoId));
    };

    const base = getApiBase();
    (async () => {
      try {
        const res = await fetch(
          `${base}/creators/${encodeURIComponent(handle)}/videos`,
          { signal: controller.signal }
        );
        if (!stillActive()) return;
        if (!res.ok) {
          applyFallback();
          return;
        }
        const data: unknown = await res.json();
        if (!stillActive()) return;
        if (!Array.isArray(data)) {
          applyFallback();
          return;
        }
        const mapped = (data as ApiVideoRow[])
          .map(mapApiToPileItVideo)
          .filter((v) => v.id !== videoId);
        if (!stillActive()) return;
        if (mapped.length > 0) {
          setMoreFrom(mapped);
        } else {
          applyFallback();
        }
      } catch {
        if (controller.signal.aborted) return;
        applyFallback();
      }
    })();

    return () => controller.abort();
  }, [detailVideo]);

  if (!detailVideo) return null;

  const subPrice = detailVideo.creator.subscriptionPrice ?? 4.99;
  const canMonetize = detailVideo.creator.monetizationEligible === true;
  /** Already sized in mapApiToPileItVideo / mock data */
  const avatarSrc = detailVideo.creator.avatarUrl || undefined;

  return (
    <Dialog
      open={open}
      onClose={closeDetail}
      fullScreen
      PaperProps={{
        sx: { bgcolor: "#141414", backgroundImage: "none" },
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: { xs: 220, sm: 360 },
          backgroundImage: `linear-gradient(to top, #141414 0%, transparent 55%), url(${IMG.heroBackdrop(detailVideo.backdropUrl || detailVideo.thumbnailUrl)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <IconButton
          onClick={closeDetail}
          sx={{ position: "absolute", top: 16, right: 16, bgcolor: "rgba(0,0,0,0.5)" }}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Button
            component={Link}
            href={`/watch/${detailVideo.id}`}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PlayArrowIcon />}
            sx={{ textTransform: "none", fontWeight: 800, px: 4 }}
            onClick={closeDetail}
          >
            Play
          </Button>
        </Box>
      </Box>
      <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
        <Typography component="h2" variant="h4" sx={{ mb: 2 }}>
          {detailVideo.title}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
          <Avatar
            src={avatarSrc}
            alt={`${detailVideo.creator.displayName} avatar`}
          />
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
              <Typography fontWeight={700}>{detailVideo.creator.displayName}</Typography>
              <CreatorBadges
                verified={detailVideo.creator.verified}
                monetizationEligible={detailVideo.creator.monetizationEligible}
                size="medium"
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {formatCount(detailVideo.creator.subscriberCount)} subscribers
            </Typography>
          </Box>
          <Button variant="outlined" size="small" sx={{ textTransform: "none" }}>
            Follow
          </Button>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip label={formatDuration(detailVideo.durationSeconds)} />
          <Chip label={`${formatCount(detailVideo.viewCount)} views`} />
          <Chip label={`${formatCount(detailVideo.tipCount)} tips`} />
          <Chip label={new Date(detailVideo.createdAt).toLocaleDateString()} />
        </Stack>
        {detailVideo.isLocked && canMonetize && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "primary.main",
              bgcolor: "rgba(249,115,22,0.08)",
            }}
          >
            <Typography fontWeight={800} fontStyle="italic" sx={{ mb: 1 }}>
              Subscribe to {detailVideo.creator.displayName} — {formatBsd(subPrice)}/mo
            </Typography>
            <Button variant="contained" color="primary" sx={{ textTransform: "none" }}>
              Subscribe
            </Button>
          </Box>
        )}
        {detailVideo.isLocked && !canMonetize && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Subscriber-only. This creator is not yet set up to accept subscriptions.
          </Typography>
        )}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {detailVideo.description}
        </Typography>
        {moreFrom.length > 0 && (
          <ContentRow
            title={`More from ${detailVideo.creator.displayName}`}
            videos={moreFrom}
          />
        )}
      </Box>
    </Dialog>
  );
}
