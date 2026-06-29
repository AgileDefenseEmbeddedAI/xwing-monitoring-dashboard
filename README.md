# xwing-monitoring-dashboard

AI-powered real-time monitoring dashboard for X-wing fleet status, performance metrics, anomaly detection, and predictive maintenance alerts.

**Source PRD / Epic:** https://bytecubed.atlassian.net/wiki/spaces/EA/pages/4655284225/PRD+AI-Powered+X-Wing+Monitoring+Dashboard+2026-06-26

> ⚙️ This is an auto-generated prototype. Its tickets live as GitHub issues, and
> [Claude Code](https://github.com/anthropics/claude-code-action) implements each
> one as a pull request when the issue is opened. See `CLAUDE.md` for conventions.

## Running

### Prerequisites

- Node.js 18+

### Setup

```bash
# Install all dependencies (root, backend, frontend)
npm install          # installs concurrently at root
npm run install      # installs backend and frontend deps
```

Or install each layer separately:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Start development servers

```bash
# From repo root — starts Express on :3001 and React on :3000
npm run dev
```

The React app proxies `/api/*` requests to the Express backend automatically.

### Environment variables

Copy `.env.sample` to `backend/.env` and adjust as needed:

```
PORT=3001                  # Express port
SIMULATOR_INTERVAL_MS=1000 # Telemetry tick rate in milliseconds
```

## Architecture

```
/
├── backend/                    Express API + telemetry simulator
│   ├── server.js
│   └── src/simulators/
│       └── telemetrySimulator.js   Generates mock data for 30 X-wings
└── frontend/                   React + Vite dashboard
    └── src/
        └── App.jsx
```

### Telemetry simulator

`backend/src/simulators/telemetrySimulator.js` generates data for **30 X-wings** (XW-001 – XW-030) with the following metrics per aircraft:

| Metric | Range | Notes |
|---|---|---|
| `shield_status` | 0–100 | % integrity |
| `fuel_level` | 0–100 | % remaining |
| `weapons_charge` | 0–100 | % charge |
| `hyperdrive_condition` | 0–100 | % health |
| `temperature` | 40–120 °C | engine temp |
| `jump_count` | 0+ | hyperspace jumps taken |

#### Built-in anomaly patterns

| Aircraft | Pattern |
|---|---|
| XW-007 | Gradually degrading shield (drops ~0.3–0.7 %/tick) |
| XW-013 | Periodic temperature spikes (+20–40 °C, then slow cool-down) |
