"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import VideoPlayer from "@/components/VideoPlayer";
import { getApiBase } from "@/lib/api";
import { safeMapApiVideos, type ApiVideoRow } from "@/lib/mapApiVideo";
import { IMG } from "@/lib/imageUrls";
import { PILEIT_THEME } from "@/theme/theme";

const POLL_MS = 12_000;

export default function LivePageClient() {
  const [rows, setRows] = useState<ApiVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${getApiBase()}/live-streams/active`);
      if (!res.ok) {
        setErr("Could not load live streams.");
        setRows([]);
        return;
      }
      const data = (await res.json()) as ApiVideoRow[];
      setRows(Array.isArray(data) ? data : []);
      setErr(null);
    } catch {
      setErr("Could not load live streams.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const videos = safeMapApiVideos(rows);

  if (loading && rows.length === 0) {
    return (
      <Box sx={{ p: 4, minHeight: "60vh", maxWidth: 900, mx: "auto" }}>
        <Skeleton height={40} sx={{ mb: 2 }} />
        <Skeleton height={200} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: "60vh", maxWidth: 900, mx: "auto" }}>
      <Typography component="h1" variant="h4" fontStyle="italic" fontWeight={800} gutterBottom>
        Live
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Creators streaming right now on PileIt — open a watch page for chat, The Pile, and tips.
      </Typography>
      {err ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {err}
        </Typography>
      ) : null}
      {videos.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 3, bgcolor: "#2a2a2a", border: `1px solid ${PILEIT_THEME.border}` }}
        >
          <Typography fontWeight={700} gutterBottom>
            No one is live at the moment
          </Typography>
          <Typography variant="body2" color="text.secondary">
            When a creator goes live from their dashboard, the stream appears here automatically.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={4}>
          {videos.map((v) => {
            const pid = v.playbackId?.trim() ?? "";
            return (
              <Paper
                key={v.id}
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: "#1a1a1a",
                  border: `1px solid ${PILEIT_THEME.border}`,
                  overflow: "hidden",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "center" }}
                  justifyContent="space-between"
                  sx={{ mb: 1.5 }}
                >
                  <Box>
                    <Typography fontWeight={800} fontStyle="italic">
                      {v.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {v.creator.displayName}
                      {v.creator.handle ? ` · @${v.creator.handle}` : ""}
                    </Typography>
                  </Box>
                  <Button
                    component={Link}
                    href={`/watch/${encodeURIComponent(v.id)}`}
                    variant="contained"
                    sx={{ textTransform: "none", alignSelf: { xs: "stretch", sm: "auto" } }}
                  >
                    Watch & chat
                  </Button>
                </Stack>
                {pid ? (
                  <VideoPlayer
                    playbackId={pid}
                    streamType="live"
                    poster={v.thumbnailUrl ? IMG.videoPoster(v.thumbnailUrl) : undefined}
                    accentColor={v.creator.accentColor}
                    metadata={{
                      video_id: v.id,
                      video_title: v.title,
                    }}
                  />
                ) : null}
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
