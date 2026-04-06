"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import type { Creator, PileItVideo } from "@/types/content";
import CreatorBadges from "@/components/brand/CreatorBadges";
import VideoItemWithHover from "@/components/home/VideoItemWithHover";
import TipModal from "@/components/watch/TipModal";
import SubscribeModal from "@/components/watch/SubscribeModal";
import { formatCount, formatMemberSince } from "@/utils/format";
import { PILEIT_THEME } from "@/theme/theme";
import { IMG } from "@/lib/imageUrls";
import { formatBsd } from "@/utils/currency";
import CategoryMediaPlaceholder from "@/components/brand/CategoryMediaPlaceholder";
import CreatorClaimModal from "@/components/creator/CreatorClaimModal";
import { apiFetch, formatApiErrorMessage, getApiBase } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import VideoPlayer from "@/components/VideoPlayer";
import Link from "next/link";
import type { ApiVideoRow } from "@/lib/mapApiVideo";

const LIVE_POLL_MS = 12_000;

type Props = { creator: Creator; videos: PileItVideo[] };

export default function CreatorChannelClient({ creator, videos }: Props) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [claimOpen, setClaimOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState<"all" | "free" | "locked">("all");
  const [tipOpen, setTipOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [cart, setCart] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [followerCount, setFollowerCount] = useState(creator.followerCount ?? 0);
  const [following, setFollowing] = useState(creator.viewerFollows === true);
  const [followBusy, setFollowBusy] = useState(false);
  const [followErr, setFollowErr] = useState<string | null>(null);
  /** Active Mux live for this creator (from GET /live-streams/active). */
  const [activeLive, setActiveLive] = useState<ApiVideoRow | null>(null);

  const isOwnChannel = user?.id === creator.id;
  const canUseCreatorUpload =
    user?.accountType === "creator" || user?.accountType === "admin";

  useEffect(() => {
    setAvatarFailed(false);
  }, [creator.avatarUrl]);

  useEffect(() => {
    setFollowerCount(creator.followerCount ?? 0);
    if (creator.viewerFollows === true) setFollowing(true);
  }, [creator.followerCount, creator.viewerFollows]);

  useEffect(() => {
    if (!accessToken || !creator.id) return;
    apiFetch<{ following: boolean }>(`/follows/check/${encodeURIComponent(creator.id)}`, {
      accessToken,
    })
      .then((r) => setFollowing(Boolean(r.following)))
      .catch((e) => console.warn("follow-status fetch failed", e));
  }, [accessToken, creator.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${getApiBase()}/live-streams/active`);
        if (!res.ok || cancelled) return;
        const rows = (await res.json()) as ApiVideoRow[];
        if (!Array.isArray(rows) || cancelled) return;
        const hit = rows.find(
          (r) => r.creator?.id === creator.id || r.creator_id === creator.id
        );
        if (!cancelled) setActiveLive(hit ?? null);
      } catch {
        if (!cancelled) setActiveLive(null);
      }
    };
    void load();
    const t = setInterval(() => void load(), LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [creator.id]);

  const handleFollowToggle = useCallback(async () => {
    if (!accessToken) {
      router.push(`/login?next=${encodeURIComponent(`/creator/${creator.handle}`)}`);
      return;
    }
    setFollowBusy(true);
    setFollowErr(null);
    try {
      if (following) {
        await apiFetch(`/follows/${encodeURIComponent(creator.id)}`, {
          method: "DELETE",
          accessToken,
        });
        setFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        const res = await apiFetch<{ status?: string }>("/follows", {
          method: "POST",
          accessToken,
          body: JSON.stringify({ creator_id: creator.id }),
        });
        setFollowing(true);
        if (res.status !== "already_following") {
          setFollowerCount((c) => c + 1);
        }
      }
    } catch (e) {
      setFollowErr(formatApiErrorMessage(e));
    } finally {
      setFollowBusy(false);
    }
  }, [accessToken, following, creator.id, creator.handle, router]);

  const showAvatarPlaceholder = !creator.avatarUrl || avatarFailed;

  const canMonetize = creator.monetizationEligible === true;
  const price = creator.subscriptionPrice ?? 4.99;
  const claimStatus = creator.claimStatus || "live";
  const showClaimUi = claimStatus !== "live";

  const filtered = useMemo(() => {
    let list =
      filter === "free"
        ? videos.filter((v) => !v.isLocked)
        : filter === "locked"
          ? videos.filter((v) => v.isLocked)
          : videos;
    if (activeLive?.id) list = list.filter((v) => v.id !== activeLive.id);
    return list;
  }, [videos, filter, activeLive?.id]);

  const mockProducts = [
    { id: "p1", name: "Island Crewneck", price: 45, image: creator.avatarUrl },
    { id: "p2", name: "Digital Preset Pack", price: 12, image: creator.avatarUrl },
  ];

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", pb: 6 }}>
      {cart > 0 && (
        <IconButton
          sx={{ position: "fixed", top: 80, right: 16, zIndex: 10, bgcolor: "#2a2a2a" }}
        >
          <Badge badgeContent={cart} color="primary">
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
      )}
      <Box
        sx={{
          height: 260,
          width: "100%",
          ...(creator.heroImageUrl
            ? {
                backgroundImage: `linear-gradient(to top, rgba(14,14,14,0.92), transparent 50%), url(${creator.heroImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background: `linear-gradient(135deg, ${creator.bannerColor ?? creator.accentColor}, #141414)`,
              }),
        }}
      />
      <Box sx={{ px: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto", mt: -8 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-end" }}>
          <Box
            sx={{
              position: "relative",
              width: 96,
              height: 96,
              flexShrink: 0,
              borderRadius: "50%",
              overflow: "hidden",
              border: `4px solid ${creator.accentColor}`,
              boxShadow: `0 0 20px ${creator.accentColor}66`,
              bgcolor: "#222",
            }}
          >
            {showAvatarPlaceholder ? (
              <CategoryMediaPlaceholder category={creator.category} variant="channel" />
            ) : (
              <Box
                component="img"
                src={IMG.avatar(creator.avatarUrl)}
                alt={`${creator.displayName} channel avatar`}
                sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={() => setAvatarFailed(true)}
              />
            )}
          </Box>
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography component="h1" variant="h4" fontStyle="italic" fontWeight={800}>
                {creator.displayName}
              </Typography>
              {activeLive?.playback_id ? (
                <Chip label="LIVE" size="small" color="error" sx={{ fontWeight: 900 }} />
              ) : null}
              <CreatorBadges
                verified={creator.verified}
                monetizationEligible={creator.monetizationEligible}
                size="medium"
              />
              {showClaimUi ? (
                <Chip
                  label={
                    claimStatus === "unclaimed"
                      ? "Unclaimed"
                      : claimStatus === "identity_review"
                        ? "Verifying identity"
                        : "Claim in progress"
                  }
                  size="small"
                  color="warning"
                  sx={{ height: 26 }}
                />
              ) : null}
            </Stack>
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
              <Typography component="span" variant="body2" color="text.secondary">
                @{creator.handle} ·
              </Typography>
              <Chip label={creator.category} size="small" sx={{ height: 22 }} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {formatCount(followerCount)} followers ·{" "}
              {formatCount(creator.subscriberCount)} subscribers ·{" "}
              {creator.videoCount ?? videos.length} videos ·{" "}
              {formatCount(Math.round(creator.totalTipsReceived ?? 0))} tips received
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" alignItems="center">
              {showClaimUi ? (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={() => setClaimOpen(true)}
                  sx={{ textTransform: "none" }}
                >
                  {claimStatus === "unclaimed"
                    ? "Claim this page"
                    : claimStatus === "identity_review"
                      ? "Claim status"
                      : "Continue claim"}
                </Button>
              ) : null}
              {isOwnChannel && canUseCreatorUpload ? (
                <Button
                  component={Link}
                  href="/dashboard/upload"
                  variant="outlined"
                  color="primary"
                  sx={{ textTransform: "none" }}
                >
                  + Video
                </Button>
              ) : null}
              {!isOwnChannel ? (
                <Button
                  variant={following ? "outlined" : "contained"}
                  color={following ? "inherit" : "primary"}
                  disabled={followBusy}
                  onClick={() => void handleFollowToggle()}
                  sx={{ textTransform: "none", borderColor: following ? "divider" : undefined }}
                >
                  {followBusy ? "…" : following ? "Following" : "Follow"}
                </Button>
              ) : null}
              {canMonetize ? (
                <>
                  <Button variant="contained" color="primary" onClick={() => setSubOpen(true)}>
                    Subscribe {formatBsd(price)}/mo
                  </Button>
                  <Button variant="outlined" color="primary" onClick={() => setTipOpen(true)}>
                    Tip
                  </Button>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                  Tips and subscriptions unlock after this creator completes payout verification.
                </Typography>
              )}
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => setCart((c) => c + 1)}
              >
                Shop
              </Button>
            </Stack>
            {followErr ? (
              <Alert
                severity="error"
                sx={{ mt: 1, maxWidth: 480 }}
                onClose={() => setFollowErr(null)}
              >
                {followErr}
              </Alert>
            ) : null}
          </Box>
        </Stack>

        {activeLive?.playback_id ? (
          <Alert
            severity="error"
            icon={false}
            sx={{
              mt: 3,
              bgcolor: "rgba(185, 28, 28, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
            }}
            action={
              <Button color="inherit" size="small" sx={{ textTransform: "none" }} onClick={() => setTab(1)}>
                Watch live
              </Button>
            }
          >
            <Typography variant="body2" fontWeight={700}>
              {creator.displayName} is live now — open the Live tab to watch.
            </Typography>
          </Alert>
        ) : null}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 3, mb: 2 }}>
          <Tab label="Videos" />
          <Tab
            label={
              <Badge variant="dot" color="error" invisible={!activeLive?.playback_id} sx={{ pr: 1 }}>
                Live
              </Badge>
            }
          />
          <Tab label="Shop" />
          <Tab label="About" />
        </Tabs>

        {tab === 0 && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {(
                [
                  ["all", "All Videos"],
                  ["free", "Free"],
                  ["locked", "Subscribers Only"],
                ] as const
              ).map(([k, label]) => (
                <Button
                  key={k}
                  size="small"
                  variant={filter === k ? "contained" : "text"}
                  onClick={() => setFilter(k)}
                  sx={{ textTransform: "none" }}
                >
                  {label}
                </Button>
              ))}
            </Stack>
            <Grid container spacing={2}>
              {filtered.map((v) => (
                <Grid item xs={12} sm={6} md={4} key={v.id}>
                  <VideoItemWithHover video={v} />
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {tab === 1 && (
          <>
            {activeLive?.playback_id ? (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: "#1a1a1a",
                  border: `1px solid ${PILEIT_THEME.border}`,
                  mb: 2,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap">
                  <Chip label="LIVE" size="small" color="error" sx={{ fontWeight: 800 }} />
                  <Typography fontWeight={800} fontStyle="italic">
                    {activeLive.title}
                  </Typography>
                </Stack>
                <VideoPlayer
                  playbackId={activeLive.playback_id.trim()}
                  streamType="live"
                  poster={
                    activeLive.thumbnail_url
                      ? IMG.videoPoster(activeLive.thumbnail_url)
                      : undefined
                  }
                  accentColor={creator.accentColor}
                  metadata={{
                    video_id: activeLive.id,
                    video_title: activeLive.title,
                  }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                  <Button
                    component={Link}
                    href={`/watch/${encodeURIComponent(activeLive.id)}`}
                    variant="contained"
                    sx={{ textTransform: "none" }}
                  >
                    Open watch page (chat & Pile)
                  </Button>
                  {isOwnChannel ? (
                    <Button
                      component={Link}
                      href="/dashboard"
                      variant="outlined"
                      sx={{ textTransform: "none" }}
                    >
                      Stream settings
                    </Button>
                  ) : null}
                </Stack>
              </Paper>
            ) : (
              <Paper
                sx={{
                  p: 3,
                  bgcolor: "#2a2a2a",
                  border: `1px solid ${PILEIT_THEME.border}`,
                }}
              >
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  No live stream right now.
                </Typography>
                <Button component={Link} href="/live" variant="outlined" sx={{ textTransform: "none" }}>
                  See who&apos;s live on PileIt
                </Button>
                {isOwnChannel ? (
                  <Button
                    component={Link}
                    href="/dashboard"
                    variant="contained"
                    sx={{ textTransform: "none", ml: { xs: 0, sm: 1 }, mt: { xs: 1, sm: 0 } }}
                  >
                    Go live from dashboard
                  </Button>
                ) : null}
              </Paper>
            )}
          </>
        )}

        {tab === 2 && (
          <Grid container spacing={2}>
            {mockProducts.map((p) => (
              <Grid item xs={12} sm={6} md={3} key={p.id}>
                <Paper sx={{ bgcolor: "#2a2a2a", border: `1px solid ${PILEIT_THEME.border}`, overflow: "hidden" }}>
                  <Box
                    sx={{
                      pt: "75%",
                      backgroundImage: p.image
                        ? `url(${IMG.cardThumb(p.image)})`
                        : undefined,
                      backgroundSize: "cover",
                    }}
                  />
                  <Box sx={{ p: 2 }}>
                    <Typography fontWeight={700}>{p.name}</Typography>
                    <Typography color="primary" sx={{ my: 1 }}>
                      {formatBsd(p.price)}
                    </Typography>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setCart((c) => c + 1)}
                    >
                      Add to Cart
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {tab === 3 && (
          <Paper sx={{ p: 3, bgcolor: "#2a2a2a", border: `1px solid ${PILEIT_THEME.border}` }}>
            <Typography paragraph>{creator.bio}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Total views
                </Typography>
                <Typography fontWeight={800}>—</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Tips earned
                </Typography>
                <Typography fontWeight={800}>
                  {formatCount(Math.round(creator.totalTipsReceived ?? 0))}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Member since
                </Typography>
                <Typography fontWeight={800}>
                  {formatMemberSince(creator.memberSince)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Category
                </Typography>
                <Typography fontWeight={800}>{creator.category}</Typography>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Box>

      <TipModal
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        creatorId={creator.id}
        creatorName={creator.displayName}
      />
      <SubscribeModal
        open={subOpen}
        onClose={() => setSubOpen(false)}
        creatorId={creator.id}
        creatorName={creator.displayName}
        monthlyAmount={price}
      />
      <CreatorClaimModal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        handle={creator.handle}
        claimStatus={creator.claimStatus}
      />
    </Box>
  );
}
