"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { Room, RoomEvent, createLocalTracks, VideoPresets, type LocalTrack } from "livekit-client";
import { apiFetch, formatApiErrorMessage } from "@/lib/api";

type StartGatewayRes = {
  livekit_url: string;
  livekit_token: string;
  room_name: string;
  egress_id: string;
  ice_servers: RTCIceServer[];
};

function liveGatewayBase(): string | null {
  const base = (process.env.NEXT_PUBLIC_PILEIT_LIVE_GATEWAY_URL || "").trim().replace(/\/$/, "");
  return base || null;
}

type Props = {
  accessToken: string;
  videoId: string;
  /** When true, hide primary actions (parent is busy with OBS actions). */
  parentBusy?: boolean;
  onEndStream?: () => void;
};

export default function DashboardBrowserLiveMuxSection({
  accessToken,
  videoId,
  parentBusy = false,
  onEndStream,
}: Props) {
  const gatewayUrl = liveGatewayBase();
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const tracksRef = useRef<LocalTrack[]>([]);
  const sessionRef = useRef<{
    ingestToken: string;
    egressId: string;
    roomName: string;
  } | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "starting" | "live" | "stopping">("idle");

  const cleanupPreview = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.srcObject = null;
    }
    for (const t of tracksRef.current) {
      t.stop();
    }
    tracksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanupPreview();
      void roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [cleanupPreview]);

  const stopBrowserLive = useCallback(async () => {
    const gw = liveGatewayBase();
    const sess = sessionRef.current;
    const room = roomRef.current;
    setPhase("stopping");
    setErr(null);
    try {
      if (room) {
        room.disconnect();
        roomRef.current = null;
      }
      cleanupPreview();
      if (gw && sess?.ingestToken && sess.egressId) {
        await fetch(`${gw}/v1/browser-live/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingest_token: sess.ingestToken,
            egress_id: sess.egressId,
            room_name: sess.roomName,
          }),
        }).catch(() => {});
      }
      sessionRef.current = null;
      await apiFetch(`/live-streams/${encodeURIComponent(videoId)}`, {
        method: "DELETE",
        accessToken,
      });
      onEndStream?.();
    } catch (e) {
      setErr(formatApiErrorMessage(e));
    } finally {
      setPhase("idle");
    }
  }, [accessToken, cleanupPreview, onEndStream, videoId]);

  const startBrowserLive = async () => {
    const gw = liveGatewayBase();
    if (!gw) {
      setErr("Live gateway URL is not configured (NEXT_PUBLIC_PILEIT_LIVE_GATEWAY_URL).");
      return;
    }
    setErr(null);
    setPhase("starting");
    try {
      const { ingest_token } = await apiFetch<{ ingest_token: string }>(
        `/live-streams/${encodeURIComponent(videoId)}/browser-ingest-token`,
        { method: "POST", accessToken },
      );

      const startRes = await fetch(`${gw}/v1/browser-live/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingest_token }),
      });
      if (!startRes.ok) {
        const j = await startRes.json().catch(() => ({}));
        throw new Error((j as { detail?: string }).detail || `Gateway ${startRes.status}`);
      }
      const body = (await startRes.json()) as StartGatewayRes;
      sessionRef.current = {
        ingestToken: ingest_token,
        egressId: body.egress_id,
        roomName: body.room_name,
      };

      const tracks = await createLocalTracks({
        audio: true,
        video: {
          facingMode: "user",
          resolution: VideoPresets.h720.resolution,
        },
      });
      tracksRef.current = tracks;

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null;
      });

      const vid = tracks.find((t) => t.kind === "video");
      const el = videoRef.current;
      if (vid && el) {
        vid.attach(el);
        await el.play().catch(() => {});
      }

      await room.connect(body.livekit_url, body.livekit_token, {
        rtcConfig: { iceServers: body.ice_servers || [{ urls: "stun:stun.l.google.com:19302" }] },
      });

      for (const t of tracks) {
        await room.localParticipant.publishTrack(t);
      }

      setPhase("live");
    } catch (e) {
      cleanupPreview();
      void roomRef.current?.disconnect();
      roomRef.current = null;
      sessionRef.current = null;
      setErr(formatApiErrorMessage(e));
      setPhase("idle");
    }
  };

  if (!gatewayUrl) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Browser go-live is available when <code>NEXT_PUBLIC_PILEIT_LIVE_GATEWAY_URL</code> is set and
        LiveKit egress is running.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        Go live from this phone (browser)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Uses your camera and mic in the browser. Video is sent through LiveKit and then to Mux — your
        stream key never appears here. For studio setups, keep using OBS above.
      </Typography>
      {err ? (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {err}
        </Typography>
      ) : null}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 8,
          background: "#000",
          aspectRatio: "9/16",
          objectFit: "cover",
        }}
      />
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
        {phase === "idle" || phase === "stopping" ? (
          <Button
            size="small"
            variant="contained"
            color="secondary"
            disabled={parentBusy || phase === "stopping"}
            onClick={() => void startBrowserLive()}
            sx={{ textTransform: "none" }}
          >
            Start camera &amp; connect
          </Button>
        ) : null}
        {phase === "live" ? (
          <Button
            size="small"
            color="error"
            variant="outlined"
            onClick={() => void stopBrowserLive()}
            sx={{ textTransform: "none" }}
          >
            Stop &amp; end stream
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
