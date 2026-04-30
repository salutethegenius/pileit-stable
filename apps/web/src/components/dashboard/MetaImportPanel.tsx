"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import { apiFetch, formatApiErrorMessage } from "@/lib/api";

type MetaPage = {
  id: string;
  name: string;
  instagram_business_account: { id: string; username?: string } | null;
};

type ConnectionRes = {
  connected: boolean;
  external_user_id?: string | null;
  pages?: MetaPage[];
};

type FbVideo = {
  id: string;
  title: string | null;
  description: string | null;
  length: number | null;
  picture: string | null;
  created_time: string | null;
  permalink_url: string | null;
  already_imported?: boolean;
};

type FbVideosRes = { items: FbVideo[]; next: string | null };

type ImportResult = {
  external_id: string;
  video_id: string | null;
  mux_asset_id: string | null;
  status: "created" | "duplicate" | "failed";
  error?: string | null;
};

type ImportRes = { results: ImportResult[] };

type ImportStatusRes = {
  status: "ready" | "processing" | "error";
  playback_id?: string | null;
  video_id: string;
  message?: string;
};

type TrackedImport = {
  external_id: string;
  video_id: string | null;
  status: "queued" | "processing" | "ready" | "error" | "duplicate";
  error?: string | null;
};

const POLL_MS = 4000;

function formatLength(length: number | null): string {
  if (!length || length <= 0) return "";
  const s = Math.round(length);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}

export default function MetaImportPanel({ accessToken }: { accessToken: string }) {
  const [loadingConn, setLoadingConn] = useState(true);
  const [connection, setConnection] = useState<ConnectionRes | null>(null);
  const [pageId, setPageId] = useState<string>("");
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videos, setVideos] = useState<FbVideo[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [publishAfterReady, setPublishAfterReady] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tracked, setTracked] = useState<TrackedImport[]>([]);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConnection = useCallback(async () => {
    setLoadingConn(true);
    setErr(null);
    try {
      const conn = await apiFetch<ConnectionRes>("/social/meta/connection", { accessToken });
      setConnection(conn);
      const firstPage = conn.pages?.[0]?.id ?? "";
      setPageId((prev) => prev || firstPage);
    } catch (e) {
      setErr(formatApiErrorMessage(e));
    } finally {
      setLoadingConn(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadConnection();
  }, [loadConnection]);

  // After OAuth, the API redirects back here with ?meta_connected=1 — refresh state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const flag = url.searchParams.get("meta_connected");
    if (flag === "1" || flag === "0") {
      url.searchParams.delete("meta_connected");
      url.searchParams.delete("reason");
      url.searchParams.delete("pages");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      void loadConnection();
    }
  }, [loadConnection]);

  const loadVideos = useCallback(
    async (selectedPageId: string) => {
      if (!selectedPageId) return;
      setLoadingVideos(true);
      setErr(null);
      try {
        const res = await apiFetch<FbVideosRes>(
          `/social/meta/facebook/videos?page_id=${encodeURIComponent(selectedPageId)}&limit=25`,
          { accessToken }
        );
        setVideos(res.items);
        setSelected({});
      } catch (e) {
        setErr(formatApiErrorMessage(e));
      } finally {
        setLoadingVideos(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (pageId) void loadVideos(pageId);
  }, [pageId, loadVideos]);

  const handleConnect = useCallback(async () => {
    setErr(null);
    try {
      const { authorize_url } = await apiFetch<{ authorize_url: string }>(
        "/social/meta/oauth/start",
        { accessToken }
      );
      // Same-window navigation; the API redirect lands back on this page with ?meta_connected=1.
      window.location.href = authorize_url;
    } catch (e) {
      setErr(formatApiErrorMessage(e));
    }
  }, [accessToken]);

  const handleDisconnect = useCallback(async () => {
    if (!window.confirm("Disconnect Facebook from PileIt? Imports already in progress will continue.")) {
      return;
    }
    try {
      await apiFetch<void>("/social/meta/connection", {
        method: "DELETE",
        accessToken,
      });
      setConnection({ connected: false, pages: [] });
      setVideos([]);
      setSelected({});
      setPageId("");
    } catch (e) {
      setErr(formatApiErrorMessage(e));
    }
  }, [accessToken]);

  const selectedIds = useMemo(
    () => videos.filter((v) => selected[v.id] && !v.already_imported).map((v) => v.id),
    [videos, selected]
  );

  const startImport = useCallback(async () => {
    if (!pageId || selectedIds.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<ImportRes>("/videos/import/meta", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          source: "facebook",
          page_id: pageId,
          items: selectedIds.map((id) => ({
            external_id: id,
            publish_after_ready: publishAfterReady,
          })),
        }),
      });
      const initial: TrackedImport[] = res.results.map((r) => ({
        external_id: r.external_id,
        video_id: r.video_id,
        status:
          r.status === "created"
            ? "processing"
            : r.status === "duplicate"
            ? "duplicate"
            : "error",
        error: r.error ?? null,
      }));
      setTracked((prev) => [...prev, ...initial]);
      setSelected({});
      // Optimistically mark the videos so they show as imported in the list.
      setVideos((prev) =>
        prev.map((v) => (selectedIds.includes(v.id) ? { ...v, already_imported: true } : v))
      );
    } catch (e) {
      setErr(formatApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [accessToken, pageId, selectedIds, publishAfterReady]);

  // Poll status for any video still in `processing`.
  useEffect(() => {
    const inFlight = tracked.filter((t) => t.status === "processing" && t.video_id);
    if (inFlight.length === 0) {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }
    if (pollTimer.current) return;
    pollTimer.current = setInterval(async () => {
      const updates: Record<string, TrackedImport["status"]> = {};
      await Promise.all(
        inFlight.map(async (t) => {
          if (!t.video_id) return;
          try {
            const res = await apiFetch<ImportStatusRes>(
              `/videos/import/status/${t.video_id}`,
              { accessToken }
            );
            if (res.status === "ready") updates[t.video_id] = "ready";
            else if (res.status === "error") updates[t.video_id] = "error";
          } catch {
            // transient — leave as processing, next tick will retry
          }
        })
      );
      if (Object.keys(updates).length === 0) return;
      setTracked((prev) =>
        prev.map((t) =>
          t.video_id && updates[t.video_id]
            ? { ...t, status: updates[t.video_id] }
            : t
        )
      );
    }, POLL_MS);
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [tracked, accessToken]);

  if (loadingConn) {
    return (
      <Stack spacing={1}>
        <Skeleton variant="rectangular" height={48} />
        <Skeleton variant="rectangular" height={120} />
      </Stack>
    );
  }

  if (!connection?.connected) {
    return (
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Connect your Facebook account to import videos from any Page you manage. PileIt only
          reads the videos you choose — it never posts to Facebook on your behalf.
        </Typography>
        {err && <Alert severity="error">{err}</Alert>}
        <Box>
          <Button variant="contained" onClick={() => void handleConnect()} sx={{ textTransform: "none" }}>
            Connect Facebook
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Don&apos;t have a Page yet? Facebook lets you create one in ~30 seconds from your profile
          menu — Pages unlock importing here plus the Insights you&apos;ll want anyway.
        </Typography>
      </Stack>
    );
  }

  const pages = connection.pages ?? [];

  return (
    <Stack spacing={2}>
      {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}

      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Facebook connected. Pick a Page to browse its videos.
        </Typography>
        <Button
          variant="text"
          size="small"
          color="inherit"
          onClick={() => void handleDisconnect()}
          sx={{ textTransform: "none" }}
        >
          Disconnect
        </Button>
      </Stack>

      {pages.length === 0 ? (
        <Alert severity="info">
          We didn&apos;t find any Pages on your Facebook account. Create one and click &quot;Reconnect&quot;.
        </Alert>
      ) : (
        <Select
          size="small"
          value={pageId}
          onChange={(e) => setPageId(String(e.target.value))}
          sx={{ alignSelf: "flex-start", minWidth: 240 }}
        >
          {pages.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      )}

      <FormControlLabel
        control={
          <Switch
            checked={publishAfterReady}
            onChange={(e) => setPublishAfterReady(e.target.checked)}
            color="primary"
          />
        }
        label="Publish each video automatically when it finishes processing"
      />

      {loadingVideos ? (
        <Stack spacing={1}>
          <Skeleton variant="rectangular" height={64} />
          <Skeleton variant="rectangular" height={64} />
        </Stack>
      ) : videos.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No videos found on this Page.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {videos.map((v) => {
            const isImported = Boolean(v.already_imported);
            return (
              <Card key={v.id} variant="outlined" sx={{ bgcolor: "transparent" }}>
                <CardContent sx={{ display: "flex", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Checkbox
                    checked={Boolean(selected[v.id]) && !isImported}
                    disabled={isImported}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [v.id]: e.target.checked }))
                    }
                  />
                  {v.picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.picture}
                      alt=""
                      style={{ width: 96, height: 54, objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <Box sx={{ width: 96, height: 54, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 1 }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {v.title || v.description?.slice(0, 80) || "Untitled video"}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} alignItems="center">
                      {v.length ? (
                        <Typography variant="caption" color="text.secondary">
                          {formatLength(v.length)}
                        </Typography>
                      ) : null}
                      {isImported ? (
                        <Chip size="small" label="Already imported" color="success" variant="outlined" />
                      ) : null}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <Box>
        <Button
          variant="contained"
          onClick={() => void startImport()}
          disabled={busy || selectedIds.length === 0 || !pageId}
          sx={{ textTransform: "none" }}
        >
          {busy
            ? "Starting…"
            : selectedIds.length === 0
            ? "Select videos to import"
            : `Import ${selectedIds.length} video${selectedIds.length === 1 ? "" : "s"}`}
        </Button>
      </Box>

      {tracked.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Imports</Typography>
          {tracked.map((t, idx) => (
            <Stack
              key={`${t.external_id}-${idx}`}
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <Chip
                size="small"
                label={
                  t.status === "ready"
                    ? "Ready"
                    : t.status === "processing"
                    ? "Processing…"
                    : t.status === "duplicate"
                    ? "Already imported"
                    : t.status === "error"
                    ? "Failed"
                    : "Queued"
                }
                color={
                  t.status === "ready"
                    ? "success"
                    : t.status === "error"
                    ? "error"
                    : t.status === "duplicate"
                    ? "default"
                    : "primary"
                }
                variant={t.status === "processing" || t.status === "queued" ? "filled" : "outlined"}
              />
              <Typography variant="body2" color="text.secondary">
                {t.external_id}
                {t.error ? ` — ${t.error}` : ""}
              </Typography>
              {t.status === "ready" && t.video_id ? (
                <Button
                  size="small"
                  href={`/watch/${t.video_id}`}
                  sx={{ textTransform: "none" }}
                >
                  Open
                </Button>
              ) : null}
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
