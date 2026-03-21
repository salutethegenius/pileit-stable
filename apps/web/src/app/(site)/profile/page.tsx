"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { useAuth } from "@/providers/AuthProvider";
import { apiFetch } from "@/lib/api";
import CreatorBadges from "@/components/brand/CreatorBadges";

type ApplicationMe = {
  id: string;
  status: string;
  submitted_at: string;
};

export default function ProfilePage() {
  const { user, accessToken, loading, refreshUser } = useAuth();
  const [appStatus, setAppStatus] = useState<ApplicationMe | null | undefined>(undefined);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [accentColor, setAccentColor] = useState("#f97316");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [heroUrl, setHeroUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isCreator = user?.accountType === "creator";

  useEffect(() => {
    if (!accessToken || !user || user.accountType !== "viewer") {
      setAppStatus(null);
      return;
    }
    apiFetch<ApplicationMe | null>("/creators/apply/me", { accessToken })
      .then((a) => setAppStatus(a))
      .catch(() => setAppStatus(null));
  }, [accessToken, user]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setHandle(user.handle ?? "");
    setBio(user.bio ?? "");
    setAccentColor(user.accentColor || "#f97316");
    setAvatarUrl(user.avatarUrl ?? "");
    setHeroUrl(user.heroImageUrl ?? "");
    setSaveMsg(null);
  }, [user]);

  const saveProfile = useCallback(async () => {
    if (!accessToken || !user) return;
    setSaving(true);
    setSaveMsg(null);
    const dn = displayName.trim();
    if (!dn) {
      setSaveMsg({ ok: false, text: "Display name is required." });
      setSaving(false);
      return;
    }
    try {
      await apiFetch("/users/me", {
        method: "PUT",
        accessToken,
        body: JSON.stringify({
          display_name: dn,
          handle: handle.trim() || null,
          bio: bio.trim() || null,
          accent_color: accentColor.trim() || undefined,
          avatar_url: avatarUrl.trim() || null,
        }),
      });
      if (isCreator) {
        await apiFetch("/creators/me", {
          method: "PUT",
          accessToken,
          body: JSON.stringify({
            hero_image_url: heroUrl.trim() || null,
          }),
        });
      }
      await refreshUser();
      setSaveMsg({ ok: true, text: "Profile updated." });
    } catch (e) {
      setSaveMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Could not save profile.",
      });
    } finally {
      setSaving(false);
    }
  }, [
    accessToken,
    user,
    displayName,
    handle,
    bio,
    accentColor,
    avatarUrl,
    heroUrl,
    isCreator,
    refreshUser,
  ]);

  if (loading) return <Box sx={{ p: 4 }}>Loading…</Box>;
  if (!user) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Log in to view your profile.</Typography>
        <Button component={Link} href="/login">
          Log In
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 560 }}>
      <Typography component="h1" variant="h5" fontStyle="italic" fontWeight={800} gutterBottom>
        Profile
      </Typography>
      <Paper sx={{ p: 3, bgcolor: "#2a2a2a", border: "1px solid #333" }}>
        <Typography>{user.displayName}</Typography>
        <Typography color="text.secondary">{user.email}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Account: {user.accountType}
        </Typography>

        {isCreator && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              Badges (public):
            </Typography>
            <CreatorBadges
              verified={Boolean(user.verified)}
              monetizationEligible={user.monetizationEligible === true}
              size="small"
            />
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 360 }}>
              Blue = verified by admin. Gold = monetization / payouts approved (separate from
              verification).
            </Typography>
          </Stack>
        )}

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }} fontWeight={700}>
          Edit public profile
        </Typography>
        <Stack spacing={2}>
          {saveMsg && (
            <Alert severity={saveMsg.ok ? "success" : "error"}>{saveMsg.text}</Alert>
          )}
          <TextField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Handle (URL slug)"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            fullWidth
            size="small"
            helperText="Lowercase letters, numbers, underscores — used as /creator/your-handle"
          />
          <TextField
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            size="small"
          />
          <TextField
            label="Accent color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            fullWidth
            size="small"
            helperText="Hex color, e.g. #f97316"
          />
          <TextField
            label="Profile photo URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            fullWidth
            size="small"
            helperText="HTTPS image URL (e.g. Unsplash or your CDN). Leave empty for placeholder."
          />
          {isCreator && (
            <TextField
              label="Channel hero / cover image URL"
              value={heroUrl}
              onChange={(e) => setHeroUrl(e.target.value)}
              fullWidth
              size="small"
              helperText="Wide HTTPS image shown at the top of your channel. Leave empty to use gradient only."
            />
          )}
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void saveProfile()}
            sx={{ alignSelf: "flex-start", textTransform: "none" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </Stack>

        {user.accountType === "viewer" && (
          <Box sx={{ mt: 4 }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Creator program
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Apply with your existing channels and a short plan. After approval you can post; tips
              and subscriptions unlock after ID verification and a local payout account.
            </Typography>
            {appStatus === undefined ? null : appStatus?.status === "pending" ? (
              <Alert severity="info">Application pending review.</Alert>
            ) : appStatus?.status === "declined" ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Previous application was declined. You can submit again from the portal.
              </Alert>
            ) : null}
            <Button
              component={Link}
              href="/creator/apply"
              variant="contained"
              sx={{ mt: 2, textTransform: "none" }}
            >
              {appStatus?.status === "declined" ? "Apply again" : "Apply to be a creator"}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
