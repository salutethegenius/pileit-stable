"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { apiFetch, formatApiErrorMessage } from "@/lib/api";
import { PILEIT_THEME } from "@/theme/theme";
import DashboardBrowserLiveMuxSection from "@/components/dashboard/DashboardBrowserLiveMuxSection";

type MineLatestLiveRes = {
  video_id: string;
  title: string;
  mux_live_status: string | null;
  playback_id: string | null;
  watch_url_path: string;
};

type CreateMuxLiveRes = {
  video_id: string;
  live_stream_id: string;
  playback_id: string;
  mux_status: string;
  rtmp_url: string;
  stream_key: string;
  watch_url_path: string;
};

type Props = {
  /** Call after creating or ending a stream (e.g. refresh /videos/mine table). */
  onVideosChanged?: () => void;
};

function canUseMuxLive(accountType: string | undefined) {
  return accountType === "creator" || accountType === "admin";
}

export default function DashboardGoLiveMuxPanel({ onVideosChanged }: Props) {
  const { user, accessToken } = useAuth();
  const [mineLive, setMineLive] = useState<MineLatestLiveRes | null | undefined>(undefined);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveDescription, setLiveDescription] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveCreds, setLiveCreds] = useState<{ rtmp_url: string; stream_key: string } | null>(
    null
  );

  const loadActiveMuxLive = useCallback(() => {
    if (!accessToken || !user || !canUseMuxLive(user.accountType)) {
      setMineLive(undefined);
      return;
    }
    apiFetch<MineLatestLiveRes | null>("/live-streams/mine/latest", { accessToken })
      .then((r) => setMineLive(r ?? null))
      .catch(() => setMineLive(null));
  }, [accessToken, user]);

  useEffect(() => {
    loadActiveMuxLive();
  }, [loadActiveMuxLive]);

  const createMuxLive = async () => {
    if (!accessToken || !user || !canUseMuxLive(user.accountType)) return;
    const t = liveTitle.trim();
    if (!t) {
      setLiveErr("Add a title for this live stream.");
      return;
    }
    setLiveErr(null);
    setLiveBusy(true);
    try {
      const created = await apiFetch<CreateMuxLiveRes>("/live-streams", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          title: t,
          description: liveDescription.trim() || null,
        }),
      });
      setLiveCreds({ rtmp_url: created.rtmp_url, stream_key: created.stream_key });
      setLiveTitle("");
      setLiveDescription("");
      onVideosChanged?.();
      loadActiveMuxLive();
    } catch (e) {
      setLiveErr(formatApiErrorMessage(e));
    } finally {
      setLiveBusy(false);
    }
  };

  const syncMuxLive = async () => {
    if (!accessToken || !mineLive?.video_id) return;
    setLiveErr(null);
    setLiveBusy(true);
    try {
      await apiFetch(`/live-streams/${encodeURIComponent(mineLive.video_id)}/sync`, {
        method: "POST",
        accessToken,
      });
      loadActiveMuxLive();
    } catch (e) {
      setLiveErr(formatApiErrorMessage(e));
    } finally {
      setLiveBusy(false);
    }
  };

  const endMuxLive = async () => {
    if (!accessToken || !mineLive?.video_id) return;
    setLiveErr(null);
    setLiveBusy(true);
    try {
      await apiFetch(`/live-streams/${encodeURIComponent(mineLive.video_id)}`, {
        method: "DELETE",
        accessToken,
      });
      setLiveCreds(null);
      onVideosChanged?.();
      loadActiveMuxLive();
    } catch (e) {
      setLiveErr(formatApiErrorMessage(e));
    } finally {
      setLiveBusy(false);
    }
  };

  if (!user || !canUseMuxLive(user.accountType)) {
    return null;
  }

  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        bgcolor: "#2a2a2a",
        border: `1px solid ${PILEIT_THEME.border}`,
      }}
    >
      {mineLive === undefined ? (
        <Skeleton height={100} />
      ) : (
        <>
          <Typography fontWeight={800} fontStyle="italic" gutterBottom>
            Go live (Mux)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a <strong>live title</strong> (optional description), then click{" "}
            <strong>Create live stream</strong>. Copy the <strong>server URL</strong> and{" "}
            <strong>stream key</strong> into OBS (or any RTMP encoder), then start streaming. When
            Mux marks the stream active, you appear on the <Link href="/live">Live</Link> page. Use
            the watch page for this session (link appears after you create the stream) for chat and
            The Pile.
          </Typography>
          {liveErr ? (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {liveErr}
            </Typography>
          ) : null}
          {mineLive ? (
            <>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>{mineLive.title}</strong> — Mux status:{" "}
                  <strong>{mineLive.mux_live_status ?? "—"}</strong>
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={liveBusy}
                    onClick={() => void syncMuxLive()}
                    sx={{ textTransform: "none" }}
                  >
                    Sync status from Mux
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={liveBusy}
                    onClick={() => void endMuxLive()}
                    sx={{ textTransform: "none" }}
                  >
                    End stream (delete Mux ingest)
                  </Button>
                  <Button
                    size="small"
                    component={Link}
                    href={mineLive.watch_url_path}
                    sx={{ textTransform: "none" }}
                  >
                    Open watch page
                  </Button>
                </Stack>
              </Stack>
              {accessToken ? (
                <DashboardBrowserLiveMuxSection
                  accessToken={accessToken}
                  videoId={mineLive.video_id}
                  parentBusy={liveBusy}
                  onEndStream={() => {
                    setLiveCreds(null);
                    onVideosChanged?.();
                    loadActiveMuxLive();
                  }}
                />
              ) : null}
            </>
          ) : null}
          {liveCreds ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Copy your stream key now — it won’t be shown again. Server:{" "}
              <strong>{liveCreds.rtmp_url}</strong> · Stream key:{" "}
              <strong style={{ wordBreak: "break-all" }}>{liveCreds.stream_key}</strong>
            </Alert>
          ) : null}
          {mineLive === null ? (
            <Stack spacing={2} sx={{ maxWidth: 480 }}>
              <TextField
                label="Live title"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                size="small"
                fullWidth
                required
                helperText="Shown on your channel and watch page while you’re live."
              />
              <TextField
                label="Description (optional)"
                value={liveDescription}
                onChange={(e) => setLiveDescription(e.target.value)}
                size="small"
                fullWidth
                multiline
                minRows={2}
              />
              <Button
                variant="contained"
                disabled={liveBusy}
                onClick={() => void createMuxLive()}
                sx={{ textTransform: "none", alignSelf: "flex-start" }}
              >
                Create live stream
              </Button>
            </Stack>
          ) : null}
        </>
      )}
    </Paper>
  );
}
