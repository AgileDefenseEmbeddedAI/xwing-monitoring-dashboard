# xwing-monitoring-dashboard

AI-powered real-time monitoring dashboard for X-wing fleet status, performance metrics, anomaly detection, and predictive maintenance alerts.

**Source PRD / Epic:** https://bytecubed.atlassian.net/wiki/spaces/EA/pages/4655284225/PRD+AI-Powered+X-Wing+Monitoring+Dashboard+2026-06-26

> ⚙️ This is an auto-generated prototype. Its tickets live as GitHub issues, and
> [Claude Code](https://github.com/anthropics/claude-code-action) implements each
> one as a pull request when the issue is opened. See `CLAUDE.md` for conventions.

## Quick Start

**Requirements:** Node.js 18+, Python 3.9+, npm 9+

```bash
git clone https://github.com/<org>/xwing-monitoring-dashboard.git
cd xwing-monitoring-dashboard
npm install
pip3 install -r ml-service/requirements.txt
npm run dev
```

Open **http://localhost:3000**. The dashboard populates within 3–5 seconds as the telemetry simulator starts generating X-wing fleet data.

**Services started by `npm run dev`:**

| Service | Port | Description |
|---------|------|-------------|
| React frontend | 3000 | Dashboard UI |
| Express backend | 3001 | REST API + telemetry simulator |
| Python ML service | 3002 | Anomaly detection + maintenance predictions |

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagram, data flow, component overview |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Full setup guide, environment variables, troubleshooting |
| [API.md](API.md) | REST endpoint reference with curl examples |
| [TESTING.md](TESTING.md) | Manual test scenarios and smoke-test script |

## Expected Latencies

- API response: < 100 ms
- Dashboard refresh: 1–2 seconds end-to-end
- Anomaly detection cycle: every 5 seconds
- Maintenance prediction cycle: every 30 seconds
