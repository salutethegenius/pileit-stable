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

/** Poll response from GET /videos/{id}/mux-upload-status (internal field names unchanged). */
export type VideoUploadPollResponse = {
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
 * Creator file upload flow: direct upload URL from API, then poll until the video is ready on PileIt.
 */
export default function PileItVideoUploadForm({ accessToken, onComplete }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isrc, setIsrc] = useState("");
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
        const r = await apiFetch<VideoUploadPollResponse>(
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
          safeSetStatus("Finalizing…");
          await new Promise((res) => setTimeout(res, POLL_MS));
          continue;
        }
        if (r.status === "error") {
          throw new Error(r.message || "Upload failed.");
        }
        if (r.status === "idle") {
          throw new Error(r.message || "Upload session lost.");
        }
        const human =
          r.status === "waiting_upload"
            ? "Sending your file to PileIt…"
            : r.status === "waiting_mux"
              ? "Finishing upload…"
              : r.status === "processing"
                ? "Processing your video on PileIt…"
                : "Working…";
        safeSetStatus(human);
        await new Promise((res) => setTimeout(res, POLL_MS));
      }
      throw new Error(
        "Still processing after several minutes. Check your videos in the dashboard — it may finish in the background."
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
      safeSetStatus("Preparing upload to PileIt…");
      const created = await apiFetch<DirectUploadCreateResponse>("/videos/mux/direct-upload", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          title: t,
          description: description.trim() || null,
          category: category.trim() || null,
          isrc: isrc.trim() || null,
          publish_after_ready: publishAfterReady,
          cors_origin: corsOrigin || null,
        }),
      });

      if (abortRef.current || !mountedRef.current) return;
      safeSetPhase("uploading");
      safeSetStatus("Uploading to PileIt…");
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
            ? "Could not complete upload. Check your connection and try again."
            : `Upload failed (${putRes.status}).`;
        throw new Error(hint);
      }

      if (abortRef.current || !mountedRef.current) return;
      safeSetPhase("processing");
      safeSetStatus("Processing your video on PileIt…");
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
          Opening your video on PileIt…
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
        <TextField
          label="ISRC (optional)"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value)}
          fullWidth
          placeholder="e.g. US-UM1-25-00001"
          disabled={busy}
          helperText="Optional — ties plays to this recording code for PRO reporting."
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
          label="Publish when ready (recommended)"
        />
        <Button type="submit" variant="contained" disabled={busy} sx={{ textTransform: "none" }}>
          {busy ? "Working…" : "Upload to PileIt"}
        </Button>
      </Stack>
    </Box>
  );
}
