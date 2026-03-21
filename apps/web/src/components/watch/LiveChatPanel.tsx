"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/AuthProvider";
import ReportContentDialog from "./ReportContentDialog";

export type ChatMessageDto = {
  id: string;
  user_display_name: string;
  body: string;
  created_at: string;
};

type Props = { videoId: string };

export default function LiveChatPanel({ videoId }: Props) {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState("");
  const [reportMsgId, setReportMsgId] = useState<string | null>(null);
  const watching = 24;
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    apiFetch<ChatMessageDto[]>(`/videos/${videoId}/chat`, {})
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [videoId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !accessToken) return;
    await apiFetch(`/videos/${videoId}/chat`, {
      method: "POST",
      accessToken,
      body: JSON.stringify({ body: text.trim() }),
    });
    setText("");
    load();
  };

  return (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        {watching} watching
      </Typography>
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          borderRadius: 1,
          bgcolor: "#1a1a1a",
          p: 1,
          mb: 1,
        }}
      >
        {messages.map((m) => (
          <Stack
            key={m.id}
            direction="row"
            alignItems="baseline"
            justifyContent="space-between"
            gap={1}
            sx={{ mb: 0.5 }}
          >
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
              <strong>{m.user_display_name}:</strong> {m.body}
            </Typography>
            <Button size="small" color="inherit" sx={{ flexShrink: 0, py: 0, minWidth: 0 }} onClick={() => setReportMsgId(m.id)}>
              Report
            </Button>
          </Stack>
        ))}
        <div ref={bottomRef} />
      </Box>
      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder={accessToken ? "Say something…" : "Log in to chat"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!accessToken}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <Button variant="contained" onClick={() => void send()} disabled={!accessToken}>
          Send
        </Button>
      </Stack>
      {reportMsgId && (
        <ReportContentDialog
          open
          onClose={() => setReportMsgId(null)}
          targetType="live_chat"
          targetId={reportMsgId}
          title="Report chat message"
          onSubmitted={load}
        />
      )}
    </Stack>
  );
}
