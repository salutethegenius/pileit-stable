"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import Fab from "@mui/material/Fab";
import ChatIcon from "@mui/icons-material/Chat";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import VideoPlayer from "./VideoPlayer";
import LockGate from "./LockGate";
import PilePanel from "./PilePanel";
import ReportContentDialog from "./ReportContentDialog";
import TipModal from "./TipModal";
import SubscribeModal from "./SubscribeModal";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { formatCount } from "@/utils/format";
import type { PileItVideo } from "@/types/content";
import { IMG } from "@/lib/imageUrls";

type Props = { video: PileItVideo };

export default function WatchPageClient({ video }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [tipOpen, setTipOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [pileSheet, setPileSheet] = useState(false);
  const [reportVideoOpen, setReportVideoOpen] = useState(false);
  const [optimisticSub, setOptimisticSub] = useState(false);

  const { subscribed: apiSub, loading: subLoading } = useSubscriptionCheck(
    video.creator.id
  );
  const subscribed = optimisticSub || apiSub;
  const price = video.creator.subscriptionPrice ?? 4.99;
  const showLock = video.isLocked && !subscribed && !subLoading;

  const stats = useMemo(
    () => [
      { label: "Views", value: formatCount(video.viewCount) },
      { label: "Tips", value: formatCount(video.tipCount) },
      { label: "Pile", value: formatCount(video.pileCount ?? 0) },
      { label: "Shares", value: formatCount(video.shareCount ?? 0) },
    ],
    [video]
  );

  const src = video.videoUrl ?? "";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        minHeight: { md: "calc(100vh - 64px)" },
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          flex: { md: "1 1 65%" },
          minWidth: 0,
          alignSelf: { md: "flex-start" },
          p: { xs: 2, md: 3 },
          pb: { xs: 10, md: 3 },
        }}
      >
        <Box sx={{ position: "relative", borderRadius: 1, overflow: "hidden" }}>
          {!showLock && src ? (
            <VideoPlayer
              src={src}
              poster={video.thumbnailUrl ? IMG.videoPoster(video.thumbnailUrl) : undefined}
              locked={false}
            />
          ) : (
            <Box
              sx={{
                position: "relative",
                pt: "56.25%",
                bgcolor: "#000",
                backgroundImage: video.thumbnailUrl
                  ? `url(${IMG.videoPoster(video.thumbnailUrl)})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {showLock && (
                <LockGate
                  creatorName={video.creator.displayName}
                  monthlyAmount={price}
                  onSubscribe={() => setSubOpen(true)}
                />
              )}
            </Box>
          )}
        </Box>

        <Typography
          component="h1"
          variant="h5"
          sx={{ mt: 2, mb: 1 }}
          fontStyle="italic"
          fontWeight={800}
        >
          {video.title}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
          <Avatar
            src={video.creator.avatarUrl}
            alt={`${video.creator.displayName} avatar`}
          />
          <Box>
            <Typography fontWeight={700}>{video.creator.displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCount(video.creator.subscriberCount)} subscribers
            </Typography>
          </Box>
          <Button
            component={Link}
            href={`/creator/${video.creator.handle}`}
            variant="outlined"
            size="small"
            sx={{ textTransform: "none" }}
          >
            View Channel
          </Button>
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }} alignItems="center">
          {video.creator.monetizationEligible === true ? (
            <>
              <Button variant="outlined" color="primary" onClick={() => setTipOpen(true)}>
                Tip Creator
              </Button>
              <Button variant="contained" color="primary" onClick={() => setSubOpen(true)}>
                Subscribe
              </Button>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              This creator is not yet approved to receive tips or subscriptions. They may still be
              completing payout verification.
            </Typography>
          )}
          <Button variant="text" color="inherit">
            + Watchlist
          </Button>
          <Button variant="text" color="inherit">
            Share
          </Button>
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {stats.map((s) => (
            <Paper
              key={s.label}
              elevation={0}
              sx={{
                px: 2,
                py: 1,
                bgcolor: "#2a2a2a",
                border: "1px solid #333",
                minWidth: 100,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
              <Typography fontWeight={800}>{s.value}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>

      <Box
        sx={{
          flex: { md: "0 0 35%" },
          width: { md: "35%" },
          maxWidth: { md: 480 },
          minHeight: { md: "calc(100vh - 64px)" },
          maxHeight: { md: "calc(100vh - 64px)" },
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
        }}
      >
        <PilePanel videoId={video.id} />
      </Box>

      {isMobile && (
        <>
          <Fab
            color="primary"
            sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1200 }}
            onClick={() => setPileSheet(true)}
            aria-label="Open pile"
          >
            <ChatIcon />
          </Fab>
          <PilePanel
            videoId={video.id}
            mobileOpen={pileSheet}
            onMobileClose={() => setPileSheet(false)}
          />
        </>
      )}

      <TipModal
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        creatorId={video.creator.id}
        creatorName={video.creator.displayName}
        videoId={video.id}
      />
      <SubscribeModal
        open={subOpen}
        onClose={() => setSubOpen(false)}
        creatorId={video.creator.id}
        creatorName={video.creator.displayName}
        monthlyAmount={price}
        onSubscribed={() => setOptimisticSub(true)}
      />
      <ReportContentDialog
        open={reportVideoOpen}
        onClose={() => setReportVideoOpen(false)}
        targetType="video"
        targetId={video.id}
        title="Report video"
      />
    </Box>
  );
}
