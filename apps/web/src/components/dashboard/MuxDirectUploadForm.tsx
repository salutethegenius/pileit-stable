"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import LinearProgress from "@mui/material/LinearProgress";
import { apiFetch, ApiError } from "@/lib/api";

export type MuxUploadPollResponse = {
  status:
    | "idle"
    | "waiting_upload"
    | "waiting_mux"
    | "processing"
    | "ready"
    | "error";
  video_id?: string;
  playback_id?: string;
  message?: string;
};

type DirectUploadCreateResponse = {
  video_id: string;
  upload_url: string;
  mux_upload_id: string;
  timeout?: number;
};

const POLL_MS = 2000;
const MAX_POLLS = 180;

function parseApiErr(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.body) {
      try {
        const parsed = JSON.parse(err.body) as { detail?: unknown };
        const d = parsed.detail;
        if (typeof d === "string") return d;
        if (Array.isArray(d)) {
          const parts = d.map((x) =>
            typeof x === "object" && x !== null && "msg" in x
              ? String((x as { msg: string }).msg)
              : String(x)
          );
          if (parts.length) return parts.join(" ");
        }
      } catch {
        /* ignore */
      }
    }
    return err.message || `Request failed (${err.status}).`;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}

type Props = {
  accessToken: string;
  onComplete: (videoId: string) => void;
};

/**
 * Mux Direct Upload: backend creates signed URL → browser PUTs file → poll until playback id is ready.
 */
export default function MuxDirectUploadForm({ accessToken, onComplete }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [publishAfterReady, setPublishAfterReady] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "creating" | "uploading" | "processing" | "done"
  >("idle");
  const [statusLabel, setStatusLabel] = useState("");
  const abortRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current = true;
    };
  }, []);

  const safeSetPhase = useCallback(
    (p: "idle" | "creating" | "uploading" | "processing" | "done") => {
      if (mountedRef.current) setPhase(p);
    },
    []
  );

  const safeSetStatus = useCallback((s: string) => {
    if (mountedRef.current) setStatusLabel(s);
  }, []);

  const resetBusy = useCallback(() => {
    if (!mountedRef.current) return;
    setPhase("idle");
    setStatusLabel("");
  }, []);

  const pollUntilReady = useCallback(
    async (videoId: string) => {
      for (let i = 0; i < MAX_POLLS; i++) {
        if (abortRef.current) return;
        const r = await apiFetch<MuxUploadPollResponse>(
          `/videos/${encodeURIComponent(videoId)}/mux-upload-status`,
          { accessToken }
        );
        if (abortRef.current) return;
        if (r.status === "ready") {
          if (r.playback_id) {
            safeSetPhase("done");
            safeSetStatus("Ready!");
            onComplete(videoId);
            return;
          }
          /* Defensive: backend should always send playback_id when ready */
          safeSetStatus("Finalizing…");
          await new Promise((res) => setTimeout(res, POLL_MS));
          continue;
        }
        if (r.status === "error") {
          throw new Error(r.message || "Mux reported an error.");
        }
        if (r.status === "idle") {
          throw new Error(r.message || "Upload session lost.");
        }
        const human =
          r.status === "waiting_upload"
            ? "Waiting for Mux to receive the file…"
            : r.status === "waiting_mux"
              ? "Mux is ingesting your upload…"
              : r.status === "processing"
                ? "Encoding video…"
                : "Working…";
        safeSetStatus(human);
        await new Promise((res) => setTimeout(res, POLL_MS));
      }
      throw new Error(
        "Still processing after several minutes. Check your video in the dashboard — it may finish in the background."
      );
    },
    [accessToken, onComplete, safeSetPhase, safeSetStatus]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    abortRef.current = false;
    if (!mountedRef.current) return;
    const t = title.trim();
    if (!t) {
      setErr("Title is required.");
      return;
    }
    if (!file) {
      setErr("Choose a video file.");
      return;
    }
    const corsOrigin =
      typeof window !== "undefined" ? window.location.origin : undefined;

    try {
      safeSetPhase("creating");
      safeSetStatus("Creating Mux upload…");
      const created = await apiFetch<DirectUploadCreateResponse>("/videos/mux/direct-upload", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          title: t,
          description: description.trim() || null,
          category: category.trim() || null,
          publish_after_ready: publishAfterReady,
          cors_origin: corsOrigin || null,
        }),
      });

      if (abortRef.current || !mountedRef.current) return;
      safeSetPhase("uploading");
      safeSetStatus("Uploading to Mux…");
      const putRes = await fetch(created.upload_url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      if (!putRes.ok) {
        const hint =
          putRes.status === 0
            ? "Network/CORS error talking to Mux storage. Ensure MUX_TOKEN_* is set and cors_origin matches this site."
            : `Upload failed (${putRes.status}).`;
        throw new Error(hint);
      }

      if (abortRef.current || !mountedRef.current) return;
      safeSetPhase("processing");
      safeSetStatus("Processing on Mux…");
      await pollUntilReady(created.video_id);
    } catch (e) {
      if (!abortRef.current && mountedRef.current) setErr(parseApiErr(e));
      resetBusy();
    }
  };

  const busy = phase !== "idle" && phase !== "done";

  return (
    <Box component="form" onSubmit={(e) => void submit(e)}>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      {phase === "done" && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Opening your video…
        </Alert>
      )}
      {busy && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {statusLabel}
          </Typography>
          <LinearProgress />
        </Box>
      )}
      <Stack spacing={2}>
        <TextField
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          fullWidth
          disabled={busy}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          disabled={busy}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          fullWidth
          placeholder="e.g. Music"
          disabled={busy}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="outlined" component="label" disabled={busy} sx={{ textTransform: "none" }}>
          {file ? file.name : "Choose video file"}
          <input
            type="file"
            hidden
            accept="video/*,.mp4,.mov,.webm,.mkv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Button>
        <FormControlLabel
          control={
            <Switch
              checked={publishAfterReady}
              onChange={(e) => setPublishAfterReady(e.target.checked)}
              disabled={busy}
              color="primary"
            />
          }
          label="Publish when Mux finishes (recommended for /watch)"
        />
        <Typography variant="caption" color="text.secondary">
          Requires <code>MUX_TOKEN_ID</code> and <code>MUX_TOKEN_SECRET</code> on the API. The browser
          uploads directly to Mux; this origin is sent as <code>cors_origin</code> for that PUT.
        </Typography>
        <Button type="submit" variant="contained" disabled={busy} sx={{ textTransform: "none" }}>
          {busy ? "Working…" : "Upload to Mux"}
        </Button>
      </Stack>
    </Box>
  );
}
