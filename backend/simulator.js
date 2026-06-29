'use strict';

const PILOTS = [
  'Luke Skywalker', 'Wedge Antilles', 'Biggs Darklighter', 'Jek Porkins',
  'Dutch Vander', 'Dak Ralter', 'Zev Senesca', 'Wes Janson',
  'Hobbie Klivian', 'Tycho Celchu', 'Nien Nunb', 'Lando Calrissian',
  'Amilyn Holdo', 'Poe Dameron', 'Snap Wexley', 'Jessika Pava',
  'Joph Seastriker', 'Karé Kun', 'Bastian', 'Pamich Goode',
  'Temmin Wexley', 'Niv Lek', 'Yolo Ziff', 'Stomeroni Starck',
  'Ello Asty', 'Lieutenant Ematt', 'Brance', 'Vober Dand',
  "C'ai Threnalli", 'Tallissan Lintra'
];

const METRICS = ['shield_level', 'fuel_level', 'weapons_power', 'hyperdrive_status'];

const MAINTENANCE_ACTIONS = {
  shield_level: 'Schedule shield generator maintenance',
  fuel_level: 'Refuel before next sortie',
  weapons_power: 'Weapons system diagnostic required',
  hyperdrive_status: 'Hyperdrive calibration needed'
};

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

// Build initial fleet
const fleet = [];
for (let i = 0; i < 30; i++) {
  const id = `XW-${String(i + 1).padStart(3, '0')}`;
  const pilot = PILOTS[i];
  let squadron;
  if (i < 10) squadron = 'Red';
  else if (i < 20) squadron = 'Gold';
  else squadron = 'Blue';

  // Random baselines 60-90
  const baselines = {};
  for (const m of METRICS) {
    baselines[m] = randomBetween(60, 90);
  }

  fleet.push({
    id,
    pilot,
    squadron,
    baselines,
    history: [] // Array of { timestamp, shield_level, fuel_level, weapons_power, hyperdrive_status, anomalies: [] }
  });
}

function computeStatus(metrics) {
  const values = METRICS.map(m => metrics[m]);
  if (values.some(v => v < 20)) return 'CRITICAL';
  if (values.some(v => v < 40)) return 'WARNING';
  return 'NOMINAL';
}

function linearRegression(values) {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function tick() {
  const now = Date.now();
  for (const aircraft of fleet) {
    const reading = { timestamp: now, anomalies: [] };

    for (const metric of METRICS) {
      const baseline = aircraft.baselines[metric];
      const isAnomaly = Math.random() < 0.05;

      let value;
      if (isAnomaly) {
        const drop = randomBetween(30, 50);
        value = clamp(baseline - drop, 0, 100);
        reading.anomalies.push(metric);
      } else {
        const noise = randomBetween(-5, 5);
        value = clamp(baseline + noise, 0, 100);
      }
      reading[metric] = Math.round(value * 10) / 10;
    }

    aircraft.history.push(reading);
    // Keep only last 100 readings
    if (aircraft.history.length > 100) {
      aircraft.history.shift();
    }
  }
}

function getPredictions(aircraft) {
  const history = aircraft.history;
  if (history.length < 2) return [];

  const last20 = history.slice(-20);
  const predictions = [];

  for (const metric of METRICS) {
    const values = last20.map(r => r[metric]);
    const slope = linearRegression(values);
    const currentVal = values[values.length - 1];

    if (slope < -0.5 && currentVal < 60) {
      const hoursUntilFailure = (currentVal - 20) / Math.abs(slope) / 3600;
      const severity = hoursUntilFailure < 1 ? 'critical' : hoursUntilFailure < 4 ? 'warning' : 'info';
      predictions.push({
        metric,
        current_value: currentVal,
        slope,
        hours_until_failure: hoursUntilFailure,
        action: MAINTENANCE_ACTIONS[metric],
        severity,
        timestamp: Date.now()
      });
    }
  }

  return predictions;
}

function getFleet() {
  return fleet.map(aircraft => {
    const latest = aircraft.history[aircraft.history.length - 1];
    const latestMetrics = latest
      ? {
          shield_level: latest.shield_level,
          fuel_level: latest.fuel_level,
          weapons_power: latest.weapons_power,
          hyperdrive_status: latest.hyperdrive_status
        }
      : { shield_level: 0, fuel_level: 0, weapons_power: 0, hyperdrive_status: 0 };

    return {
      id: aircraft.id,
      pilot: aircraft.pilot,
      squadron: aircraft.squadron,
      status: latest ? computeStatus(latest) : 'NOMINAL',
      latestMetrics
    };
  });
}

function getAircraft(id) {
  const aircraft = fleet.find(a => a.id === id);
  if (!aircraft) return null;

  const latest = aircraft.history[aircraft.history.length - 1];
  const status = latest ? computeStatus(latest) : 'NOMINAL';

  // Gather all anomaly events from history
  const anomalies = [];
  for (const reading of aircraft.history) {
    if (reading.anomalies && reading.anomalies.length > 0) {
      for (const metric of reading.anomalies) {
        const value = reading[metric];
        const severity = value < 20 ? 'critical' : 'warning';
        anomalies.push({
          type: 'anomaly',
          timestamp: reading.timestamp,
          metric,
          value,
          severity
        });
      }
    }
  }

  // Sort anomalies newest first
  anomalies.sort((a, b) => b.timestamp - a.timestamp);

  const predictions = getPredictions(aircraft);

  return {
    aircraft: {
      id: aircraft.id,
      pilot: aircraft.pilot,
      squadron: aircraft.squadron,
      status
    },
    history: aircraft.history,
    anomalies,
    predictions
  };
}

function startSimulator() {
  // Run first tick immediately so there's initial data
  tick();
  setInterval(tick, 1000);
}

module.exports = { getFleet, getAircraft, startSimulator };
