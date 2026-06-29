# Prototype guide for Claude Code

AI-powered real-time monitoring dashboard for X-wing fleet status, performance metrics, anomaly detection, and predictive maintenance alerts.

The source PRD / Epic: https://bytecubed.atlassian.net/wiki/spaces/EA/pages/4655284225/PRD+AI-Powered+X-Wing+Monitoring+Dashboard+2026-06-26

## How this repo works

Each ticket for this prototype is filed as a GitHub issue. When an issue is opened,
the workflow in `.github/workflows/claude.yml` runs you (Claude Code) to implement it
and open a pull request. Work one issue at a time and keep every change runnable.

A second workflow (`.github/workflows/integrate.yml`) then merges those pull requests
into the default branch in issue order, rebasing and resolving conflicts as it goes — so
build each issue so it composes cleanly with the lower-numbered issues that precede it.

## Tech stack & conventions

Stack: Node.js/Express backend, React frontend, SQLite for state persistence, scikit-learn/Python microservice for ML anomaly detection and predictive maintenance. Run locally with `npm install && npm run dev` (starts Express on :3001 + React on :3000). Use mock telemetry data simulator to generate realistic fleet telemetry. Keep ML logic simple (statistical baselines, trend detection) suitable for prototype. Assume 30-50 aircraft, 10-15 metrics per aircraft, 1-second refresh interval.

## Working agreement

- Build the simplest thing that satisfies the issue's acceptance criteria — this is a
  prototype, not production. Favor a working end-to-end slice over breadth.
- Keep the project runnable at every step. Document any new setup/run command in the
  README under a "Running" section.
- Open one pull request per issue and reference the issue with "Closes #<number>".
- Don't introduce secrets or external services that require credentials the repo
  doesn't have.
