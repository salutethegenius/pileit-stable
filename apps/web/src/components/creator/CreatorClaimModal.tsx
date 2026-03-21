"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { apiFetch, getApiBase, ApiError } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

function claimStorageKey(handle: string) {
  return `pileit_claim_${handle}`;
}

async function claimAuthorizedFetch<T>(
  path: string,
  claimToken: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${claimToken}`);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new ApiError(res.statusText || "Request failed", res.status, text);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

type Props = {
  open: boolean;
  onClose: () => void;
  handle: string;
  claimStatus: string | undefined;
};

export default function CreatorClaimModal({ open, onClose, handle, claimStatus }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setTokens, refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [igUrl, setIgUrl] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [igUsername, setIgUsername] = useState("PileItOfficial");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [videoTitle, setVideoTitle] = useState("Intro");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbUrl, setThumbUrl] = useState("");

  const tokenKey = useMemo(() => claimStorageKey(handle), [handle]);

  const readToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(tokenKey);
  }, [tokenKey]);

  useEffect(() => {
    const t = searchParams.get("claim_token");
    if (t && typeof window !== "undefined") {
      sessionStorage.setItem(tokenKey, t);
      const base = pathname || `/creator/${handle}`;
      router.replace(base, { scroll: false });
    }
  }, [handle, pathname, router, searchParams, tokenKey]);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setDevLink(null);
    setReviewMessage(null);
    const tok = readToken();
    const st = claimStatus || "live";
    if (st === "identity_review") {
      setReviewMessage(
        "We're verifying your Instagram profile. Expect a response within 24 hours."
      );
      setStep(-1);
      return;
    }
    if (st === "social_verified" && tok) {
      setStep(2);
      return;
    }
    if ((st === "email_verified" || st === "unclaimed") && tok) {
      setStep(1);
      return;
    }
    setStep(0);
  }, [open, claimStatus, readToken]);

  useEffect(() => {
    if (step !== 1 || !code) return;
    const tok = readToken();
    if (!tok) return;
    const id = window.setInterval(async () => {
      try {
        const s = await claimAuthorizedFetch<{ claim_status: string }>(
          `/creators/${encodeURIComponent(handle)}/claim/status`,
          tok
        );
        if (s.claim_status === "social_verified") {
          setStep(2);
        }
      } catch {
        /* ignore poll errors */
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [step, code, handle, readToken]);

  const startEmail = async () => {
    setBusy(true);
    setErr(null);
    try {
      const data = await apiFetch<{
        ok: boolean;
        _dev_verify_url?: string;
        detail?: string;
      }>(`/creators/${encodeURIComponent(handle)}/claim/start`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (data._dev_verify_url) setDevLink(data._dev_verify_url);
    } catch (e) {
      setErr(e instanceof ApiError ? e.body || e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const startSocial = async () => {
    const tok = readToken();
    if (!tok) {
      setErr("Session missing. Open the link from your email again.");
      return;
    }
    setBusy(true);
    setErr(null);
    setCode(null);
    try {
      const data = await claimAuthorizedFetch<{
        needs_review?: boolean;
        message?: string;
        code?: string;
        instagram_username?: string;
      }>(`/creators/${encodeURIComponent(handle)}/claim/social`, tok, {
        method: "POST",
        body: JSON.stringify({
          instagram_url: igUrl.trim() || null,
        }),
      });
      if (data.needs_review) {
        setReviewMessage(data.message || "Under review.");
        setStep(-1);
        return;
      }
      if (data.code) {
        setCode(data.code);
        if (data.instagram_username) setIgUsername(data.instagram_username);
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.body || e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    const tok = readToken();
    if (!tok) {
      setErr("Session missing.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const data = await claimAuthorizedFetch<{
        access_token: string;
        refresh_token: string;
      }>(`/creators/${encodeURIComponent(handle)}/claim/complete`, tok, {
        method: "POST",
        body: JSON.stringify({
          password,
          video_title: videoTitle.trim(),
          video_url: videoUrl.trim(),
          thumbnail_url: thumbUrl.trim() || null,
          category: null,
        }),
      });
      setTokens(data.access_token, data.refresh_token);
      sessionStorage.removeItem(tokenKey);
      await refreshUser();
      onClose();
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.body || e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const igAppLink = `instagram://user?username=${encodeURIComponent(igUsername)}`;
  const igWeb = `https://instagram.com/${encodeURIComponent(igUsername)}`;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Claim this channel</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {err ? <Alert severity="error">{err}</Alert> : null}
          {reviewMessage ? <Alert severity="info">{reviewMessage}</Alert> : null}
          {devLink ? (
            <Alert severity="warning">
              Dev: open verification link{" "}
              <Link href={devLink} target="_blank" rel="noreferrer">
                here
              </Link>
              .
            </Alert>
          ) : null}

          {step === 0 ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Enter the email you want on your PileIt account. We will send a verification link.
              </Typography>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
              />
              <Button
                variant="contained"
                disabled={busy || !email.trim()}
                onClick={() => void startEmail()}
                sx={{ textTransform: "none", alignSelf: "flex-start" }}
              >
                {busy ? <CircularProgress size={22} /> : "Send verification link"}
              </Button>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Optional: paste your Instagram profile URL so we can match it to @{handle}.
              </Typography>
              <TextField
                label="Instagram profile URL (optional)"
                value={igUrl}
                onChange={(e) => setIgUrl(e.target.value)}
                fullWidth
              />
              {!code ? (
                <Button
                  variant="contained"
                  disabled={busy}
                  onClick={() => void startSocial()}
                  sx={{ textTransform: "none", alignSelf: "flex-start" }}
                >
                  {busy ? <CircularProgress size={22} /> : "Get Instagram code"}
                </Button>
              ) : (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    DM this code to @{igUsername} on Instagram:
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    letterSpacing={2}
                    sx={{ fontFamily: "monospace", mb: 2 }}
                  >
                    {code}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Code expires in 15 minutes. This page checks every few seconds for confirmation.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      component="a"
                      href={igAppLink}
                      variant="outlined"
                      sx={{ textTransform: "none" }}
                    >
                      Open Instagram app
                    </Button>
                    <Button
                      component="a"
                      href={igWeb}
                      target="_blank"
                      rel="noreferrer"
                      variant="text"
                      sx={{ textTransform: "none" }}
                    >
                      Open in browser
                    </Button>
                  </Stack>
                </Box>
              )}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Set your password and add your intro video (HTTPS URL). You can swap in Mux later.
              </Typography>
              <TextField
                label="Password (min 8 characters)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              <TextField
                label="Intro title"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                fullWidth
              />
              <TextField
                label="Intro video URL (HTTPS)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Thumbnail URL (optional)"
                value={thumbUrl}
                onChange={(e) => setThumbUrl(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                disabled={busy || password.length < 8 || !videoUrl.trim()}
                onClick={() => void finish()}
                sx={{ textTransform: "none", alignSelf: "flex-start" }}
              >
                {busy ? <CircularProgress size={22} /> : "Go live"}
              </Button>
            </>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
