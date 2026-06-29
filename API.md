# API Reference

Base URL: `http://localhost:3001`

All endpoints return `Content-Type: application/json`. Error responses follow the shape:

```json
{ "error": "Human-readable message" }
```

---

## Fleet Endpoints

### GET /api/fleet/summary

Returns aggregate counts for the entire fleet. Cached for 1 second.

**Response 200**

```json
{
  "total_aircraft": 30,
  "operational_count": 27,
  "damaged_count": 2,
  "maintenance_required_count": 1,
  "last_update_timestamp": "2026-06-29T14:32:01.123Z"
}
```

**Example**

```bash
curl http://localhost:3001/api/fleet/summary
```

---

### GET /api/fleet/aircraft

Returns all aircraft with their latest telemetry snapshot and derived status.

**Response 200** — array of aircraft objects

```json
[
  {
    "id": "XW-01",
    "status": "operational",
    "latest_metrics": {
      "shield_status": 92,
      "fuel_level": 78,
      "weapons_charge": 85,
      "hyperdrive_condition": 91,
      "temperature": 54,
      "jump_count": 14
    },
    "timestamp": "2026-06-29T14:32:01.100Z"
  },
  {
    "id": "XW-07",
    "status": "degrading",
    "latest_metrics": {
      "shield_status": 61,
      "fuel_level": 45,
      "weapons_charge": 80,
      "hyperdrive_condition": 88,
      "temperature": 72,
      "jump_count": 31
    },
    "timestamp": "2026-06-29T14:32:01.100Z"
  }
]
```

**Status values**

| Value | Condition |
|-------|-----------|
| `operational` | All metrics ≥ 70% |
| `degrading` | Any metric 40–70% |
| `critical` | Any metric < 40% |

**Example**

```bash
curl http://localhost:3001/api/fleet/aircraft
```

---

## Aircraft Endpoints

### GET /api/aircraft/:id

Returns detailed data for a single aircraft, including the last 100 telemetry samples.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | string | Aircraft ID (e.g., `XW-01`) |

**Response 200**

```json
{
  "id": "XW-01",
  "status": "operational",
  "history": [
    {
      "timestamp": "2026-06-29T14:32:01.100Z",
      "shield_status": 92,
      "fuel_level": 78,
      "weapons_charge": 85,
      "hyperdrive_condition": 91,
      "temperature": 54,
      "jump_count": 14
    },
    {
      "timestamp": "2026-06-29T14:31:59.600Z",
      "shield_status": 93,
      "fuel_level": 79,
      "weapons_charge": 85,
      "hyperdrive_condition": 91,
      "temperature": 53,
      "jump_count": 14
    }
  ]
}
```

`history` contains up to 100 entries, newest first.

**Response 404** — unknown aircraft ID

```json
{ "error": "Aircraft XW-99 not found" }
```

**Example**

```bash
curl http://localhost:3001/api/aircraft/XW-01

# Invalid ID
curl http://localhost:3001/api/aircraft/XW-99
```

---

## Alert Endpoints

### GET /api/alerts

Returns the 100 most recent alerts (anomalies and maintenance predictions combined), newest first.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `acknowledged` | boolean | — | Filter: `true` returns only acknowledged; `false` returns only unacknowledged |
| `aircraft_id` | string | — | Filter by aircraft |
| `limit` | integer | 100 | Max records to return (max 500) |
| `offset` | integer | 0 | Pagination offset |

**Response 200**

```json
{
  "total": 42,
  "alerts": [
    {
      "id": 17,
      "aircraft_id": "XW-07",
      "alert_type": "anomaly",
      "metric": "temperature",
      "component": null,
      "severity": "high",
      "description": "Temperature 98°C exceeds 2σ baseline (μ=61, σ=8)",
      "acknowledged": false,
      "timestamp": "2026-06-29T14:31:55.000Z"
    },
    {
      "id": 16,
      "aircraft_id": "XW-12",
      "alert_type": "maintenance",
      "metric": null,
      "component": "shield",
      "severity": "urgent",
      "description": "Shield projected to fail in 9.2 hours",
      "acknowledged": false,
      "timestamp": "2026-06-29T14:31:30.000Z"
    }
  ]
}
```

**Severity values**

| Value | Meaning |
|-------|---------|
| `low` | Minor deviation / normal wear |
| `medium` | Moderate anomaly / maintenance due soon (48 hrs) |
| `high` | Significant anomaly / maintenance urgent (12 hrs) |
| `critical` | Severe anomaly / imminent failure (< 4 hrs) |

**Example**

```bash
# All unacknowledged alerts
curl "http://localhost:3001/api/alerts?acknowledged=false"

# Alerts for a specific aircraft
curl "http://localhost:3001/api/alerts?aircraft_id=XW-07"

# Paginated
curl "http://localhost:3001/api/alerts?limit=10&offset=20"
```

---

### POST /api/alerts/:id/acknowledge

Marks an alert as acknowledged. Persisted in the database.

**Path parameters**

| Param | Type | Description |
|-------|------|-------------|
| `id` | integer | Alert ID |

**Response 200**

```json
{ "id": 17, "acknowledged": true }
```

**Response 404** — unknown alert ID

```json
{ "error": "Alert 999 not found" }
```

**Example**

```bash
curl -X POST http://localhost:3001/api/alerts/17/acknowledge
```

---

## ML Service Endpoints (Internal)

These endpoints are called by the Express backend and are not intended for direct frontend use. They are documented here for debugging and integration testing.

Base URL: `http://localhost:3002`

---

### GET /health

Health check for the Flask ML service.

**Response 200**

```json
{ "status": "ok", "version": "1.0.0" }
```

**Example**

```bash
curl http://localhost:3002/health
```

---

### POST /api/detect-anomalies

Analyzes a batch of telemetry samples and returns anomaly scores.

**Request body**

```json
{
  "aircraft": [
    {
      "aircraft_id": "XW-07",
      "samples": [
        {
          "timestamp": "2026-06-29T14:32:01.100Z",
          "shield_status": 61,
          "fuel_level": 45,
          "weapons_charge": 80,
          "hyperdrive_condition": 88,
          "temperature": 98,
          "jump_count": 31
        }
      ]
    }
  ]
}
```

**Response 200**

```json
{
  "anomalies": [
    {
      "aircraft_id": "XW-07",
      "score": 0.87,
      "affected_metrics": ["temperature"],
      "severity": "high"
    }
  ]
}
```

**Score interpretation**

| Score | Severity |
|-------|----------|
| 0.0–0.33 | low |
| 0.34–0.66 | medium |
| 0.67–1.0 | high |

**Example**

```bash
curl -X POST http://localhost:3002/api/detect-anomalies \
  -H "Content-Type: application/json" \
  -d '{
    "aircraft": [
      {
        "aircraft_id": "XW-07",
        "samples": [
          {
            "timestamp": "2026-06-29T14:32:01.100Z",
            "shield_status": 61,
            "fuel_level": 45,
            "weapons_charge": 80,
            "hyperdrive_condition": 88,
            "temperature": 98,
            "jump_count": 31
          }
        ]
      }
    ]
  }'
```

---

### POST /api/predict-maintenance

Predicts time until component failure based on recent telemetry trend.

**Request body**

```json
{
  "aircraft_id": "XW-12",
  "component": "shield",
  "samples": [
    { "timestamp": "2026-06-29T14:00:00.000Z", "shield_status": 75 },
    { "timestamp": "2026-06-29T14:01:30.000Z", "shield_status": 74 },
    { "timestamp": "2026-06-29T14:03:00.000Z", "shield_status": 72 }
  ]
}
```

**Response 200**

```json
{
  "aircraft_id": "XW-12",
  "component": "shield",
  "hours_until_failure": 9.2,
  "confidence_score": 0.81,
  "recommended_maintenance_window": "2026-06-29T23:27:00.000Z",
  "alert_level": "urgent"
}
```

**Alert level mapping**

| Alert level | Condition |
|-------------|-----------|
| `normal` | > 48 hours |
| `soon` | 12–48 hours |
| `urgent` | 4–12 hours |
| `critical` | < 4 hours |

**Example**

```bash
curl -X POST http://localhost:3002/api/predict-maintenance \
  -H "Content-Type: application/json" \
  -d '{
    "aircraft_id": "XW-12",
    "component": "shield",
    "samples": [
      { "timestamp": "2026-06-29T14:00:00.000Z", "shield_status": 75 },
      { "timestamp": "2026-06-29T14:01:30.000Z", "shield_status": 74 },
      { "timestamp": "2026-06-29T14:03:00.000Z", "shield_status": 72 }
    ]
  }'
```

---

## Error Reference

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Malformed request body |
| 404 | Resource not found |
| 429 | Rate limit exceeded (100 req/min) |
| 500 | Internal server error |
| 503 | ML service unavailable |

When the ML service is unreachable, the backend returns a `503` with:

```json
{ "error": "ML service unavailable — anomaly detection paused" }
```

The dashboard continues showing the last-known anomaly data until the service recovers.
