# Testing Guide

This document describes how to manually verify the X-Wing Monitoring Dashboard end-to-end, covering anomaly detection, maintenance alerts, the dashboard UI, and the API layer.

## Prerequisites

All three services must be running before executing any test:

```bash
npm run dev
```

Verify with:
```bash
curl -s http://localhost:3001/api/fleet/summary | python3 -m json.tool
curl -s http://localhost:3002/health
```

---

## Test Scenarios

### Scenario 1 — Fleet data is live and updating

**Goal:** Confirm the simulator is running and the API serves fresh telemetry.

**Steps:**

1. Call the fleet summary endpoint twice, 3 seconds apart, and compare `last_update_timestamp`:

```bash
curl -s http://localhost:3001/api/fleet/summary | python3 -m json.tool
sleep 3
curl -s http://localhost:3001/api/fleet/summary | python3 -m json.tool
```

2. Call the aircraft list endpoint and count results:

```bash
curl -s http://localhost:3001/api/fleet/aircraft | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} aircraft returned')"
```

**Expected:**
- `last_update_timestamp` advances between the two calls
- At least 30 aircraft are returned
- `total_aircraft` in summary equals the count from the aircraft list

---

### Scenario 2 — Individual aircraft history

**Goal:** Verify that per-aircraft metric history is being persisted and served.

**Steps:**

1. Fetch detail for aircraft `XW-01`:

```bash
curl -s http://localhost:3001/api/aircraft/XW-01 | python3 -m json.tool
```

2. Check history depth:

```bash
curl -s http://localhost:3001/api/aircraft/XW-01 | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d[\"history\"])} history samples')"
```

3. Verify 404 for an invalid ID:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/aircraft/XW-99
# Expected: 404
```

**Expected:**
- `XW-01` returns a valid JSON object with `history` array
- After the system has been running ~3 minutes, history depth approaches 100 samples
- `XW-99` returns HTTP 404

---

### Scenario 3 — Anomaly detection fires on degrading aircraft

**Goal:** Confirm the ML anomaly service detects out-of-range metrics.

**Steps:**

1. Submit a clearly anomalous temperature reading directly to the ML service:

```bash
curl -X POST http://localhost:3002/api/detect-anomalies \
  -H "Content-Type: application/json" \
  -d '{
    "aircraft": [
      {
        "aircraft_id": "XW-TEST",
        "samples": [
          {
            "timestamp": "2026-06-29T14:00:00.000Z",
            "shield_status": 80,
            "fuel_level": 75,
            "weapons_charge": 85,
            "hyperdrive_condition": 90,
            "temperature": 115,
            "jump_count": 10
          }
        ]
      }
    ]
  }' | python3 -m json.tool
```

2. Wait 10 seconds for the backend's 5-second anomaly cycle to run, then check alerts:

```bash
sleep 10
curl -s "http://localhost:3001/api/alerts?acknowledged=false" | python3 -m json.tool
```

**Expected:**
- ML service response contains `anomalies` array with at least one entry for `XW-TEST` or a simulator aircraft showing `temperature` in `affected_metrics`
- `score` is between 0 and 1 (values > 0.66 indicate `high` severity)
- Alert panel in the browser shows a new high-severity alert within 5–10 seconds

---

### Scenario 4 — Predictive maintenance alert lifecycle

**Goal:** Verify maintenance predictions are generated, stored, and can be acknowledged.

**Steps:**

1. Call the maintenance prediction endpoint directly with a rapidly decaying shield:

```bash
curl -X POST http://localhost:3002/api/predict-maintenance \
  -H "Content-Type: application/json" \
  -d '{
    "aircraft_id": "XW-12",
    "component": "shield",
    "samples": [
      { "timestamp": "2026-06-29T10:00:00.000Z", "shield_status": 80 },
      { "timestamp": "2026-06-29T11:00:00.000Z", "shield_status": 65 },
      { "timestamp": "2026-06-29T12:00:00.000Z", "shield_status": 50 },
      { "timestamp": "2026-06-29T13:00:00.000Z", "shield_status": 35 },
      { "timestamp": "2026-06-29T14:00:00.000Z", "shield_status": 22 }
    ]
  }' | python3 -m json.tool
```

2. Fetch alerts and note the ID of an unacknowledged maintenance alert:

```bash
curl -s "http://localhost:3001/api/alerts?acknowledged=false&aircraft_id=XW-12" | python3 -m json.tool
```

3. Acknowledge the alert (replace `<ID>` with the actual numeric ID):

```bash
curl -X POST http://localhost:3001/api/alerts/<ID>/acknowledge
```

4. Confirm it no longer appears in the unacknowledged list:

```bash
curl -s "http://localhost:3001/api/alerts?acknowledged=false&aircraft_id=XW-12" | python3 -m json.tool
```

**Expected:**
- Maintenance endpoint returns `hours_until_failure` ≤ 4 and `alert_level` of `critical`
- After acknowledging, the alert's `acknowledged` field is `true`
- The alert does not appear in the `acknowledged=false` filter

---

### Scenario 5 — Dashboard UI renders fleet status correctly

**Goal:** Verify the React dashboard displays all aircraft with correct color-coding.

**Steps:**

1. Open `http://localhost:3000` in a browser.
2. Verify the **Fleet Summary** section at the top shows three counters (operational / damaged / maintenance).
3. Count the aircraft cards in the grid — there should be at least 30.
4. Locate a card displayed in red or yellow (if all cards are green, wait 30 seconds for the simulator to degrade some aircraft).
5. Click a yellow or red aircraft card.
6. Verify the **Detail Panel** opens on the right with metric sparklines.

**Expected:**
- "Last refresh" timestamp updates every 1–2 seconds
- Green cards: all metrics shown are ≥ 70%
- Yellow cards: at least one metric is between 40–70%
- Red cards: at least one metric is < 40%
- Clicking a card populates the detail panel without a page reload

---

### Scenario 6 — Alerts panel sorting and filtering

**Goal:** Verify alerts appear in priority order and the acknowledge button works.

**Steps:**

1. Open `http://localhost:3000` and locate the **Alert Panel** (right side).
2. If no alerts are visible, wait up to 15 seconds for the anomaly cycle to run.
3. Verify critical/high-severity alerts are listed before low-severity ones.
4. Click **Acknowledge** on any alert.
5. Verify the alert moves to the "Acknowledged" tab or disappears from the main list.
6. Check that the unacknowledged badge count decreases by one.

**Expected:**
- Alerts are sorted: `critical` → `high` → `medium` → `low`, then by timestamp (newest first)
- Acknowledging an alert updates the UI immediately without a page reload
- Badge count reflects unacknowledged items only

---

### Scenario 7 — Aircraft detail page with anomaly markers

**Goal:** Verify the per-aircraft route shows metric history charts with anomaly markers.

**Steps:**

1. Navigate directly to `http://localhost:3000/aircraft/XW-07` (or click through from the dashboard).
2. Verify four metric charts load: shield, fuel, weapons, hyperdrive.
3. If anomalies have been detected for `XW-07`, confirm red marker dots appear on the relevant chart at the correct timestamps.
4. Verify the **Alert Timeline** section at the bottom lists anomalies for `XW-07`.
5. Check the **Maintenance Recommendations** section for `hours_until_failure` values.
6. Click the **Export JSON** button and verify a `.json` file downloads containing the metric history.

**Expected:**
- Charts display up to 100 data points
- Anomaly markers appear only where the ML service flagged issues
- Maintenance recommendations section shows at least one component
- JSON export contains a `history` array matching what `GET /api/aircraft/XW-07` returns

---

### Scenario 8 — Data persistence across server restarts

**Goal:** Verify telemetry history survives a backend restart.

**Steps:**

1. Let the system run for at least 3 minutes (to accumulate ~100 samples per aircraft).
2. Record the history depth:

```bash
curl -s http://localhost:3001/api/aircraft/XW-01 | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['history']))"
```

3. Stop and restart the backend (Ctrl-C the `npm run dev` process, then rerun it).
4. After restart, check history depth again:

```bash
curl -s http://localhost:3001/api/aircraft/XW-01 | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['history']))"
```

**Expected:**
- History depth after restart is the same as before (or higher, if the simulator already added more samples)
- `data/xwing.db` file persists on disk between runs

---

## API Smoke Test Script

Run all curl checks in sequence:

```bash
#!/bin/bash
set -e
BASE=http://localhost:3001
ML=http://localhost:3002

echo "=== Fleet Summary ==="
curl -sf $BASE/api/fleet/summary | python3 -m json.tool

echo ""
echo "=== Aircraft Count ==="
curl -sf $BASE/api/fleet/aircraft | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} aircraft')"

echo ""
echo "=== XW-01 Detail ==="
curl -sf $BASE/api/aircraft/XW-01 | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'history={len(d[\"history\"])} samples, status={d[\"status\"]}')"

echo ""
echo "=== 404 for Unknown Aircraft ==="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/aircraft/UNKNOWN)
echo "HTTP $STATUS (expect 404)"

echo ""
echo "=== Alerts ==="
curl -sf "$BASE/api/alerts?limit=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{d[\"total\"]} total alerts')"

echo ""
echo "=== ML Health ==="
curl -sf $ML/health | python3 -m json.tool

echo ""
echo "All checks passed."
```

Save as `scripts/smoke-test.sh`, then:

```bash
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
```

---

## Troubleshooting Test Failures

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `curl: connection refused` on port 3001 | Backend not running | Check terminal for Node.js errors; restart `npm run dev` |
| `curl: connection refused` on port 3002 | ML service not running | `cd ml-service && python3 app.py` |
| Fleet summary returns 0 aircraft | Simulator not started | Restart backend; check `SIMULATOR_AIRCRAFT_COUNT` in `.env` |
| No alerts appearing after 30 seconds | ML service unreachable | `curl http://localhost:3002/health`; fix Python environment |
| Anomaly scores always 0 | Not enough baseline samples | Wait 2+ minutes for rolling baseline to accumulate |
| Dashboard shows "last refresh" frozen | Frontend can't reach API | Check browser console for CORS/network errors |
| History depth stays at 0 after restart | Database path misconfigured | Confirm `data/xwing.db` exists; check `DB_PATH` in `.env` |
