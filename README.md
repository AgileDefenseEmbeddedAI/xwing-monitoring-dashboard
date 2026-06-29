# xwing-monitoring-dashboard

AI-powered real-time monitoring dashboard for X-wing fleet status, performance metrics, anomaly detection, and predictive maintenance alerts.

**Source PRD / Epic:** https://bytecubed.atlassian.net/wiki/spaces/EA/pages/4655284225/PRD+AI-Powered+X-Wing+Monitoring+Dashboard+2026-06-26

> ⚙️ This is an auto-generated prototype. Its tickets live as GitHub issues, and
> [Claude Code](https://github.com/anthropics/claude-code-action) implements each
> one as a pull request when the issue is opened. See `CLAUDE.md` for conventions.

## Running

```bash
npm run install:all
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### What it does

- **Fleet Dashboard** (`/`) — live table of all 30 X-wing fighters, refreshed every 2 seconds, showing pilot, squadron, status badge, and current metric values. Click any row to drill into that aircraft.
- **Aircraft Detail** (`/aircraft/:id`) — 2×2 recharts line charts for shield, fuel, weapons, and hyperdrive; anomaly dots highlighted in red; maintenance prediction cards; unified alert timeline; and a "Download History" button that saves the raw JSON telemetry.

### Architecture

| Layer | Tech | Port |
|-------|------|------|
| Frontend | React 18 + Vite + recharts | 3000 |
| Backend | Node.js + Express | 3001 |
| Telemetry | In-process simulator (1 s tick, 30 aircraft) | — |
