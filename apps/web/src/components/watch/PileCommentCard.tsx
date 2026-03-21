"use client";

import { useState } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import { formatDuration } from "@/utils/format";
import ReportContentDialog from "./ReportContentDialog";

export type PileCommentDto = {
  id: string;
  user_display_name: string;
  comment_type: "text" | "voice" | "video";
  content: string | null;
  media_url: string | null;
  duration_seconds: number | null;
  like_count: number;
  created_at: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const colors = ["#f97316", "#3b82f6", "#a855f7", "#22c55e", "#ec4899"];

export default function PileCommentCard({
  c,
  onReported,
}: {
  c: PileCommentDto;
  onReported?: () => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const hue = colors[c.user_display_name.length % colors.length];
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        bgcolor: "#2a2a2a",
        border: "1px solid #333",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Avatar
          sx={{ bgcolor: hue, width: 36, height: 36, fontSize: 14 }}
          alt={`${c.user_display_name} avatar`}
        >
          {initials(c.user_display_name)}
        </Avatar>
        <Box flex={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography fontWeight={700}>{c.user_display_name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(c.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          </Stack>
          {c.comment_type === "text" && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {c.content}
            </Typography>
          )}
          {c.comment_type === "voice" && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Voice note · {c.duration_seconds != null ? formatDuration(c.duration_seconds) : "—"}
            </Typography>
          )}
          {c.comment_type === "video" && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Video reply · {c.duration_seconds != null ? formatDuration(c.duration_seconds) : "—"}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
            <Button size="small" color="inherit">
              Like ({c.like_count})
            </Button>
            <Button size="small" color="inherit">
              Reply
            </Button>
            <Button size="small" color="inherit" onClick={() => setReportOpen(true)}>
              Report
            </Button>
          </Stack>
        </Box>
      </Stack>
      <ReportContentDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="pile_comment"
        targetId={c.id}
        title="Report pile comment"
        onSubmitted={onReported}
      />
    </Paper>
  );
}
