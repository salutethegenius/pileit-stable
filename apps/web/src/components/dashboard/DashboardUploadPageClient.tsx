"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useAuth } from "@/providers/AuthProvider";
import { apiFetch, ApiError } from "@/lib/api";
import VideoPlayer from "@/components/VideoPlayer";
import MuxDirectUploadForm from "@/components/dashboard/MuxDirectUploadForm";
import { PILEIT_THEME } from "@/theme/theme";

const MUX_DEMO_HINT =
  "EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC200RI6lNxnhs";

function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.body) {
      try {
        const parsed = JSON.parse(err.body) as { detail?: unknown };
        const d = parsed.detail;
        if (typeof d === "string") return d;
        if (Array.isArray(d)) {
          const parts = d.map((x) =>
            typeof x === "object" && x && "msg" in x ? String((x as { msg: string }).msg) : String(x)
          );
          if (parts.length) return parts.join(" ");
        }
      } catch {
        /* fall through */
      }
    }
    return err.message || `Request failed (${err.status}).`;
  }
  if (err instanceof TypeError && typeof err.message === "string" && err.message.includes("fetch")) {
    return "Cannot reach the API. Is the backend running on port 8000?";
  }
  return "Something went wrong. Try again.";
}

export default function DashboardUploadPageClient() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [playbackId, setPlaybackId] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadTab, setUploadTab] = useState(0);

  useEffect(() => {
    if (!loading && user && user.accountType !== "creator" && user.accountType !== "admin") {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || !user || (user.accountType !== "creator" && user.accountType !== "admin")) {
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const t = title.trim();
    const pid = playbackId.trim();
    if (!t || !pid) {
      setErr("Title and Mux playback ID are required.");
      return;
    }
    if (!accessToken) {
      setErr("You need to be logged in.");
      return;
    }
    setSubmitting(true);
    try {
      const { id } = await apiFetch<{ id: string }>("/videos", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          title: t,
          description: description.trim() || null,
          playback_id: pid,
          category: category.trim() || null,
          is_locked: false,
          status: publishNow ? "published" : "draft",
        }),
      });
      router.push(`/watch/${id}`);
    } catch (e) {
      setErr(uploadErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        py: { xs: 3, md: 4 },
        px: 2,
        maxWidth: 720,
        mx: "auto",
        bgcolor: "background.default",
      }}
    >
      <Typography component="h1" variant="h5" fontStyle="italic" fontWeight={800} gutterBottom>
        Upload video (Mux)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <strong>Upload file</strong> sends your video to Mux via a direct upload URL (API must have{" "}
        <code>MUX_TOKEN_ID</code> / <code>MUX_TOKEN_SECRET</code>). <strong>Paste playback ID</strong>{" "}
        skips upload — use an ID from the Mux dashboard or the public demo:{" "}
        <code style={{ wordBreak: "break-all" }}>{MUX_DEMO_HINT}</code>
      </Typography>
      <Button
        component={Link}
        href="/dashboard"
        variant="text"
        color="inherit"
        sx={{ mb: 2, textTransform: "none" }}
      >
        ← Back to dashboard
      </Button>

      <Paper sx={{ p: 3, bgcolor: "#2a2a2a", border: `1px solid ${PILEIT_THEME.border}` }}>
        <Tabs
          value={uploadTab}
          onChange={(_, v) => setUploadTab(v)}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Upload file" id="upload-tab-file" sx={{ textTransform: "none" }} />
          <Tab label="Paste playback ID" id="upload-tab-paste" sx={{ textTransform: "none" }} />
        </Tabs>

        {uploadTab === 0 && accessToken ? (
          <MuxDirectUploadForm
            accessToken={accessToken}
            onComplete={(id) => router.push(`/watch/${id}`)}
          />
        ) : null}
        {uploadTab === 0 && !accessToken ? (
          <Typography color="text.secondary">Loading session…</Typography>
        ) : null}

        {uploadTab === 1 ? (
          <Box component="form" onSubmit={(e) => void submit(e)}>
            {err && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {err}
              </Alert>
            )}
            <Stack spacing={2}>
              <TextField
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Mux playback ID"
                value={playbackId}
                onChange={(e) => setPlaybackId(e.target.value)}
                required
                fullWidth
                placeholder={MUX_DEMO_HINT}
                helperText="Public playback ID only (not the asset ID)."
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
                placeholder="e.g. Music"
                InputLabelProps={{ shrink: true }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={publishNow}
                    onChange={(e) => setPublishNow(e.target.checked)}
                    color="primary"
                  />
                }
                label="Publish immediately (recommended so /watch loads without auth on the server)"
              />
              {playbackId.trim() ? (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Preview
                  </Typography>
                  <VideoPlayer
                    playbackId={playbackId.trim()}
                    accentColor={user.accentColor}
                    metadata={{
                      video_title: title.trim() || "Untitled",
                      viewer_user_id: user.id,
                    }}
                  />
                </Box>
              ) : null}
              <Button type="submit" variant="contained" disabled={submitting} sx={{ textTransform: "none" }}>
                {submitting ? "Saving…" : "Save video"}
              </Button>
            </Stack>
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
}
