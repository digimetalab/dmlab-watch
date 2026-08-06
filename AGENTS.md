# AGENTS.md — DML CCTV

Multi-screen 3×3 landscape CCTV viewer. Data scraped from Denpasar ATCS public CCTV
(https://atcs.denpasarkota.go.id/streaming). Stack: Vite + React (JSX, JavaScript, no TS) +
Express + better-sqlite3 + Leaflet (OpenStreetMap tiles, in the camera picker). All UI text is Indonesian.

## Commands

- `npm install` — better-sqlite3 ships a prebuilt binary (native `node-gyp rebuild` is blocked by policy; still works)
- `npm run scrape` — fetch all cameras from ATCS API into SQLite. **Required once before first `npm run dev`.** 109 cameras across 2 requests (`paginate=100` max).
- `npm run dev` — Express API on :3001 + Vite on :5173 (Vite proxies `/api` → :3001)
- `npm run build` + `npm start` — production: Express serves `dist/` + SPA fallback
- `npm run db:init` — create schema + seed `Default` layout (empty until scrape runs)

## Logging

All activity (backend + frontend) is appended to `data/app.log` (gitignored via `*.log`):
- Backend: every HTTP request (`[req]` with method/url/status/duration) + explicit events: `scrape`, `layout` create/update/delete, `server started`.
- Frontend: `app boot`, `layout` switch, `cell` assign, `theme`, `autoplay`, `fullscreen` — sent via `POST /api/log` (see `src/lib/logger.js`).
- Format: `[ISO timestamp] [LEVEL] [source] message {json}`.
- Log file path can be overridden with env `CCTV_LOG`.

## Data source (verified)

`GET https://atcs.denpasarkota.go.id/api/v3/pv/ldevice`
- Headers: `Content-Type: application/json`, `x-client-id`, `x-client-secret`. These are **public** creds hardcoded in the site's client JS — not secrets, do not treat as such. They are **not** hardcoded in the repo (kept out to stay clean for secret scanners): set them in `.env` (`ATCS_CLIENT_ID`, `ATCS_CLIENT_SECRET`, `ATCS_API_BASE`). `npm run ...` loads `.env` with `--env-file-if-exists=.env`; without them `scrape()` throws a clear error.
- Params: `page`, `paginate` (max 100; 109 cameras = 2 pages), `orderBy`, `sortedBy`, `idlok` (filter one location).
- Response: `{ success, message, data[], meta: { total, pages } }`. Each item: location fields (`id_lokasi`, `nama_lokasi`, `ket_lokasi`, `lat_lokasi`, `lon_lokasi`, `is_active`) + `tb_device_lokasi[0]` (device: `nama`, `nama_alias`, `deskripsi`, `name_proxy_cam`, `url_proxy_hls`, `poster`, `url_video`) + `tb_lokasi_kota` (city/province).

## Gotchas

- **`url_proxy_hls` has trailing whitespace — always `.trim()`.** Format: `https://atcs.denpasarkota.go.id/stream/{name_proxy_cam}/`
- The stream URL returns a self-contained HTML player page (`<video>` + hls.js). Playback MUST be `<iframe src={url}>` with `allow="autoplay; fullscreen"` — **never `<video src>`**.
- `url_video` contains an internal RTSP URI with embedded credentials — **never return it via the API** (scrape only).
- Poster base: `https://atcs.denpasarkota.go.id/poster/{poster}` (field is frequently empty → show placeholder).
- Online probe is **server-side** (`server/probe.js`): `Range: bytes=0-1000`, 8s timeout, retry without Range, 60s cache. A browser-side probe fails with CORS (different origin). Note: any HTTP 200 (even a bogus URL) reports "online" — this matches source-site behavior, probes cannot detect true stream liveness.
- SQLite DB is generated at `data/cctv.db` — gitignored, never committed. Rebuild via `npm run scrape`.
- Camera picker has Daftar (search) and Peta (Leaflet/OSM) tabs. Map markers are color-coded: green = live, red = offline, amber = used in the current 3×3 layout, white = the cell being edited. Marker status comes from the same server-side probe.
- Map tiles require internet (OpenStreetMap). Leaflet needs its CSS imported (`leaflet/dist/leaflet.css`); marker icons are `L.divIcon` (plain Leaflet, no react-leaflet) because the default icon assets break under Vite.
- Layouts: 9 cells (either `id_lokasi` or `null`), stored as JSON in the `layouts` table (server-side). Active layout id is remembered in `localStorage` (client-side).
- `server/db.js` exports `getDb()`, not `db` — a past `db` name collision; keep the getter name.
