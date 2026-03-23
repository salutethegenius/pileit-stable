"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "@/providers/AuthProvider";
import { apiFetch, getApiBase } from "@/lib/api";
import { PILEIT_THEME } from "@/theme/theme";
import { formatBsd } from "@/utils/currency";

type ChannelRow = { label: string; url: string };

type Application = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  message: string | null;
  social_links: string | null;
  channels: ChannelRow[];
  mission_text: string | null;
  content_plan_text: string | null;
  primary_category: string | null;
  submitted_at: string;
};

type Stats = {
  total_users: number;
  total_creators: number;
  total_tips: number;
  total_views: number;
};

type ModReportContext = {
  video_title?: string;
  video_status?: string;
  creator_handle?: string;
  video_id?: string;
  comment_type?: string;
  comment_preview?: string;
  message_preview?: string;
};

type ModReport = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_email: string;
  reporter_display_name: string;
  context: ModReportContext;
};

type AdminCreator = {
  id: string;
  email: string;
  handle: string;
  display_name: string;
  verified: boolean;
  category: string;
  video_count: number;
  subscriber_count: number;
  monetization_eligible: boolean;
  payout_status: string;
};

type DeletedCreator = {
  log_id: string;
  user_id: string;
  display_name: string;
  email: string;
  handle: string;
  deleted_at: string;
  reason: string | null;
};

type MonetizationPending = {
  user_id: string;
  email: string;
  display_name: string;
  handle: string;
  payout_provider: string | null;
  payout_account_detail: string | null;
  kyc_submitted_at: string;
  kyc_id_document_url: string | null;
  kyc_selfie_url: string | null;
};

async function fetchKycBlobUrl(
  accessToken: string,
  userId: string,
  which: "id_document" | "selfie"
): Promise<{ url: string; title: string } | null> {
  const res = await fetch(
    `${getApiBase()}/admin/monetization/${userId}/file/${which}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const ct = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buf = await res.arrayBuffer();
  const blob = new Blob([buf], { type: ct });
  const url = URL.createObjectURL(blob);
  return {
    url,
    title: which === "id_document" ? "Government ID" : "Selfie",
  };
}

export default function AdminPageClient() {
  const { user, accessToken, loading } = useAuth();
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<
    { id: string; email: string; display_name: string; account_type: string }[]
  >([]);
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [deletedCreators, setDeletedCreators] = useState<DeletedCreator[]>([]);
  const [monPending, setMonPending] = useState<MonetizationPending[]>([]);
  const [modReports, setModReports] = useState<ModReport[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kycPreview, setKycPreview] = useState<{ url: string; title: string } | null>(null);

  const closeKycPreview = () => {
    setKycPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  useEffect(() => {
    if (!loading && user && user.accountType !== "admin") {
      router.replace("/");
    }
  }, [user, loading, router]);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoadError(null);
    void (async () => {
      const results = await Promise.allSettled([
        apiFetch<Application[]>("/admin/applications", { accessToken }),
        apiFetch<Stats>("/admin/stats", { accessToken }),
        apiFetch<
          { id: string; email: string; display_name: string; account_type: string }[]
        >("/admin/users", { accessToken }),
        apiFetch<AdminCreator[]>("/admin/creators", { accessToken }),
        apiFetch<DeletedCreator[]>("/admin/creators/deleted", { accessToken }),
        apiFetch<MonetizationPending[]>("/admin/monetization/pending", { accessToken }),
        apiFetch<ModReport[]>("/admin/moderation/reports?status=pending", { accessToken }),
      ]);
      const labels = [
        "Applications",
        "Stats",
        "Users",
        "Creators",
        "Deleted creators",
        "Monetization queue",
        "Moderation",
      ] as const;
      const errs: string[] = [];
      if (results[0].status === "fulfilled") setApps(results[0].value);
      else {
        setApps([]);
        errs.push(
          `${labels[0]}: ${results[0].reason instanceof Error ? results[0].reason.message : String(results[0].reason)}`
        );
      }
      if (results[1].status === "fulfilled") setStats(results[1].value);
      else {
        setStats(null);
        errs.push(
          `${labels[1]}: ${results[1].reason instanceof Error ? results[1].reason.message : String(results[1].reason)}`
        );
      }
      if (results[2].status === "fulfilled") setUsers(results[2].value);
      else {
        setUsers([]);
        errs.push(
          `${labels[2]}: ${results[2].reason instanceof Error ? results[2].reason.message : String(results[2].reason)}`
        );
      }
      if (results[3].status === "fulfilled") setCreators(results[3].value);
      else {
        setCreators([]);
        errs.push(
          `${labels[3]}: ${results[3].reason instanceof Error ? results[3].reason.message : String(results[3].reason)}`
        );
      }
      if (results[4].status === "fulfilled") setDeletedCreators(results[4].value);
      else {
        setDeletedCreators([]);
        errs.push(
          `${labels[4]}: ${results[4].reason instanceof Error ? results[4].reason.message : String(results[4].reason)}`
        );
      }
      if (results[5].status === "fulfilled") setMonPending(results[5].value);
      else {
        setMonPending([]);
        errs.push(
          `${labels[5]}: ${results[5].reason instanceof Error ? results[5].reason.message : String(results[5].reason)}`
        );
      }
      if (results[6].status === "fulfilled") setModReports(results[6].value);
      else {
        setModReports([]);
        errs.push(
          `${labels[6]}: ${results[6].reason instanceof Error ? results[6].reason.message : String(results[6].reason)}`
        );
      }
      if (errs.length) setLoadError(errs.join(" · "));
    })();
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && user?.accountType === "admin") load();
  }, [accessToken, user?.accountType, load]);

  useEffect(() => {
    return () => {
      if (kycPreview?.url) URL.revokeObjectURL(kycPreview.url);
    };
  }, [kycPreview]);

  const showKycPreview = useCallback(
    async (uid: string, which: "id_document" | "selfie") => {
      if (!accessToken) return;
      const next = await fetchKycBlobUrl(accessToken, uid, which);
      if (!next) return;
      setKycPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return next;
      });
    },
    [accessToken]
  );

  const approve = async (id: string) => {
    if (!accessToken) return;
    await apiFetch(`/admin/applications/${id}/approve`, {
      method: "POST",
      accessToken,
    });
    load();
  };

  const decline = async (id: string) => {
    if (!accessToken) return;
    await apiFetch(`/admin/applications/${id}/decline`, {
      method: "POST",
      accessToken,
    });
    load();
  };

  const approveMon = async (uid: string) => {
    if (!accessToken) return;
    await apiFetch(`/admin/monetization/${uid}/approve`, {
      method: "POST",
      accessToken,
    });
    load();
  };

  const rejectMon = async (uid: string) => {
    if (!accessToken) return;
    const reason = window.prompt("Rejection reason (min 3 characters):");
    if (!reason || reason.trim().length < 3) return;
    await apiFetch(`/admin/monetization/${uid}/reject`, {
      method: "POST",
      accessToken,
      body: JSON.stringify({ reason: reason.trim() }),
    });
    load();
  };

  const setCreatorVerified = async (userId: string, verified: boolean) => {
    if (!accessToken) return;
    await apiFetch(`/admin/creators/${userId}/verified`, {
      method: "POST",
      accessToken,
      body: JSON.stringify({ verified }),
    });
    load();
  };

  const deleteCreator = async (userId: string, displayName: string) => {
    if (!accessToken) return;
    const reason = window.prompt(
      `Reason for deleting creator "${displayName}"? (optional, saved in audit log)`
    );
    if (reason === null) return;
    const ok = window.confirm(
      `Delete creator "${displayName}"?\n\nThis will remove creator privileges, unpublish their videos, and cancel active subscriptions.`
    );
    if (!ok) return;
    await apiFetch(`/admin/creators/${userId}`, {
      method: "DELETE",
      accessToken,
      body: JSON.stringify({ reason: reason.trim() || null }),
    });
    load();
  };

  const restoreCreator = async (userId: string, displayName: string) => {
    if (!accessToken) return;
    const ok = window.confirm(
      `Restore creator "${displayName}"?\n\nThis will restore their creator profile and reactivate previous creator visibility.`
    );
    if (!ok) return;
    await apiFetch(`/admin/creators/${userId}/restore`, {
      method: "POST",
      accessToken,
    });
    load();
  };

  const dismissModReport = async (reportId: string) => {
    if (!accessToken) return;
    await apiFetch(`/admin/moderation/${reportId}/dismiss`, {
      method: "POST",
      accessToken,
    });
    load();
  };

  const resolveModReport = async (
    reportId: string,
    action: "acknowledge" | "unpublish_video" | "delete_pile" | "delete_chat"
  ) => {
    if (!accessToken) return;
    await apiFetch(`/admin/moderation/${reportId}/resolve`, {
      method: "POST",
      accessToken,
      body: JSON.stringify({ action }),
    });
    load();
  };

  const modPreview = (r: ModReport) => {
    const c = r.context;
    if (r.target_type === "video") {
      return `${c.video_title ?? "Video"} · status ${c.video_status ?? "—"} · @${c.creator_handle ?? "—"}`;
    }
    if (r.target_type === "pile_comment") {
      const snippet = c.comment_preview || c.comment_type || "—";
      return `${c.video_title ?? "Video"} · ${snippet}`;
    }
    if (r.target_type === "live_chat") {
      return `${c.video_title ?? "Video"} · “${(c.message_preview ?? "").slice(0, 100)}”`;
    }
    return r.target_id;
  };

  if (loading || !user) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton height={40} />
      </Box>
    );
  }

  if (user.accountType !== "admin") return null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Typography component="h1" variant="h4" fontStyle="italic" fontWeight={800} gutterBottom>
        Admin
      </Typography>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLoadError(null)}>
          Failed to load admin data ({loadError}). Check that you are logged in as admin and the
          API URL matches the backend (e.g. same host as in <code>NEXT_PUBLIC_API_URL</code>).
        </Alert>
      )}
      {stats && (
        <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
          {Object.entries(stats).map(([k, v]) => (
            <Paper
              key={k}
              sx={{
                p: 2,
                minWidth: 140,
                bgcolor: "#2a2a2a",
                border: `1px solid ${PILEIT_THEME.border}`,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {k.replace(/_/g, " ")}
              </Typography>
              <Typography variant="h6">
                {k === "total_tips" ? formatBsd(Number(v)) : v}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      <Typography component="h2" variant="h6" sx={{ mt: 3, mb: 1 }}>
        Creator applications
      </Typography>
      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {apps.flatMap((a) => [
            <TableRow key={a.id}>
              <TableCell>{a.display_name}</TableCell>
              <TableCell>{a.email}</TableCell>
              <TableCell>{a.primary_category || "—"}</TableCell>
              <TableCell>{a.submitted_at?.slice(0, 10) || "—"}</TableCell>
              <TableCell>
                <Button size="small" onClick={() => void approve(a.id)}>
                  Approve
                </Button>
                <Button size="small" color="inherit" onClick={() => void decline(a.id)}>
                  Decline
                </Button>
              </TableCell>
            </TableRow>,
            <TableRow key={`${a.id}-detail`}>
              <TableCell colSpan={5} sx={{ borderTop: 0, pt: 0, pb: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Channels
                </Typography>
                {(a.channels?.length ? a.channels : []).map((c, i) => (
                  <Typography key={i} variant="body2">
                    {c.label}:{" "}
                    <Link href={c.url} target="_blank" rel="noopener noreferrer">
                      {c.url}
                    </Link>
                  </Typography>
                ))}
                {!a.channels?.length && a.social_links && (
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {a.social_links}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Mission
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {a.mission_text || "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Content plan
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {a.content_plan_text || "—"}
                </Typography>
              </TableCell>
            </TableRow>,
          ])}
        </TableBody>
      </Table>

      <Typography component="h2" variant="h6" sx={{ mt: 3, mb: 1 }}>
        Monetization / KYC (pending review)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Government ID and selfie on disk; payout via Cash n Go, Sun Cash, or other local
        processors. Approve only after manual verification.
      </Typography>
      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>Creator</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Provider</TableCell>
            <TableCell>Payout detail</TableCell>
            <TableCell>Files</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {monPending.map((m) => (
            <TableRow key={m.user_id}>
              <TableCell>{m.display_name}</TableCell>
              <TableCell>{m.email}</TableCell>
              <TableCell>{m.payout_provider || "—"}</TableCell>
              <TableCell sx={{ maxWidth: 200 }}>{m.payout_account_detail || "—"}</TableCell>
              <TableCell>
                {accessToken && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      onClick={() => void showKycPreview(m.user_id, "id_document")}
                    >
                      Preview ID
                    </Button>
                    <Button
                      size="small"
                      onClick={() => void showKycPreview(m.user_id, "selfie")}
                    >
                      Preview selfie
                    </Button>
                  </Stack>
                )}
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => void approveMon(m.user_id)}>
                  Approve
                </Button>
                <Button size="small" color="inherit" onClick={() => void rejectMon(m.user_id)}>
                  Reject
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography component="h2" variant="h6" sx={{ mt: 3, mb: 1 }}>
        Creators
      </Typography>
      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>Display name</TableCell>
            <TableCell>Handle</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Verified</TableCell>
            <TableCell>Monetized</TableCell>
            <TableCell>Payout</TableCell>
            <TableCell align="right">Videos</TableCell>
            <TableCell align="right">Subscribers</TableCell>
            <TableCell>Verified (blue badge)</TableCell>
            <TableCell>Creator account</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {creators.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.display_name}</TableCell>
              <TableCell>@{c.handle}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.category || "—"}</TableCell>
              <TableCell>{c.verified ? "Yes" : "No"}</TableCell>
              <TableCell>{c.monetization_eligible ? "Yes" : "No"}</TableCell>
              <TableCell>{c.payout_status || "—"}</TableCell>
              <TableCell align="right">{c.video_count}</TableCell>
              <TableCell align="right">{c.subscriber_count}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  <Button
                    size="small"
                    disabled={c.verified}
                    onClick={() => void setCreatorVerified(c.id, true)}
                  >
                    Grant
                  </Button>
                  <Button
                    size="small"
                    color="inherit"
                    disabled={!c.verified}
                    onClick={() => void setCreatorVerified(c.id, false)}
                  >
                    Revoke
                  </Button>
                </Stack>
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  color="error"
                  onClick={() => void deleteCreator(c.id, c.display_name)}
                >
                  Delete creator
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography component="h2" variant="h6" sx={{ mt: 1, mb: 1 }}>
        Deleted creators (reversible)
      </Typography>
      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Handle</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Deleted at</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deletedCreators.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>
                <Typography variant="body2" color="text.secondary">
                  No deleted creators.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            deletedCreators.map((d) => (
              <TableRow key={d.log_id}>
                <TableCell>{d.display_name}</TableCell>
                <TableCell>@{d.handle || "—"}</TableCell>
                <TableCell>{d.email}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {d.deleted_at ? new Date(d.deleted_at).toLocaleString() : "—"}
                </TableCell>
                <TableCell>{d.reason || "—"}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => void restoreCreator(d.user_id, d.display_name)}>
                    Restore
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
        Content moderation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Pending user reports for videos, pile comments, and live chat. Dismiss if not actionable;
        acknowledge to close without removing content; use remove actions to unpublish or delete.
      </Typography>
      <Table size="small" sx={{ mb: 4 }}>
        <TableHead>
          <TableRow>
            <TableCell>Submitted</TableCell>
            <TableCell>Reporter</TableCell>
            <TableCell>Target</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Context</TableCell>
            <TableCell>Details</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {modReports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <Typography variant="body2" color="text.secondary">
                  No pending reports.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            modReports.map((r) => (
              <TableRow key={r.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {r.reporter_display_name}
                  <Typography variant="caption" display="block" color="text.secondary">
                    {r.reporter_email}
                  </Typography>
                </TableCell>
                <TableCell>
                  {r.target_type}
                  <Typography variant="caption" display="block" color="text.secondary">
                    {r.target_id.slice(0, 8)}…
                  </Typography>
                </TableCell>
                <TableCell>{r.reason}</TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                    {modPreview(r)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                    {r.details || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="column" spacing={0.5} alignItems="flex-start">
                    <Button size="small" onClick={() => void dismissModReport(r.id)}>
                      Dismiss
                    </Button>
                    <Button
                      size="small"
                      color="secondary"
                      onClick={() => void resolveModReport(r.id, "acknowledge")}
                    >
                      Acknowledge
                    </Button>
                    {r.target_type === "video" && (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => void resolveModReport(r.id, "unpublish_video")}
                      >
                        Unpublish video
                      </Button>
                    )}
                    {r.target_type === "pile_comment" && (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => void resolveModReport(r.id, "delete_pile")}
                      >
                        Delete comment
                      </Button>
                    )}
                    {r.target_type === "live_chat" && (
                      <Button
                        size="small"
                        color="warning"
                        onClick={() => void resolveModReport(r.id, "delete_chat")}
                      >
                        Delete message
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
        Users
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.display_name}</TableCell>
              <TableCell>{u.account_type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={Boolean(kycPreview)}
        onClose={closeKycPreview}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          {kycPreview?.title}
          <IconButton aria-label="Close preview" onClick={closeKycPreview} edge="end">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            bgcolor: "#1a1a1a",
            display: "flex",
            justifyContent: "center",
            p: 2,
          }}
        >
          {kycPreview ? (
            <Box
              component="img"
              src={kycPreview.url}
              alt={kycPreview.title}
              sx={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
