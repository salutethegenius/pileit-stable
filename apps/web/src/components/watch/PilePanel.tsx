"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import PileCommentCard, { type PileCommentDto } from "./PileCommentCard";
import LiveChatPanel from "./LiveChatPanel";

type Mode = "text" | "voice" | "video";

type Props = {
  videoId: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export default function PilePanel({
  videoId,
  mobileOpen,
  onMobileClose,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
  const { accessToken } = useAuth();
  const [tab, setTab] = useState(0);
  const [comments, setComments] = useState<PileCommentDto[]>([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("text");

  const loadPile = useCallback(() => {
    apiFetch<PileCommentDto[]>(`/videos/${videoId}/pile`, {})
      .then(setComments)
      .catch(() => setComments([]));
  }, [videoId]);

  useEffect(() => {
    loadPile();
    const id = setInterval(loadPile, 8000);
    return () => clearInterval(id);
  }, [loadPile]);

  const sendText = async () => {
    if (!text.trim() || !accessToken) return;
    await apiFetch(`/pile/${videoId}`, {
      method: "POST",
      accessToken,
      body: JSON.stringify({
        comment_type: "text",
        content: text.trim(),
      }),
    });
    setText("");
    loadPile();
  };

  const inner = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        borderLeft: isMobile ? "none" : "1px solid #333",
        bgcolor: "#1a1a1a",
      }}
    >
      {isMobile && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1 }}>
          <Typography fontWeight={800} fontStyle="italic">
            The Pile & Chat
          </Typography>
          <IconButton onClick={onMobileClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Stack>
      )}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="The Pile" />
        <Tab label="Live Chat" />
      </Tabs>
      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, minHeight: 0 }}>
        {tab === 0 && (
          <Stack spacing={1}>
            {comments.map((c) => (
              <PileCommentCard key={c.id} c={c} onReported={loadPile} />
            ))}
            {comments.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                Be the first on the pile.
              </Typography>
            )}
          </Stack>
        )}
        {tab === 1 && <LiveChatPanel videoId={videoId} />}
      </Box>
      {tab === 0 && (
        <Box sx={{ p: 1.5, borderTop: "1px solid #333", flexShrink: 0 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode}
            onChange={(_, v) => v && setMode(v)}
            sx={{ mb: 1 }}
          >
            <ToggleButton value="text">Text</ToggleButton>
            <ToggleButton value="voice">Voice</ToggleButton>
            <ToggleButton value="video">Video</ToggleButton>
          </ToggleButtonGroup>
          {mode === "text" && (
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder={accessToken ? "Add to the pile…" : "Log in to comment"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={!accessToken}
              />
              <Button variant="contained" onClick={() => void sendText()} disabled={!accessToken}>
                Send
              </Button>
            </Stack>
          )}
          {mode === "voice" && (
            <Button
              fullWidth
              variant="outlined"
              sx={{ borderColor: "primary.main", color: "primary.main" }}
            >
              Hold to Record
            </Button>
          )}
          {mode === "video" && (
            <Button
              fullWidth
              variant="outlined"
              sx={{ borderColor: "info.main", color: "info.main" }}
            >
              Record Video Reply
            </Button>
          )}
        </Box>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer anchor="bottom" open={!!mobileOpen} onClose={() => onMobileClose?.()}>
        <Box sx={{ height: "min(70vh, 560px)" }}>{inner}</Box>
      </Drawer>
    );
  }

  return inner;
}
