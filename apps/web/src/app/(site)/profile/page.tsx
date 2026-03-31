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
import { resolveMediaUrl } from "@/lib/mediaUrls";
import CreatorBadges from "@/components/brand/CreatorBadges";
import type { ApiUserMe } from "@/lib/mapApiUser";

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
  const [avatarUrlRaw, setAvatarUrlRaw] = useState<string | null>(null);
  const [heroUrlRaw, setHeroUrlRaw] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const isCreator = user?.accountType === "creator";
  /** Backend allows hero upload for creator and admin; match that here. */
  const canEditHero =
    user?.accountType === "creator" || user?.accountType === "admin";

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
    setAvatarUrlRaw(user.avatarUrlRaw ?? null);
    setHeroUrlRaw(user.heroImageUrlRaw ?? null);
    setAvatarFile(null);
    setHeroFile(null);
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [avatarFile]);

  useEffect(() => {
    if (!heroFile) {
      setHeroPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(heroFile);
    setHeroPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [heroFile]);

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
      let nextAvatarRaw = avatarUrlRaw;
      let nextHeroRaw = heroUrlRaw;

      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const updated = await apiFetch<ApiUserMe>("/users/me/avatar", {
          method: "POST",
          accessToken,
          body: fd,
        });
        nextAvatarRaw = updated.avatar_url ?? null;
        setAvatarFile(null);
      }

      if (canEditHero && heroFile) {
        const fd = new FormData();
        fd.append("file", heroFile);
        const heroRes = await apiFetch<{ hero_image_url: string | null }>(
          "/creators/me/hero-image",
          {
            method: "POST",
            accessToken,
            body: fd,
          }
        );
        nextHeroRaw = heroRes.hero_image_url ?? null;
        setHeroFile(null);
      }

      await apiFetch("/users/me", {
        method: "PUT",
        accessToken,
        body: JSON.stringify({
          display_name: dn,
          handle: handle.trim() || null,
          bio: bio.trim() || null,
          accent_color: accentColor.trim() || undefined,
          avatar_url: nextAvatarRaw,
        }),
      });
      if (canEditHero) {
        await apiFetch("/creators/me", {
          method: "PUT",
          accessToken,
          body: JSON.stringify({
            hero_image_url: nextHeroRaw,
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
    avatarUrlRaw,
    heroUrlRaw,
    avatarFile,
    heroFile,
    canEditHero,
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

  const avatarDisplaySrc =
    avatarPreviewUrl ?? (avatarUrlRaw ? resolveMediaUrl(avatarUrlRaw) : "");
  const heroDisplaySrc =
    heroPreviewUrl ?? (heroUrlRaw ? resolveMediaUrl(heroUrlRaw) : "");

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

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Profile photo
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  overflow: "hidden",
                  bgcolor: "#333",
                  border: "2px solid #444",
                  flexShrink: 0,
                }}
              >
                {avatarDisplaySrc ? (
                  <Box
                    component="img"
                    src={avatarDisplaySrc}
                    alt=""
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : null}
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button component="label" variant="outlined" size="small" sx={{ textTransform: "none" }}>
                  Upload
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setAvatarFile(f ?? null);
                      e.target.value = "";
                    }}
                  />
                </Button>
                <Button
                  variant="text"
                  size="small"
                  disabled={!avatarUrlRaw && !avatarFile}
                  onClick={() => {
                    setAvatarFile(null);
                    setAvatarUrlRaw(null);
                  }}
                  sx={{ textTransform: "none" }}
                >
                  Remove
                </Button>
              </Stack>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              JPEG, PNG, or WebP — max 5MB.
            </Typography>
          </Box>

          {canEditHero && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Channel cover (hero image)
              </Typography>
              <Stack spacing={1}>
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 400,
                    aspectRatio: "16 / 9",
                    borderRadius: 1,
                    overflow: "hidden",
                    bgcolor: "#333",
                    border: "1px solid #444",
                  }}
                >
                  {heroDisplaySrc ? (
                    <Box
                      component="img"
                      src={heroDisplaySrc}
                      alt=""
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : null}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button component="label" variant="outlined" size="small" sx={{ textTransform: "none" }}>
                    Upload cover
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setHeroFile(f ?? null);
                        e.target.value = "";
                      }}
                    />
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    disabled={!heroUrlRaw && !heroFile}
                    onClick={() => {
                      setHeroFile(null);
                      setHeroUrlRaw(null);
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Remove
                  </Button>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Wide image for the top of your channel. JPEG, PNG, or WebP — max 5MB.
                </Typography>
              </Stack>
            </Box>
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
