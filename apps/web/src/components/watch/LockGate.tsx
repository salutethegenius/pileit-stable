"use client";

import Box from "@mui/material/Box";
import { formatBsd } from "@/utils/currency";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

type Props = {
  creatorName: string;
  monthlyAmount: number;
  onSubscribe: () => void;
};

export default function LockGate({
  creatorName,
  monthlyAmount,
  onSubscribe,
}: Props) {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(20,20,20,0.92)",
        backdropFilter: "blur(12px)",
        zIndex: 4,
        p: 3,
        textAlign: "center",
      }}
    >
      <Typography variant="h6" fontWeight={800} fontStyle="italic" sx={{ mb: 1 }}>
        Subscribers only
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Subscribe to {creatorName} — {formatBsd(monthlyAmount)}/mo to watch.
      </Typography>
      <Button variant="contained" color="primary" onClick={onSubscribe}>
        Subscribe
      </Button>
    </Box>
  );
}
