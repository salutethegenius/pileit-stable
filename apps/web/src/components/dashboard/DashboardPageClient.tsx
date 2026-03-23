"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import { useAuth } from "@/providers/AuthProvider";
import { apiFetch, getApiBase } from "@/lib/api";
import { PILEIT_THEME } from "@/theme/theme";
import { formatBsd } from "@/utils/currency";

type Overview = {
  total_earnings: number;
  this_month: number;
  subscribers: number;
  total_views: number;
  recent_tips: { amount: number; at: string }[];
  recent_comments: { id: string; video_id: string; preview: string; at: string }[];
};

type MineVideo = {
  id: string;
  title: string;
  status: string;
  view_count: number;
  tip_total: number;
  is_locked: boolean;
  isrc?: string | null;
};

type IsrcUsageSummary = {
  date_from: string | null;
  date_to: string | null;
  rows: { isrc: string; plays: number }[];
};

type MonStatus = {
  payout_status: string;
  monetization_eligible: boolean;
  payout_provider: string | null;
  payout_account_detail: string | null;
  kyc_submitted_at: string | null;
  monetization_reject_reason: string | null;
};

export default function DashboardPageClient() {
  const { user, accessToken, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [mine, setMine] = useState<MineVideo[]>([]);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [monStatus, setMonStatus] = useState<MonStatus | null>(null);
  const [payoutProvider, setPayoutProvider] = useState("cash_n_go");
  const [payoutDetail, setPayoutDetail] = useState("");
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [monErr, setMonErr] = useState<string | null>(null);
  const [monLoading, setMonLoading] = useState(false);
  const [usageFrom, setUsageFrom] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [usageTo, setUsageTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [usageCreatorId, setUsageCreatorId] = useState("");
  const [usageSummary, setUsageSummary] = useState<IsrcUsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageErr, setUsageErr] = useState<string | null>(null);

  const loadMon = useCallback(() => {
    if (!accessToken || user?.accountType !== "creator") {
      setMonStatus(null);
      return;
    }
    apiFetch<MonStatus>("/creators/monetization/status", { accessToken })
      .then(setMonStatus)
      .catch(() => setMonStatus(null));
  }, [accessToken, user?.accountType]);

  useEffect(() => {
    if (!loading && user && user.accountType !== "creator" && user.accountType !== "admin") {
      router.replace("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!accessToken || !user || (user.accountType !== "creator" && user.accountType !== "admin"))
      return;
    apiFetch<Overview>("/dashboard/overview", { accessToken })
      .then(setOverview)
      .catch(() => setOverview(null));
    apiFetch<MineVideo[]>("/videos/mine", { accessToken })
      .then(setMine)
      .catch(() => setMine([]));
    loadMon();
  }, [accessToken, user, loadMon]);

  const addProduct = async () => {
    if (!accessToken || !productName || !productPrice) return;
    await apiFetch("/store/products", {
      method: "POST",
      accessToken,
      body: JSON.stringify({
        name: productName,
        price: parseFloat(productPrice),
        product_type: "digital",
      }),
    });
    setProductName("");
    setProductPrice("");
  };

  const loadIsrcUsage = async () => {
    if (!accessToken || !user) return;
    setUsageErr(null);
    setUsageLoading(true);
    try {
      const qs = new URLSearchParams();
      if (usageFrom) qs.set("from", usageFrom);
      if (usageTo) qs.set("to", usageTo);
      if (user.accountType === "admin" && usageCreatorId.trim()) {
        qs.set("creator_id", usageCreatorId.trim());
      }
      const data = await apiFetch<IsrcUsageSummary>(
        `/usage/isrc-summary?${qs.toString()}`,
        { accessToken }
      );
      setUsageSummary(data);
    } catch {
      setUsageErr("Could not load ISRC usage. Check dates and try again.");
      setUsageSummary(null);
    } finally {
      setUsageLoading(false);
    }
  };

  const downloadIsrcCsv = async () => {
    if (!accessToken || !user) return;
    setUsageErr(null);
    try {
      const qs = new URLSearchParams();
      if (usageFrom) qs.set("from", usageFrom);
      if (usageTo) qs.set("to", usageTo);
      if (user.accountType === "admin" && usageCreatorId.trim()) {
        qs.set("creator_id", usageCreatorId.trim());
      }
      const res = await fetch(
        `${getApiBase()}/usage/isrc-summary/export?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) {
        setUsageErr("CSV export failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "isrc_usage_summary.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setUsageErr("CSV export failed.");
    }
  };

  const submitMonetization = async () => {
    if (!accessToken || !idDoc || !selfie || !payoutDetail.trim()) {
      setMonErr("ID photo, selfie, and payout account details are required.");
      return;
    }
    setMonErr(null);
    setMonLoading(true);
    try {
      const fd = new FormData();
      fd.append("id_document", idDoc);
      fd.append("selfie", selfie);
      fd.append("payout_provider", payoutProvider);
      fd.append("payout_account_detail", payoutDetail.trim());
      await apiFetch("/creators/monetization/submit", {
        method: "POST",
        accessToken,
        body: fd,
      });
      setIdDoc(null);
      setSelfie(null);
      await refreshUser();
      loadMon();
    } catch {
      setMonErr("Submit failed. You may already have a submission pending.");
    } finally {
      setMonLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={48} />
        <Skeleton height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (user.accountType !== "creator" && user.accountType !== "admin") {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "calc(100vh - 64px)",
        width: "100%",
        maxWidth: 1440,
        mx: "auto",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 220,
          borderRight: `1px solid ${PILEIT_THEME.border}`,
          bgcolor: "#1a1a1a",
          display: { xs: "none", md: "block" },
        }}
      >
        <Typography
          component="p"
          sx={{ p: 2, fontWeight: 800, fontStyle: "italic", m: 0 }}
        >
          Dashboard
        </Typography>
        {["Overview", "Videos", "Earnings", "Shop", "Analytics", "Settings"].map(
          (label, i) => (
            <Button
              key={label}
              fullWidth
              onClick={() => setTab(i)}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                color: tab === i ? "primary.main" : "text.secondary",
                borderRadius: 0,
              }}
            >
              {label}
            </Button>
          )
        )}
      </Paper>
      <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
        <Typography component="h1" variant="h5" fontStyle="italic" fontWeight={800} sx={{ mb: 2 }}>
          Creator dashboard
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ display: { xs: "block", md: "none" }, mb: 2 }}
          variant="scrollable"
        >
          {["Overview", "Videos", "Earnings", "Shop", "Analytics", "Settings"].map(
            (l, i) => (
              <Tab key={l} label={l} value={i} />
            )
          )}
        </Tabs>

        {tab === 0 && (
          <Box>
            <Typography
              component="h2"
              variant="h5"
              fontStyle="italic"
              fontWeight={800}
              gutterBottom
            >
              Overview
            </Typography>
            {user.accountType === "creator" && monStatus && !monStatus.monetization_eligible && (
              <Paper
                sx={{
                  p: 2,
                  mb: 3,
                  bgcolor: "#2a2a2a",
                  border: `1px solid ${PILEIT_THEME.border}`,
                }}
              >
                <Typography fontWeight={800} fontStyle="italic" gutterBottom>
                  Unlock earnings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  You can post on PileIt. To receive tips, subscriptions, and shop payouts, upload a
                  government ID and a selfie, then add your local digital wallet (e.g. Cash n Go
                  or Sun Cash). Our team reviews every submission.
                </Typography>
                {monStatus.payout_status === "submitted" && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Payout verification submitted — pending admin review.
                  </Alert>
                )}
                {monStatus.payout_status === "rejected" && monStatus.monetization_reject_reason && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {monStatus.monetization_reject_reason}
                  </Alert>
                )}
                {(monStatus.payout_status === "not_started" ||
                  monStatus.payout_status === "rejected") && (
                  <Stack spacing={2} sx={{ maxWidth: 480 }}>
                    <Button variant="outlined" component="label" sx={{ textTransform: "none" }}>
                      Government ID (image)
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => setIdDoc(e.target.files?.[0] ?? null)}
                      />
                    </Button>
                    {idDoc && (
                      <Typography variant="caption">{idDoc.name}</Typography>
                    )}
                    <Button variant="outlined" component="label" sx={{ textTransform: "none" }}>
                      Selfie (image)
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
                      />
                    </Button>
                    {selfie && (
                      <Typography variant="caption">{selfie.name}</Typography>
                    )}
                    <TextField
                      select
                      label="Payout provider"
                      value={payoutProvider}
                      onChange={(e) => setPayoutProvider(e.target.value)}
                      size="small"
                    >
                      <MenuItem value="cash_n_go">Cash n Go</MenuItem>
                      <MenuItem value="sun_cash">Sun Cash</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </TextField>
                    <TextField
                      label="Account / phone / handle on file with provider"
                      value={payoutDetail}
                      onChange={(e) => setPayoutDetail(e.target.value)}
                      size="small"
                      fullWidth
                    />
                    {monErr && (
                      <Typography color="error" variant="body2">
                        {monErr}
                      </Typography>
                    )}
                    <Button
                      variant="contained"
                      disabled={monLoading}
                      onClick={() => void submitMonetization()}
                      sx={{ textTransform: "none" }}
                    >
                      Submit for review
                    </Button>
                  </Stack>
                )}
              </Paper>
            )}
            {user.accountType === "creator" && monStatus?.monetization_eligible && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Payout verification approved — you can receive tips, subscriptions, and shop sales.
              </Alert>
            )}
            {overview ? (
              <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
                {[
                  ["Total earnings", overview.total_earnings],
                  ["This month", overview.this_month],
                  ["Subscribers", overview.subscribers],
                  ["Total views", overview.total_views],
                ].map(([a, b]) => (
                  <Paper
                    key={String(a)}
                    sx={{
                      p: 2,
                      minWidth: 160,
                      bgcolor: "#2a2a2a",
                      border: `1px solid ${PILEIT_THEME.border}`,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {a}
                    </Typography>
                    <Typography variant="h6">{String(b)}</Typography>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Unable to load overview.</Typography>
            )}
            <Typography fontWeight={700} sx={{ mt: 2 }}>
              Recent tips
            </Typography>
            {(overview?.recent_tips ?? []).map((t, i) => (
              <Typography key={i} variant="body2">
                {formatBsd(t.amount)} · {t.at}
              </Typography>
            ))}
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Typography
              component="h2"
              variant="h5"
              fontStyle="italic"
              fontWeight={800}
              gutterBottom
            >
              Videos
            </Typography>
            <Button
              component={Link}
              href="/dashboard/upload"
              variant="contained"
              sx={{ mb: 2, textTransform: "none" }}
            >
              Upload to PileIt
            </Button>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>ISRC</TableCell>
                  <TableCell>Views</TableCell>
                  <TableCell>Tips</TableCell>
                  <TableCell>Locked</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mine.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.title}</TableCell>
                    <TableCell>{v.status}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                      {v.isrc || "—"}
                    </TableCell>
                    <TableCell>{v.view_count}</TableCell>
                    <TableCell>{v.tip_total}</TableCell>
                    <TableCell>{v.is_locked ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {tab === 2 && (
          <Box>
            <Typography
              component="h2"
              variant="h5"
              fontStyle="italic"
              fontWeight={800}
              gutterBottom
            >
              Earnings
            </Typography>
            <Typography color="text.secondary">
              Monthly chart and payout history will connect to KemisPay settlement data.
            </Typography>
            <Button variant="contained" sx={{ mt: 2, textTransform: "none" }}>
              Withdraw via KemisPay
            </Button>
          </Box>
        )}

        {tab === 3 && (
          <Box>
            <Typography
              component="h2"
              variant="h5"
              fontStyle="italic"
              fontWeight={800}
              gutterBottom
            >
              Shop
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                label="Product name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                size="small"
              />
              <TextField
                label="Price (BSD)"
                type="number"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                size="small"
              />
              <Button variant="contained" onClick={() => void addProduct()}>
                Add product
              </Button>
            </Stack>
          </Box>
        )}

        {tab === 4 && (
          <Box>
            <Typography component="h2" variant="h5" fontStyle="italic" fontWeight={800} gutterBottom>
              Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 640 }}>
              <strong>ISRC usage</strong> — plays on videos that have an ISRC set (one row logged per watch-page
              view). Filter by UTC date range; export CSV for PRO filings (PRS, BMI, ASCAP, etc.).
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }} alignItems="flex-start">
              <TextField
                label="From (UTC)"
                type="date"
                size="small"
                value={usageFrom}
                onChange={(e) => setUsageFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="To (UTC)"
                type="date"
                size="small"
                value={usageTo}
                onChange={(e) => setUsageTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              {user.accountType === "admin" ? (
                <TextField
                  label="Creator user ID (optional)"
                  size="small"
                  value={usageCreatorId}
                  onChange={(e) => setUsageCreatorId(e.target.value)}
                  placeholder="Filter all usage to one creator"
                  sx={{ minWidth: 220 }}
                  InputLabelProps={{ shrink: true }}
                />
              ) : null}
              <Button
                variant="contained"
                disabled={usageLoading || !accessToken}
                onClick={() => void loadIsrcUsage()}
                sx={{ textTransform: "none" }}
              >
                {usageLoading ? "Loading…" : "Load ISRC summary"}
              </Button>
              <Button
                variant="outlined"
                disabled={!accessToken}
                onClick={() => void downloadIsrcCsv()}
                sx={{ textTransform: "none" }}
              >
                Download CSV
              </Button>
            </Stack>
            {usageErr && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {usageErr}
              </Alert>
            )}
            {usageSummary && usageSummary.rows.length === 0 ? (
              <Typography color="text.secondary">No ISRC plays in this range (add an ISRC on uploads).</Typography>
            ) : null}
            {usageSummary && usageSummary.rows.length > 0 ? (
              <Table size="small" sx={{ maxWidth: 480 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>ISRC</TableCell>
                    <TableCell align="right">Plays</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usageSummary.rows.map((r) => (
                    <TableRow key={r.isrc}>
                      <TableCell sx={{ fontFamily: "monospace" }}>{r.isrc}</TableCell>
                      <TableCell align="right">{r.plays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </Box>
        )}

        {tab === 5 && (
          <Box>
            <Typography component="h2" variant="h5" fontStyle="italic" fontWeight={800} gutterBottom>
              Settings
            </Typography>
            <Typography color="text.secondary">
              Channel settings and payout preferences.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
