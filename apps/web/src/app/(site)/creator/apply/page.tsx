"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import MenuItem from "@mui/material/MenuItem";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useAuth } from "@/providers/AuthProvider";
import { apiFetch, ApiError } from "@/lib/api";

function formatValidationErrors(body: string): string {
  try {
    const j = JSON.parse(body) as { detail?: unknown };
    const d = j.detail;
    if (Array.isArray(d)) {
      return d
        .map((e: { msg?: string }) => (typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
        .join(" · ");
    }
    if (typeof d === "string") return d;
  } catch {
    /* ignore */
  }
  return body.slice(0, 500);
}
import PileItLockup from "@/components/brand/PileItLockup";
import { buildAuthPageSearch, safeInternalPath } from "@/lib/navigation";

type ChannelRow = { label: string; url: string };

type ApplicationMe = {
  id: string;
  status: string;
  submitted_at: string;
  channels: ChannelRow[];
  mission_text: string | null;
  content_plan_text: string | null;
  primary_category: string | null;
};

function ApplyForm() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [channels, setChannels] = useState<ChannelRow[]>([{ label: "", url: "" }]);
  const [mission, setMission] = useState("");
  const [plan, setPlan] = useState("");
  const [category, setCategory] = useState("");
  const [existing, setExisting] = useState<ApplicationMe | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = safeInternalPath(searchParams.get("next"));
  const loginHref = `/login${buildAuthPageSearch(nextPath, searchParams.get("email"))}`;

  useEffect(() => {
    if (!accessToken || !user || user.accountType !== "viewer") return;
    apiFetch<ApplicationMe | null>("/creators/apply/me", { accessToken })
      .then(setExisting)
      .catch(() => setExisting(null));
  }, [accessToken, user]);

  if (loading || existing === undefined) {
    return (
      <Box sx={{ p: 4, maxWidth: 720, mx: "auto" }}>
        <Skeleton height={48} sx={{ mb: 2 }} />
        <Skeleton height={200} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: "auto" }}>
        <Typography gutterBottom>Log in to apply as a creator.</Typography>
        <Button component={Link} href={loginHref} variant="contained">
          Log in
        </Button>
      </Box>
    );
  }

  if (user.accountType === "creator" || user.accountType === "admin") {
    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: "auto" }}>
        <Typography>You already have a creator or admin account.</Typography>
        <Button component={Link} href="/dashboard" sx={{ mt: 2 }} variant="outlined">
          Dashboard
        </Button>
      </Box>
    );
  }

  if (existing?.status === "pending") {
    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: "auto" }}>
        <Typography component="h1" variant="h5" fontStyle="italic" fontWeight={800} gutterBottom>
          Application received
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          We are reviewing your application. You will be able to post on PileIt once approved.
          Monetization (tips, subscriptions, shop payouts) requires a separate verification step
          after approval.
        </Typography>
        <Button component={Link} href="/profile">
          Back to profile
        </Button>
      </Box>
    );
  }

  if (existing?.status === "declined") {
    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: "auto" }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Your previous application was not approved. You may submit a new one with updated
          information.
        </Alert>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Contact support if you have questions.
        </Typography>
        <Button variant="contained" onClick={() => setExisting(null)}>
          Start new application
        </Button>
      </Box>
    );
  }

  const addChannel = () => setChannels((c) => [...c, { label: "", url: "" }]);
  const removeChannel = (i: number) =>
    setChannels((c) => (c.length <= 1 ? c : c.filter((_, j) => j !== i)));
  const setCh = (i: number, field: keyof ChannelRow, v: string) =>
    setChannels((c) => c.map((row, j) => (j === i ? { ...row, [field]: v } : row)));

  const submit = async () => {
    if (!accessToken) return;
    setErr(null);
    const cleaned = channels
      .map((c) => ({ label: c.label.trim(), url: c.url.trim() }))
      .filter((c) => c.label && c.url);
    if (cleaned.length < 1) {
      setErr("Add at least one channel with label and URL.");
      return;
    }
    if (mission.trim().length < 30) {
      setErr("Mission / why PileIt must be at least 30 characters.");
      return;
    }
    if (plan.trim().length < 15) {
      setErr("Content plan must be at least 15 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/creators/apply", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          channels: cleaned,
          mission_text: mission.trim(),
          content_plan_text: plan.trim(),
          primary_category: category.trim() || null,
        }),
      });
      router.push("/profile");
    } catch (e) {
      if (e instanceof ApiError && e.body) {
        setErr(formatValidationErrors(e.body));
      } else {
        setErr("Could not submit. You may already have a pending application.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        py: { xs: 4, md: 6 },
        px: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, md: 4 },
          maxWidth: 720,
          mx: "auto",
          bgcolor: "#2a2a2a",
          border: "1px solid #333",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <PileItLockup markSize={44} textSize={28} />
        </Box>
        <Typography component="h1" variant="h5" fontStyle="italic" fontWeight={800} gutterBottom>
          Become a creator
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          PileIt grows when creators and the platform work together. Share where you already
          publish, why you want to build here, and how you will show up consistently. Our team
          reviews every application.
        </Typography>

        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        <Typography fontWeight={700} sx={{ mb: 1 }}>
          Channels (at least one)
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Instagram, TikTok, YouTube, website — full URLs starting with https://
        </Typography>
        {channels.map((row, i) => (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} key={i} sx={{ mb: 1 }}>
            <TextField
              label="Platform / label"
              value={row.label}
              onChange={(e) => setCh(i, "label", e.target.value)}
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              label="URL"
              value={row.url}
              onChange={(e) => setCh(i, "url", e.target.value)}
              size="small"
              sx={{ flex: 2 }}
            />
            <IconButton
              aria-label="Remove channel"
              onClick={() => removeChannel(i)}
              disabled={channels.length <= 1}
              color="inherit"
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Stack>
        ))}
        <Button startIcon={<AddIcon />} onClick={addChannel} sx={{ mb: 3, textTransform: "none" }}>
          Add channel
        </Button>

        <TextField
          fullWidth
          label="Primary category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          select
          sx={{ mb: 2 }}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="">—</MenuItem>
          {["Comedy", "Music", "Lifestyle", "Food", "Sports", "Fashion", "Other"].map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          multiline
          minRows={4}
          label="Why PileIt? (mission & fit)"
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder="Tell us why you want to build your channel on PileIt and what your community can expect."
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 8000 }}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Content plan & consistency"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          placeholder="How often will you post? What formats or themes will you focus on?"
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 8000 }}
        />

        <Button
          variant="contained"
          color="primary"
          disabled={submitting}
          onClick={() => void submit()}
          sx={{ textTransform: "none", mt: 1 }}
        >
          Submit application
        </Button>
        <Typography sx={{ mt: 2 }}>
          <Link href="/profile" style={{ color: "#999" }}>
            ← Back to profile
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

function Fallback() {
  return (
    <Box sx={{ p: 4 }}>
      <Skeleton height={200} />
    </Box>
  );
}

export default function CreatorApplyPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <ApplyForm />
    </Suspense>
  );
}
