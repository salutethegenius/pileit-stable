"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Paper from "@mui/material/Paper";
import Fab from "@mui/material/Fab";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import ChatIcon from "@mui/icons-material/Chat";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import VideoPlayer from "@/components/VideoPlayer";
import LockGate from "./LockGate";
import PilePanel from "./PilePanel";
import ReportContentDialog from "./ReportContentDialog";
import TipModal from "./TipModal";
import SubscribeModal from "./SubscribeModal";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { formatCount, formatCreatorAudienceLine } from "@/utils/format";
import type { PileItVideo } from "@/types/content";
import { IMG } from "@/lib/imageUrls";
import { apiFetch, getApiBase } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

type Props = { video: PileItVideo };

export default function WatchPageClient({ video }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const { accessToken } = useAuth();
  const [tipOpen, setTipOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [pileSheet, setPileSheet] = useState(false);
  const [reportVideoOpen, setReportVideoOpen] = useState(false);
  const [optimisticSub, setOptimisticSub] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");

  // --- Like / Dislike ---
  const [liked, setLiked] = useState(video.userLiked ?? false);
  const [disliked, setDisliked] = useState(video.userDisliked ?? false);
  const [likeCount, setLikeCount] = useState(video.likeCount ?? 0);
  const [dislikeCount, setDislikeCount] = useState(video.dislikeCount ?? 0);

  // --- Follow ---
  const [following, setFollowing] = useState(video.viewerFollows ?? false);

  // --- Watchlist (local-only stub) ---
  const [onWatchlist, setOnWatchlist] = useState(false);

  const { subscribed: apiSub, loading: subLoading } = useSubscriptionCheck(
    video.creator.id
  );
  const subscribed = optimisticSub || apiSub;
  const price = video.creator.subscriptionPrice ?? 4.99;
  const showLock = video.isLocked && !subscribed && !subLoading;

  const viewRegisteredRef = useRef<string | null>(null);
  useEffect(() => {
    if (viewRegisteredRef.current === video.id) return;
    viewRegisteredRef.current = video.id;
    const base = getApiBase();
    void fetch(`${base}/videos/${encodeURIComponent(video.id)}/view`, {
      method: "POST",
    }).catch(() => {
      /* non-blocking */
    });
  }, [video.id]);

  // Hydrate reaction + follow state from API when authenticated
  useEffect(() => {
    if (!accessToken) return;
    const vid = encodeURIComponent(video.id);
    apiFetch<{ liked: boolean; disliked: boolean; like_count: number; dislike_count: number }>(
      `/videos/${vid}/reaction`,
      { accessToken },
    )
      .then((r) => {
        setLiked(r.liked);
        setDisliked(r.disliked);
        setLikeCount(r.like_count);
        setDislikeCount(r.dislike_count);
      })
      .catch(() => {});
    apiFetch<{ following: boolean }>(
      `/follows/check/${encodeURIComponent(video.creator.id)}`,
      { accessToken },
    )
      .then((r) => setFollowing(r.following))
      .catch(() => {});
  }, [video.id, video.creator.id, accessToken]);

  const handleLike = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await apiFetch<{ liked: boolean; disliked: boolean; like_count: number; dislike_count: number }>(
        `/videos/${encodeURIComponent(video.id)}/like`,
        { method: "POST", accessToken },
      );
      setLiked(r.liked);
      setDisliked(r.disliked);
      setLikeCount(r.like_count);
      setDislikeCount(r.dislike_count);
    } catch { /* silent */ }
  }, [video.id, accessToken]);

  const handleDislike = useCallback(async () => {
    if (!accessToken) return;
    try {
      const r = await apiFetch<{ liked: boolean; disliked: boolean; like_count: number; dislike_count: number }>(
        `/videos/${encodeURIComponent(video.id)}/dislike`,
        { method: "POST", accessToken },
      );
      setLiked(r.liked);
      setDisliked(r.disliked);
      setLikeCount(r.like_count);
      setDislikeCount(r.dislike_count);
    } catch { /* silent */ }
  }, [video.id, accessToken]);

  const handleFollow = useCallback(async () => {
    if (!accessToken) return;
    try {
      if (following) {
        await apiFetch(`/follows/${encodeURIComponent(video.creator.id)}`, {
          method: "DELETE",
          accessToken,
        });
        setFollowing(false);
      } else {
        await apiFetch("/follows", {
          method: "POST",
          accessToken,
          body: JSON.stringify({ creator_id: video.creator.id }),
        });
        setFollowing(true);
      }
    } catch { /* silent */ }
  }, [video.creator.id, accessToken, following]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: video.title, url });
        return;
      }
    } catch { /* user cancelled or not supported — fall through to clipboard */ }
    try {
      await navigator.clipboard.writeText(url);
      setSnackMsg("Link copied to clipboard");
    } catch {
      setSnackMsg("Could not copy link");
    }
  }, [video.title]);

  const handleWatchlist = useCallback(() => {
    setOnWatchlist((prev) => {
      setSnackMsg(prev ? "Removed from watchlist" : "Added to watchlist");
      return !prev;
    });
  }, []);

  const stats = useMemo(
    () => [
      { label: "Views", value: formatCount(video.viewCount) },
      { label: "Tips", value: formatCount(video.tipCount) },
      { label: "Pile", value: formatCount(video.pileCount ?? 0) },
      { label: "Shares", value: formatCount(video.shareCount ?? 0) },
    ],
    [video]
  );

  const playbackId = video.playbackId?.trim() ?? "";
  const isMuxLive = video.streamSource === "mux_live";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        minHeight: { md: "calc(100vh - 64px)" },
        bgcolor: "background.default",
        width: "100%",
        maxWidth: 1440,
        mx: "auto",
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
          {!showLock && playbackId ? (
            <VideoPlayer
              playbackId={playbackId}
              streamType={isMuxLive ? "live" : "on-demand"}
              poster={video.thumbnailUrl ? IMG.videoPoster(video.thumbnailUrl) : undefined}
              accentColor={video.creator.accentColor}
              metadata={{
                video_id: video.id,
                video_title: video.title,
              }}
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
              {formatCreatorAudienceLine(video.creator)}
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
          {accessToken && (
            <Button
              variant={following ? "contained" : "outlined"}
              size="small"
              onClick={handleFollow}
              sx={{ textTransform: "none" }}
            >
              {following ? "Following" : "Follow"}
            </Button>
          )}
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
          <Stack direction="row" alignItems="center" sx={{ ml: { xs: 0, sm: 1 } }}>
            <IconButton onClick={handleLike} color={liked ? "primary" : "default"} aria-label="Like">
              {liked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
            </IconButton>
            <Typography variant="body2" sx={{ mr: 1 }}>{formatCount(likeCount)}</Typography>
            <IconButton onClick={handleDislike} color={disliked ? "error" : "default"} aria-label="Dislike">
              {disliked ? <ThumbDownIcon /> : <ThumbDownOutlinedIcon />}
            </IconButton>
            <Typography variant="body2">{formatCount(dislikeCount)}</Typography>
          </Stack>
          <Button variant="text" color="inherit" onClick={handleWatchlist}>
            {onWatchlist ? "\u2713 SAVED" : "+ WATCHLIST"}
          </Button>
          <Button variant="text" color="inherit" onClick={handleShare}>
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
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={3000}
        onClose={() => setSnackMsg("")}
        message={snackMsg}
      />
    </Box>
  );
}
