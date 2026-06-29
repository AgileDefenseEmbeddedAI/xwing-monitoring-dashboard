# Deployment Guide

## Prerequisites

| Requirement | Minimum Version | Check |
|-------------|-----------------|-------|
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| Python | 3.9 | `python3 --version` |
| pip | 22.x | `pip3 --version` |

The system runs on Linux, macOS, and Windows (WSL2). All dependencies are installed locally — no Docker or cloud services required.

## Quick Start (5 commands)

```bash
git clone https://github.com/<org>/xwing-monitoring-dashboard.git
cd xwing-monitoring-dashboard
npm install
pip3 install -r ml-service/requirements.txt
npm run dev
```

Open `http://localhost:3000` in your browser. The dashboard begins populating within 3–5 seconds as the simulator generates telemetry.

## Detailed Setup

### 1. Clone the repository

```bash
git clone https://github.com/<org>/xwing-monitoring-dashboard.git
cd xwing-monitoring-dashboard
```

### 2. Install Node.js dependencies

```bash
npm install
```

This installs dependencies for both the root project and the `backend/` and `frontend/` workspaces.

### 3. Install Python dependencies

```bash
pip3 install -r ml-service/requirements.txt
```

Key Python packages:
- `flask` — web framework for the ML microservice
- `scikit-learn` — anomaly detection and regression
- `numpy` — numerical operations
- `flask-cors` — cross-origin requests from the backend

### 4. Configure environment variables

Copy the template and edit as needed:

```bash
cp .env.example .env
```

Default values work for local development — edit only if you need to change ports or paths:

```env
# Backend
PORT=3001
NODE_ENV=development

# SQLite database location (relative to backend/)
DB_PATH=../data/xwing.db

# Python ML service URL (called by the backend)
ML_SERVICE_URL=http://localhost:3002

# Simulator settings
SIMULATOR_AIRCRAFT_COUNT=30
SIMULATOR_UPDATE_INTERVAL_MS=1500

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. Initialize the database

The database schema is created automatically on first run via the migration script. You can also run it manually:

```bash
npm run db:migrate
```

This creates `data/xwing.db` with the four required tables and indexes.

### 6. Start the system

```bash
npm run dev
```

`npm run dev` starts three processes concurrently:
- React dev server on `http://localhost:3000`
- Express API server on `http://localhost:3001`
- Python Flask ML service on `http://localhost:3002`

### 7. Verify all services are running

```bash
# Backend API
curl http://localhost:3001/api/fleet/summary

# ML service
curl http://localhost:3002/health

# Frontend (should return HTML)
curl -s http://localhost:3000 | head -5
```

Expected output from the fleet summary:

```json
{
  "total_aircraft": 30,
  "operational_count": 28,
  "damaged_count": 1,
  "maintenance_required_count": 1,
  "last_update_timestamp": "2026-06-29T14:32:01.000Z"
}
```

## Running in Production Mode

For a production-like deployment (built frontend served by Express):

```bash
npm run build        # Build React app into frontend/dist/
npm start            # Start Express (serves built assets) + Flask
```

The Express server serves the built frontend at `/` and the API at `/api/*`.

## Starting Services Individually

If you need to start each service separately (e.g., for debugging):

**Backend only:**
```bash
cd backend && node src/index.js
```

**Frontend only:**
```bash
cd frontend && npm start
```

**ML service only:**
```bash
cd ml-service && python3 app.py
```

## Environment Variable Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `NODE_ENV` | `development` | Environment mode |
| `DB_PATH` | `../data/xwing.db` | SQLite file path (relative to `backend/`) |
| `ML_SERVICE_URL` | `http://localhost:3002` | Base URL for the Python ML service |
| `SIMULATOR_AIRCRAFT_COUNT` | `30` | Number of X-wings to simulate |
| `SIMULATOR_UPDATE_INTERVAL_MS` | `1500` | Milliseconds between telemetry updates |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate-limit window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per client per window |

## Database Initialization Details

The migration script creates these tables:

```sql
CREATE TABLE IF NOT EXISTS telemetry_snapshots (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  aircraft_id  TEXT    NOT NULL,
  timestamp    TEXT    NOT NULL,
  metrics_json TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telemetry_aircraft_time
  ON telemetry_snapshots (aircraft_id, timestamp);

CREATE TABLE IF NOT EXISTS anomalies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  aircraft_id TEXT    NOT NULL,
  metric      TEXT    NOT NULL,
  severity    TEXT    NOT NULL,  -- low | medium | high
  score       REAL    NOT NULL,
  timestamp   TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_predictions (
  id                         INTEGER PRIMARY KEY AUTOINCREMENT,
  aircraft_id                TEXT    NOT NULL,
  component                  TEXT    NOT NULL,
  hours_until_failure        REAL,
  confidence_score           REAL,
  recommended_window         TEXT,
  alert_level                TEXT    NOT NULL,  -- normal | soon | urgent | critical
  timestamp                  TEXT    NOT NULL,
  expires_at                 TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  aircraft_id TEXT    NOT NULL,
  alert_type  TEXT    NOT NULL,  -- anomaly | maintenance
  metric      TEXT,
  component   TEXT,
  severity    TEXT    NOT NULL,
  description TEXT    NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  timestamp   TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_aircraft
  ON alerts (aircraft_id, timestamp);
```

## Resetting the Database

To clear all data and start fresh:

```bash
rm data/xwing.db
npm run db:migrate
```

## Troubleshooting

### Dashboard shows no aircraft

**Cause:** Backend API is not reachable from the browser.

**Fix:** Confirm the Express server started without errors:
```bash
curl http://localhost:3001/api/fleet/aircraft
```
If this fails, check the terminal running `npm run dev` for Node.js errors.

### "Alerts not appearing" or anomaly panel is empty

**Cause:** ML service (Flask) is not running, so the backend cannot call `POST /api/detect-anomalies`.

**Fix:**
```bash
curl http://localhost:3002/health
```
If this fails, start the ML service manually:
```bash
cd ml-service && python3 app.py
```
Common reasons the ML service fails to start:
- Missing Python packages → re-run `pip3 install -r ml-service/requirements.txt`
- Port 3002 already in use → `lsof -i :3002`, then kill the occupying process

### Database locked error

**Cause:** SQLite does not support highly concurrent writers; multiple backend instances are running.

**Fix:** Kill any stale backend processes and restart:
```bash
pkill -f "node src/index.js"
npm run dev
```

### Python version mismatch

**Cause:** scikit-learn requires Python ≥ 3.9.

**Fix:**
```bash
python3 --version    # must be 3.9+
pip3 install --upgrade pip
pip3 install -r ml-service/requirements.txt
```

### Port already in use

```bash
# Find what is using port 3001 or 3000
lsof -i :3001
lsof -i :3000
lsof -i :3002

# Kill by PID
kill -9 <PID>
```

### React app shows stale data / "last refresh X seconds ago" keeps growing

**Cause:** The browser cannot reach `localhost:3001` (likely a CORS or network issue).

**Fix:** Open the browser's DevTools → Network tab and look for failed requests to `/api/fleet/aircraft`. Ensure `NODE_ENV=development` is set (enables CORS for `localhost:3000`).

## Expected Latencies

| Operation | Target |
|-----------|--------|
| API endpoint response | < 100 ms |
| UI fleet grid refresh (end-to-end) | 1–2 s |
| Anomaly detection cycle | every 5 s |
| Maintenance prediction cycle | every 30 s |
