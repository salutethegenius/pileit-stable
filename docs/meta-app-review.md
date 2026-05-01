# Meta App Review — Facebook Login + Page video import

This doc is the source of truth for the App Review submission required to make
the "Import from Facebook" feature available to all creators on PileIt.
Copy/paste these blocks into the Meta dashboard (Use Cases → Permissions and
Features) when filling out each request.

## Plain-language use case

PileIt is a creator video platform (Bahamian-first; Netflix-style browse,
creator channels, paid subs, tips, live streaming). Many of our creators
already publish video to a Facebook Page they manage — they ask us to "just
pull it in" so they don't have to re-upload manually.

Our integration only reads videos from Pages the creator personally manages,
and only after the creator has signed in with Facebook on their PileIt
dashboard. We never post on the creator's behalf, never scrape, and never
read content from anyone else's account or anyone else's Pages.

## Permissions requested and why

Each scope is requested only because the import flow cannot work without it.

### `pages_show_list`
**Why we need it:** After OAuth the creator picks which of *their* Pages to
import from. We call `GET /me/accounts` to populate that picker.
**Where it's used:** `backend/app/services/meta_graph.py::list_user_pages`
**Without it:** The picker is empty and the creator can't proceed.

### `pages_read_engagement`
**Why we need it:** Required by Graph API to call any read endpoint scoped to
a Page the user owns, including `/{page-id}/videos`.
**Where it's used:** `backend/app/services/meta_graph.py::list_page_videos`,
`get_page_video`
**Without it:** We can't list a Page's videos at all.

### `pages_read_user_content`
**Why we need it:** Returns the video's `source` URL (the actual MP4 URL Mux
ingests from). Without this, listing returns metadata only — we can't transfer
the file.
**Where it's used:** `backend/app/services/meta_graph.py::get_page_video`
**Without it:** Mux can't ingest, the import fails.

## Data handling

- **Tokens.** Long-lived user tokens and Page access tokens are encrypted at
  rest with `cryptography.fernet.Fernet` (symmetric authenticated encryption,
  AES-128-CBC + HMAC-SHA256) before being written to the
  `user_social_accounts` table. The Fernet key is supplied via the
  `META_TOKEN_ENCRYPTION_KEY` env var on Railway and never committed.
  See `backend/app/services/secrets.py`.
- **Token retrieval.** Plaintext tokens exist in process memory only for the
  duration of the Graph API or Mux call. We do not log them. We never expose
  them to the browser — `GET /social/meta/connection` redacts every Page's
  `access_token` field before returning.
- **Disconnection.** `DELETE /social/meta/connection` removes the row from
  `user_social_accounts` so the encrypted tokens are no longer at rest with
  PileIt.
- **Scope of access.** PileIt only reads from a Page when the creator who owns
  that Page is the authenticated user calling our API; we never read across
  creators.
- **Video files.** When the creator selects videos to import, we hand the
  short-lived `source` URL to Mux. Mux pulls server-to-server, transcodes,
  and serves playback. PileIt itself never stores the original Facebook video
  file on disk.

## Screencast / test instructions for review

The reviewer will need a creator-tier test account on staging. Send the
reviewer the staging URL plus this script:

1. Sign in as a creator at `https://<staging-web-host>/login`.
2. Navigate to **Dashboard → Upload to PileIt**.
3. Select the **Import from Facebook** tab.
4. Click **Connect Facebook**, authenticate with the test FB account that
   manages a test Page. Approve all three requested permissions.
5. Browser is redirected back to `/dashboard/upload?meta_connected=1`. The
   panel now shows the test Page and lists its videos.
6. Tick one or two videos, leave "Publish each video automatically when it
   finishes processing" on, click **Import N videos**.
7. Each row appears under "Imports" with a "Processing…" chip. Within ~1–2
   minutes Mux finishes transcoding; the chip flips to "Ready" with an
   **Open** button that plays the imported video on PileIt.
8. Click **Disconnect** to demonstrate token removal.

Provide a 30–60 second screencap of steps 3–7. Show the OAuth dialog text
verbatim so reviewers see the scopes the creator actually consents to.

## Test user account (to provide in submission)

Create a sandbox FB user with a Page and one or two short test videos, then
hand the credentials and Page name to the reviewer.

- Test user email: _to be filled in by ops_
- Test user password: _to be filled in by ops (don't paste in this doc)_
- Test Page name: _to be filled in by ops_

## Files / routes the reviewer might inspect

- `backend/app/routers/social_meta.py` — OAuth start, callback, listing,
  disconnect.
- `backend/app/routers/video_import.py` — the only endpoint that calls Graph
  API for video data, and the only one that hands a URL to Mux.
- `backend/app/services/meta_graph.py` — every Graph API call we make.
- `backend/app/services/secrets.py` — Fernet wrapper.
- `apps/web/src/components/dashboard/MetaImportPanel.tsx` — full creator UX.
