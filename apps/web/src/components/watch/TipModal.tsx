"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import { formatBsd } from "@/utils/currency";

const PRESETS = [1, 5, 10, 20, 50, 100];

type Props = {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  videoId?: string;
};

export default function TipModal({
  open,
  onClose,
  creatorId,
  creatorName,
  videoId,
}: Props) {
  const { accessToken } = useAuth();
  const [amount, setAmount] = useState<number>(5);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effective =
    custom.trim() !== "" ? parseFloat(custom) || amount : amount;

  const send = async () => {
    if (!accessToken) {
      setError("Log in to send a tip.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/tips", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          creator_id: creatorId,
          video_id: videoId ?? null,
          amount: effective,
        }),
      });
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
        setError(e instanceof Error ? e.message : "Payment failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontStyle: "italic", fontWeight: 800 }}>
        TIP THE CREATOR
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2.5}>
          <Typography color="text.secondary" component="p" sx={{ m: 0 }}>
            Supporting {creatorName}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
            {PRESETS.map((p) => (
              <Button
                key={p}
                variant={amount === p && custom === "" ? "contained" : "outlined"}
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
                sx={{ minWidth: 72 }}
              >
                {formatBsd(p, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Button>
            ))}
          </Stack>
          <TextField
            fullWidth
            margin="none"
            label="Custom amount (BSD)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            type="number"
            inputProps={{ min: 1, step: "0.01" }}
          />
          {error ? (
            <Typography color="error" variant="body2" component="p" sx={{ m: 0 }}>
              {error}
            </Typography>
          ) : null}
          <Typography
            variant="caption"
            color="text.secondary"
            component="p"
            sx={{ m: 0, pt: 0.5 }}
          >
            Powered by KemisPay
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => void send()}
          disabled={loading || effective <= 0}
        >
          Send {formatBsd(effective)} via KemisPay
        </Button>
      </DialogActions>
    </Dialog>
  );
}
