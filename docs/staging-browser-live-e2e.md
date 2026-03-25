# Browser live — 12-step staging E2E (mobile carrier)

Run on **Aliv or BTC LTE/5G**, not WiFi-only. Use a **creator** account; HTTPS staging URL.

**Before Step 2:** Start a **fresh** session: dashboard → **Create live stream** (title + button) → confirm the **Mux live row** appears. Do not assume a row from an old test.

---

## Watch closely (silent / UX failures)

| Step | What to verify |
|------|----------------|
| **7** | **`video.live_stream.active`** — Check **Railway FastAPI logs** for `POST /mux/webhook`. If absent, Mux webhook URL may still point at **localhost**; must be `https://YOUR_RAILWAY_API/mux/webhook`. |
| **8** | **Watch page** — Second device opens `/watch/{video_id}` while streaming. Confirm **real playback**, not infinite loading. |
| **9** | **Pile panel** — Type and **submit** a comment while live. |

---

## Checklist

| Step | Criterion |
|------|-----------|
| 1 | Open **dashboard** on mobile browser (staging). |
| 2 | **Mux live row** exists from this run; **Go live from this phone** section visible. |
| 3 | **Camera preview** works (`getUserMedia`). |
| 4 | **Start camera & connect** — ingest token + gateway `start` called. |
| 5 | Gateway resolves RTMP server-side (`/internal/live-gateway/mux-rtmp`). |
| 6 | LiveKit room + egress active (LiveKit Cloud dashboard if needed). |
| 7 | Mux webhook **`video.live_stream.active`** → `mux_live_status` active. |
| 8 | Watch page **plays** on another device. |
| 9 | **Pile** — comments work while live. |
| 10 | **Stop & end stream** — gateway stop, egress/room torn down. |
| 11 | **`DELETE /live-streams/{video_id}`** completes. |
| 12 | Mux webhook **`video.live_stream.idle`** (or disconnected) → status updated. |

**Staging-ready:** All 12 pass on **carrier LTE**, with steps **7–9 explicitly verified**.
