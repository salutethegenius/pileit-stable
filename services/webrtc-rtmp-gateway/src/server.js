/**
 * PileIt browser live: WHIP-less LiveKit publisher + LiveKit RoomComposite egress → Mux RTMP.
 * Mux stream key exists only on this service and the Python API — never sent to the browser.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { jwtVerify } from "jose";
import {
  AccessToken,
  EgressClient,
  EncodingOptionsPreset,
  RoomServiceClient,
  StreamOutput,
  StreamProtocol,
} from "livekit-server-sdk";

const PORT = parseInt(process.env.PORT || "8787", 10);
const PILEIT_API_URL = (process.env.PILEIT_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const LIVE_GATEWAY_SHARED_SECRET = (process.env.LIVE_GATEWAY_SHARED_SECRET || "").trim();
const LIVE_BROWSER_INGEST_SECRET = (
  process.env.LIVE_BROWSER_INGEST_SECRET || process.env.PILEIT_JWT_SECRET_FALLBACK || ""
).trim();

const LIVEKIT_URL = (process.env.LIVEKIT_URL || "").replace(/\/$/, "");
const LIVEKIT_EGRESS_URL = (process.env.LIVEKIT_EGRESS_URL || LIVEKIT_URL).replace(/\/$/, "");
const LIVEKIT_API_KEY = (process.env.LIVEKIT_API_KEY || "").trim();
const LIVEKIT_API_SECRET = (process.env.LIVEKIT_API_SECRET || "").trim();
/** Public WebSocket URL for browsers, e.g. wss://livekit.example.com */
const LIVEKIT_PUBLIC_WS_URL = (process.env.LIVEKIT_PUBLIC_WS_URL || "").trim();

function parseIceServers() {
  const raw = process.env.ICE_SERVERS_JSON;
  if (raw) {
    try {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) {
        return v;
      }
    } catch {
      /* fall through */
    }
  }
  const turnUrl = (process.env.TURN_SERVER_URL || "").trim();
  const turnUser = (process.env.TURN_USERNAME || "").trim();
  const turnCred = (process.env.TURN_CREDENTIAL || "").trim();
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl.split(",").map((u) => u.trim()).filter(Boolean),
      username: turnUser,
      credential: turnCred,
    });
  }
  return servers;
}

function assertConfigured() {
  const missing = [];
  if (!LIVE_GATEWAY_SHARED_SECRET) {
    missing.push("LIVE_GATEWAY_SHARED_SECRET");
  }
  if (!LIVE_BROWSER_INGEST_SECRET) {
    missing.push("LIVE_BROWSER_INGEST_SECRET (or PILEIT_JWT_SECRET_FALLBACK for dev)");
  }
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    missing.push("LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET");
  }
  if (!LIVEKIT_PUBLIC_WS_URL) {
    missing.push("LIVEKIT_PUBLIC_WS_URL");
  }
  if (missing.length) {
    console.warn(
      "[pileit-live-gateway] Missing config (service may reject requests):",
      missing.join(", "),
    );
  }
}

async function verifyIngestToken(token) {
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(LIVE_BROWSER_INGEST_SECRET),
    { algorithms: ["HS256"] },
  );
  if (payload.type !== "live_browser_ingest") {
    throw new Error("invalid token type");
  }
  const videoId = payload.video_id;
  const userId = payload.sub;
  if (!videoId || !userId) {
    throw new Error("invalid token payload");
  }
  return { videoId: String(videoId), userId: String(userId) };
}

async function fetchMuxRtmpFromApi(videoId) {
  const r = await fetch(`${PILEIT_API_URL}/internal/live-gateway/mux-rtmp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LIVE_GATEWAY_SHARED_SECRET}`,
    },
    body: JSON.stringify({ video_id: videoId }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || `API ${r.status}`);
  }
  const data = await r.json();
  if (!data.rtmp_push_url) {
    throw new Error("API did not return rtmp_push_url");
  }
  return data.rtmp_push_url;
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "pileit-live-gateway" });
});

app.post("/v1/browser-live/start", async (req, res) => {
  try {
    const ingestToken = (req.body?.ingest_token || "").trim();
    if (!ingestToken) {
      return res.status(400).json({ detail: "ingest_token required" });
    }
    if (!LIVE_GATEWAY_SHARED_SECRET || !LIVE_BROWSER_INGEST_SECRET) {
      return res.status(503).json({ detail: "Gateway not configured" });
    }
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_PUBLIC_WS_URL) {
      return res.status(503).json({ detail: "LiveKit not configured" });
    }

    const { videoId, userId } = await verifyIngestToken(ingestToken);
    const rtmpPushUrl = await fetchMuxRtmpFromApi(videoId);

    const roomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
    const roomName = `pileit-${videoId}-${roomSuffix}`;

    const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 60 * 15,
      maxParticipants: 3,
    });

    let egressInfo;
    try {
      const egressClient = new EgressClient(
        LIVEKIT_EGRESS_URL,
        LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET,
      );

      const streamOutput = new StreamOutput({
        protocol: StreamProtocol.RTMP,
        urls: [rtmpPushUrl],
      });

      egressInfo = await egressClient.startRoomCompositeEgress(roomName, streamOutput, {
        encodingOptions: EncodingOptionsPreset.H264_720P_30,
      });
    } catch (err) {
      try {
        await roomService.deleteRoom(roomName);
      } catch (_) {
        /* best effort */
      }
      throw err;
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: `browser-${userId}-${roomSuffix}`,
      name: "PileIt creator",
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    const livekitToken = await at.toJwt();

    const iceServers = parseIceServers();

    return res.json({
      livekit_url: LIVEKIT_PUBLIC_WS_URL,
      livekit_token: livekitToken,
      room_name: roomName,
      egress_id: egressInfo.egressId,
      ice_servers: iceServers,
    });
  } catch (e) {
    console.error("[start]", e);
    return res.status(400).json({ detail: e.message || "start failed" });
  }
});

app.post("/v1/browser-live/stop", async (req, res) => {
  try {
    const ingestToken = (req.body?.ingest_token || "").trim();
    const egressId = (req.body?.egress_id || "").trim();
    const roomName = (req.body?.room_name || "").trim();

    if (!ingestToken || !egressId) {
      return res.status(400).json({ detail: "ingest_token and egress_id required" });
    }
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(503).json({ detail: "LiveKit not configured" });
    }

    await verifyIngestToken(ingestToken);

    const egressClient = new EgressClient(
      LIVEKIT_EGRESS_URL,
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
    );
    await egressClient.stopEgress(egressId);

    if (roomName) {
      try {
        const roomService = new RoomServiceClient(
          LIVEKIT_URL,
          LIVEKIT_API_KEY,
          LIVEKIT_API_SECRET,
        );
        await roomService.deleteRoom(roomName);
      } catch (err) {
        console.warn("[stop] deleteRoom:", err.message);
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("[stop]", e);
    return res.status(400).json({ detail: e.message || "stop failed" });
  }
});

assertConfigured();
app.listen(PORT, () => {
  console.log(`[pileit-live-gateway] listening on :${PORT}`);
});
