# DSS RTSP Media Backend

This project provides a FastAPI backend that relays camera RTSP streams and can publish to `mediamtx`, `go2rtc`, or a custom RTSP endpoint.

## Runtime modes

### Mode A: Docker backend + optional media services
- Backend runs in Docker.
- Optional `mediamtx` and optional `go2rtc` can be enabled with Docker Compose profiles.

### Mode B: Desktop app (connect mode)
- Electron app connects to an already running backend (for example Docker mode).

### Mode C: Desktop app (standalone mode)
- Electron app can start a local backend process.
- Optional local `mediamtx` / `go2rtc` executables can also be started by the app.

## Quick start (Docker)

1. Copy env template:
```bash
cp .env.example .env
```

2. Backend only:
```bash
docker compose up --build backend
```

3. Backend + mediamtx:
```bash
docker compose --profile mediamtx up --build
```

4. Backend + go2rtc:
```bash
docker compose --profile go2rtc up --build
```

5. Backend + both:
```bash
docker compose --profile mediamtx --profile go2rtc up --build
```

Backend health endpoint:
```text
GET /health
```

## Environment variables

- `PORT`: backend listen port.
- `APP_HOST`: backend bind host.
- `APP_ROOT_PATH`: FastAPI root path (default `/dss`).
- `DB_PATH`: sqlite file path.
- `MEDIA_PROVIDER`: `mediamtx` | `go2rtc` | `custom`.
- `MEDIA_HOST`, `MEDIA_PORT`: target RTSP publish endpoint.
- `MEDIA_PATH_TEMPLATE_MEDIAMTX`: RTSP path template for mediamtx.
- `MEDIA_PATH_TEMPLATE_GO2RTC`: RTSP path template for go2rtc.
- `MEDIA_PATH_TEMPLATE_CUSTOM`: RTSP path template when `MEDIA_PROVIDER=custom`.
- `IP_MEDIA_MTX`, `PORT_MEDIA_MTX`: legacy fallback for media host/port compatibility.
- `DAHUA_USERNAME`, `DAHUA_PASSWORD`, `DAHUA_URL_BASE`: Dahua connection settings.
- `DAHUA_IP_REPLACE`, `DAHUA_PORT_REPLACE`: override outgoing RTSP source host/port.

Path template variables:
- `{id_camera_vms}`
- `{stream_index}` (`0` for main stream, `1` for sub stream)

## Desktop app

Electron app is in `/desktop`.

### Run in development
```bash
cd desktop
npm install
npm run start
```

### Build desktop packages
```bash
cd desktop
npm run dist
```

Targets configured:
- Linux: AppImage
- macOS: DMG
- Windows: NSIS

### Desktop workflow

1. Configure backend host/port for connect mode.
2. For standalone mode, configure:
   - Python command
   - backend entry (`main.py`)
   - backend working directory
3. Optionally enable local mediamtx/go2rtc and provide executable paths + args.
4. Use **Check Status** to verify:
   - Backend (`/health`)
   - mediamtx (RTSP TCP)
   - go2rtc (`/api`)

## Volumes and ports

- Backend API: `${PORT}` (default `8008`)
- mediamtx RTSP: `8554`
- go2rtc API: `1984`
- go2rtc RTSP: host `8555` -> container `8554`
- Database volume in Docker: `./data -> /data` (via `DB_PATH=/data/smart-signal.db`)

## Troubleshooting

- If backend is healthy but streams are offline:
  - validate Dahua credentials and base URL
  - verify reachable RTSP publish target (`MEDIA_HOST`/`MEDIA_PORT`)
  - check container logs:
    ```bash
    docker compose logs -f backend
    ```
- If using desktop standalone mode:
  - verify Python is installed and command path is valid
  - verify backend entry/cwd paths
  - if local mediamtx/go2rtc are enabled, verify executable paths and args
