# xwing-monitoring-dashboard

AI-powered real-time monitoring dashboard for X-wing fleet status, performance metrics, anomaly detection, and predictive maintenance alerts.

**Source PRD / Epic:** https://bytecubed.atlassian.net/wiki/spaces/EA/pages/4655284225/PRD+AI-Powered+X-Wing+Monitoring+Dashboard+2026-06-26

> ⚙️ This is an auto-generated prototype. Its tickets live as GitHub issues, and
> [Claude Code](https://github.com/anthropics/claude-code-action) implements each
> one as a pull request when the issue is opened. See `CLAUDE.md` for conventions.

## Running

```bash
npm install      # installs root, backend, and frontend dependencies
npm run dev      # starts Express backend on :3001 and React frontend on :3000
```

Open http://localhost:3000 in your browser.

## Architecture

```
backend/          Express API + mock telemetry simulator (port 3001)
  server.js       REST endpoints: GET /api/fleet/aircraft
  simulator.js    30-aircraft fleet with mean-reverting random-walk metrics

frontend/         React + Vite app (port 3000)
  src/pages/Dashboard.jsx   Main dashboard: fleet summary, aircraft grid, detail panel
```

## Dashboard Features

- **Fleet Summary** — live counts of operational / degrading / critical aircraft with "last refresh" timer
- **Aircraft Grid** — 30 cards in a 6×5 grid; each card shows status indicator (green/yellow/red), sparklines for shield, fuel, and engine temp
- **Detail Panel** — click any card to see full 60-second metric history charts for all 10 telemetry channels plus a colour-coded status timeline
- Polls `/api/fleet/aircraft` every 1 second via `setInterval`
