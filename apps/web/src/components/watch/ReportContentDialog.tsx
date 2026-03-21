"use client";

import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";

const REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate speech" },
  { value: "sexual_content", label: "Sexual content" },
  { value: "violence", label: "Violence or dangerous acts" },
  { value: "copyright", label: "Copyright / IP" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
] as const;

export type ReportTargetType = "video" | "pile_comment" | "live_chat";

type Props = {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  title: string;
  onSubmitted?: () => void;
};

export default function ReportContentDialog({
  open,
  onClose,
  targetType,
  targetId,
  title,
  onSubmitted,
}: Props) {
  const { accessToken } = useAuth();
  const [reason, setReason] = useState<string>("other");
  const [details, setDetails] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("other");
    setDetails("");
    setErr(null);
  }, [open, targetId]);

  const submit = async () => {
    if (!accessToken) {
      setErr("Log in to submit a report.");
      return;
    }
    setSending(true);
    setErr(null);
    try {
      await apiFetch("/reports", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason,
          details: details.trim() || null,
        }),
      });
      onSubmitted?.();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit report.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Reports are reviewed by moderators. Misuse may affect your account.
        </Typography>
        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}
        <TextField
          select
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 2 }}
        >
          {REASONS.map((r) => (
            <MenuItem key={r.value} value={r.value}>
              {r.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Additional details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          size="small"
          inputProps={{ maxLength: 2000 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={sending || !accessToken}>
          {sending ? "Sending…" : "Submit report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
