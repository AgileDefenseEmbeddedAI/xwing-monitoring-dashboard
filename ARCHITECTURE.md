# System Architecture

## Overview

The X-Wing Monitoring Dashboard is a real-time fleet management system comprising four main components: a React frontend, an Express backend API, a Python ML microservice, and a SQLite database. A telemetry simulator embedded in the backend generates mock X-wing fleet data to drive the prototype.

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OPERATOR'S BROWSER                           │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │              React Frontend  (port 3000)                    │  │
│   │                                                             │  │
│   │  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐  │  │
│   │  │  Fleet Grid  │  │  Alert Panel    │  │ Detail View  │  │  │
│   │  │  (30+ cards) │  │  (anomalies +   │  │  (aircraft   │  │  │
│   │  │              │  │   maintenance)  │  │   history)   │  │  │
│   │  └──────────────┘  └─────────────────┘  └──────────────┘  │  │
│   └──────────────────────────┬──────────────────────────────────┘  │
│                              │  HTTP polling (1–2 s)               │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Express Backend API  (port 3001)                   │
│                                                                      │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────────┐  │
│  │  REST API   │   │  Telemetry       │   │  Background          │  │
│  │  Routes     │   │  Simulator       │   │  Scheduler           │  │
│  │             │   │  (30 X-wings,    │   │  - anomaly poll: 5s  │  │
│  │  /fleet     │   │   1-2 s updates) │   │  - maint poll: 30s   │  │
│  │  /aircraft  │   └──────────────────┘   │  - cache flush: 1s   │  │
│  │  /alerts    │                          └──────────────────────┘  │
│  └──────┬──────┘                                     │              │
│         │                                            │              │
│         ▼                                            ▼              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  SQLite Database                            │    │
│  │                                                             │    │
│  │  telemetry_snapshots  │  anomalies  │  maintenance_preds   │    │
│  │  alerts                                                     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                            │                        │
└────────────────────────────────────────────┼────────────────────────┘
                                             │ HTTP (internal)
                                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│               Python ML Microservice  (port 3002)                    │
│                                                                      │
│  ┌──────────────────────────┐   ┌──────────────────────────────┐    │
│  │   Anomaly Detection      │   │  Predictive Maintenance      │    │
│  │                          │   │                              │    │
│  │  POST /api/detect-       │   │  POST /api/predict-          │    │
│  │       anomalies          │   │       maintenance            │    │
│  │                          │   │                              │    │
│  │  scikit-learn            │   │  Linear regression on        │    │
│  │  rolling mean/std        │   │  metric decay rate →         │    │
│  │  >2σ = anomaly           │   │  hours_until_failure         │    │
│  └──────────────────────────┘   └──────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Descriptions

### React Frontend (port 3000)

A single-page React application that polls the backend API and displays real-time fleet status.

**Key pages and components:**

| File | Purpose |
|------|---------|
| `src/pages/Dashboard.jsx` | Main view: fleet summary counters, aircraft grid, alert panel |
| `src/pages/AircraftDetail.jsx` | Per-aircraft route (`/aircraft/:id`) with full metric history |
| `src/components/AlertPanel.jsx` | Sorted, filterable alert list with acknowledge controls |

**Update cadence:**

- Fleet summary and aircraft grid: poll every 1 second
- Alert panel: poll every 2 seconds
- Aircraft detail charts: poll every 2–3 seconds

### Express Backend API (port 3001)

Node.js/Express server that owns the telemetry simulator, persists data to SQLite, and orchestrates calls to the ML service.

**Key responsibilities:**

- Serve REST endpoints consumed by the frontend
- Run the telemetry simulator (generates data for 30 X-wings every 1–2 seconds)
- Persist the last 100 telemetry snapshots per aircraft in SQLite
- Call the ML anomaly service every 5 seconds and store results
- Call the ML maintenance service every 30 seconds and store predictions
- Expose an in-memory cache (1-second TTL) for the fleet summary to reduce DB reads
- Apply request rate-limiting (100 req/min per client)

### Python ML Microservice (port 3002)

A lightweight Flask application providing two inference endpoints.

**Anomaly detection (`POST /api/detect-anomalies`):**

- Maintains a rolling window of the last 50 telemetry samples per metric per aircraft
- Computes per-metric mean and standard deviation (scikit-learn `StandardScaler`)
- Flags a metric as anomalous when its value deviates more than 2σ from the rolling baseline
- Returns an anomaly score (0–1) and the list of affected metrics

**Predictive maintenance (`POST /api/predict-maintenance`):**

- Accepts the last 50 samples for a given aircraft/component pair
- Fits a simple linear regression to the metric time series
- Extrapolates the time until the metric crosses a failure threshold (e.g., shield < 20)
- Returns `hours_until_failure`, `confidence_score`, and a `recommended_maintenance_window`

### SQLite Database

A single file (`data/xwing.db`) with four tables:

| Table | Description |
|-------|-------------|
| `telemetry_snapshots` | Rolling 100-sample history per aircraft (pruned on insert) |
| `anomalies` | Detected anomalies with aircraft_id, metric, severity, timestamp |
| `maintenance_predictions` | Latest ML predictions with expiry timestamp |
| `alerts` | Unified alert log (anomaly + maintenance) with acknowledged flag |

Indexes on `(aircraft_id, timestamp)` keep queries fast at 30+ aircraft × 100 samples.

### Telemetry Simulator

Embedded in the backend process (`src/simulators/telemetrySimulator.js`). Generates mock data for 30 X-wings with the following metrics:

| Metric | Range | Units |
|--------|-------|-------|
| `shield_status` | 0–100 | % |
| `fuel_level` | 0–100 | % |
| `weapons_charge` | 0–100 | % |
| `hyperdrive_condition` | 0–100 | % |
| `temperature` | 40–120 | °C |
| `jump_count` | 0–∞ | integer |

The simulator introduces deliberate degradation patterns (gradual fuel drain, temperature creep, occasional spikes) to exercise anomaly detection.

## Data Flow

```
1. Simulator generates telemetry every 1–2 s
        │
        ▼
2. Backend writes snapshot to SQLite (telemetry_snapshots)
        │
        ├──► Every 5 s: batch latest telemetry → POST /api/detect-anomalies (ML)
        │         └──► Backend stores results in anomalies + alerts tables
        │
        └──► Every 30 s: per-aircraft metrics → POST /api/predict-maintenance (ML)
                  └──► Backend stores predictions in maintenance_predictions + alerts tables
        │
        ▼
3. Frontend polls GET /api/fleet/aircraft every 1 s
   Frontend polls GET /api/alerts every 2 s
        │
        ▼
4. React renders updated fleet grid, alert panel, and detail charts
```

## Aircraft Status Classification

The frontend derives visual status from the latest telemetry:

| Status | Color | Condition |
|--------|-------|-----------|
| Operational | Green | All metrics ≥ 70% |
| Degrading | Yellow | Any metric between 40–70% |
| Critical | Red | Any metric < 40% |

## Key Design Decisions

- **Embedded simulator**: keeps the prototype self-contained — no external data source needed
- **SQLite over Postgres**: zero-config persistence appropriate for a single-node prototype
- **Python ML sidecar**: separates ML dependencies (scikit-learn, numpy) from the Node.js runtime; communicates over HTTP
- **Rolling baselines**: anomaly thresholds adapt over time, reducing false positives as metrics gradually degrade
- **In-memory cache**: fleet summary cached for 1 second to handle multiple concurrent browser clients without hammering the DB
