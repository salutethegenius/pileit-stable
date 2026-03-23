"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import { useAuth } from "@/providers/AuthProvider";
import PileItLockup from "@/components/brand/PileItLockup";
import {
  buildAuthPageSearch,
  isNextParamIgnored,
  safeInternalPath,
} from "@/lib/navigation";
import { ApiError } from "@/lib/api";

function registerErrorMessage(err: unknown): string {
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
    if (err.status === 400) return "Could not create account. That email may already be registered.";
    return err.message || `Request failed (${err.status}).`;
  }
  if (err instanceof TypeError && typeof err.message === "string" && err.message.includes("fetch")) {
    return "Cannot reach the API. Is the backend running? On localhost the app expects http://127.0.0.1:8000 unless NEXT_PUBLIC_API_URL is set.";
  }
  return "Could not create account. Check your connection and try again.";
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rawNext = searchParams.get("next");
  const nextPath = safeInternalPath(rawNext);
  const nextWasInvalid = isNextParamIgnored(rawNext, nextPath);

  useEffect(() => {
    const q = searchParams.get("email");
    if (!q) return;
    const t = q.trim();
    if (t.includes("@")) setEmail(t);
  }, [searchParams]);

  const loginHref = `/login${buildAuthPageSearch(nextPath, searchParams.get("email"))}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await register(email, password, displayName);
      const destination = nextPath !== "/" ? nextPath : "/browse";
      router.push(destination);
    } catch (e) {
      setErr(registerErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 4, md: 6 },
        px: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 400, width: 1, bgcolor: "#2a2a2a", border: "1px solid #333" }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <PileItLockup markSize={48} textSize={32} />
        </Box>
        <Typography component="h1" variant="h5" fontStyle="italic" fontWeight={800} gutterBottom>
          Sign Up
        </Typography>
        <form onSubmit={(e) => void submit(e)}>
          {nextWasInvalid && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <code>next</code> must be a site path starting with <code>/</code> (example:{" "}
              <Link href="/register?next=%2Fadmin" style={{ color: "inherit" }}>
                /register?next=/admin
              </Link>
              ). To pre-fill email, use{" "}
              <code>?email=you@example.com</code>.
            </Alert>
          )}
          {err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {err}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2, textTransform: "none" }}
            disabled={loading}
          >
            Create account
          </Button>
        </form>
        <Typography sx={{ mt: 2 }} color="text.secondary" component="div">
          Already have an account?{" "}
          <Link href={loginHref} style={{ color: "#fb923c", whiteSpace: "nowrap" }}>
            Log in
          </Link>
        </Typography>
        <Typography sx={{ mt: 1 }}>
          <Link href="/browse" style={{ color: "#999" }}>
            ← Back to Browse
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

function RegisterFallback() {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 4, md: 6 },
        px: 2,
        bgcolor: "background.default",
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 400, width: 1, bgcolor: "#2a2a2a", border: "1px solid #333" }}>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 2, bgcolor: "#333" }} />
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton variant="rounded" height={56} sx={{ mt: 2, bgcolor: "#333" }} />
        <Skeleton variant="rounded" height={56} sx={{ mt: 2, bgcolor: "#333" }} />
        <Skeleton variant="rounded" height={56} sx={{ mt: 2, bgcolor: "#333" }} />
      </Paper>
    </Box>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
