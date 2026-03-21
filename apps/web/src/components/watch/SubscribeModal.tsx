"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { formatBsd } from "@/utils/currency";

type Props = {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  monthlyAmount: number;
  onSubscribed?: () => void;
};

export default function SubscribeModal({
  open,
  onClose,
  creatorId,
  creatorName,
  monthlyAmount,
  onSubscribed,
}: Props) {
  const { accessToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subscribe = async () => {
    if (!accessToken) {
      setError("Log in to subscribe.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/subscriptions", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          creator_id: creatorId,
          monthly_amount: monthlyAmount,
        }),
      });
      onSubscribed?.();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.body) {
        try {
          const j = JSON.parse(e.body) as { detail?: { message?: string } | string };
          const d = j.detail;
          const msg =
            typeof d === "object" && d && "message" in d ? d.message : undefined;
          setError(msg || e.message);
        } catch {
          setError(e.message);
        }
      } else {
        setError(e instanceof Error ? e.message : "Subscription failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontStyle: "italic", fontWeight: 800 }}>
        Subscribe
      </DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          Unlock subscriber-only videos from {creatorName} for{" "}
          {formatBsd(monthlyAmount)}/mo. Billed via KemisPay.
        </Typography>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
          Powered by KemisPay
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => void subscribe()}
          disabled={loading}
        >
          Confirm subscription
        </Button>
      </DialogActions>
    </Dialog>
  );
}
