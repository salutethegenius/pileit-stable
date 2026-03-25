# PileIt WebRTC → LiveKit Egress → Mux

Standalone Node service. The browser publishes to **LiveKit**; **Room composite egress** pushes **RTMP** to Mux using a URL returned only from the PileIt API (`/internal/live-gateway/mux-rtmp`). **Mux stream keys never go to the browser.**

## Prerequisites

1. **LiveKit server** and **Egress** running (self-hosted or LiveKit Cloud). See [LiveKit: Egress](https://docs.livekit.io/home/egress/overview/).
2. **FFmpeg** on the egress host for **self-hosted** LiveKit egress only. **LiveKit Cloud** manages egress (including FFmpeg).
3. Backend env: `LIVE_GATEWAY_SHARED_SECRET`, `LIVE_BROWSER_INGEST_SECRET`, Mux tokens.

## Run locally

```bash
cp .env.example .env
# fill LiveKit + secrets + PILEIT_API_URL
npm install
npm run start
```

## Docker

**Railway / production:** Use the **`Dockerfile`** in this folder. Set the service **root directory** to `services/webrtc-rtmp-gateway`. Railway sets **`PORT`**; the server reads it automatically.

**Self-hosted LiveKit:** Use the official LiveKit + egress Compose layouts from LiveKit docs; point `LIVEKIT_URL` at the server HTTP API and `LIVEKIT_EGRESS_URL` at the egress HTTP API (often port **8080**). Set `LIVEKIT_PUBLIC_WS_URL` to the **wss://** URL browsers use.

## Environment

See `.env.example`. **TURN**: set `TURN_SERVER_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` (e.g. Metered.ca), or provide `ICE_SERVERS_JSON`.

## Staging / production checklist

See **[`docs/staging-readiness.md`](../../docs/staging-readiness.md)** (env tables) and **[`docs/staging-browser-live-e2e.md`](../../docs/staging-browser-live-e2e.md)** (12-step mobile test on **Aliv/BTC LTE**, not WiFi-only).

- **LiveKit Cloud:** ICE/TURN largely handled by LiveKit; optional extra `TURN_*` in `.env`.
- Backend: `LIVE_GATEWAY_SHARED_SECRET`, `LIVE_BROWSER_INGEST_SECRET`, Mux tokens; webhook `https://API/mux/webhook`.
- Vercel: `NEXT_PUBLIC_PILEIT_LIVE_GATEWAY_URL` → this service’s public URL.

## End-to-end (happy path)

1. Dashboard: create Mux live (OBS block) — unchanged.
2. **Start camera & connect** publishes to LiveKit; egress pushes RTMP to Mux.
3. **Stop & end stream** stops egress, deletes the LiveKit room, then calls `DELETE /live-streams/{video_id}` on the API.

Test on **mobile Safari** and **Chrome** with HTTPS (getUserMedia constraints).
