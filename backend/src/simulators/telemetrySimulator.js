'use strict';

const FLEET_SIZE = 30;
const ANOMALY_DEGRADING_SHIELD = 7;   // XW-007 has a slowly degrading shield
const ANOMALY_TEMP_SPIKE = 13;         // XW-013 has temperature spikes

function makeAircraftId(n) {
  return `XW-${String(n).padStart(3, '0')}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Initial state for each aircraft
function initFleet() {
  const fleet = {};
  for (let i = 1; i <= FLEET_SIZE; i++) {
    const id = makeAircraftId(i);
    fleet[id] = {
      aircraft_id: id,
      shield_status: rand(75, 100),
      fuel_level: rand(60, 100),
      weapons_charge: rand(80, 100),
      hyperdrive_condition: rand(70, 100),
      temperature: rand(40, 70),
      jump_count: Math.floor(rand(0, 50)),
      // Internal state not in telemetry payload
      _temp_spike_cooldown: 0,
    };
  }
  return fleet;
}

const fleet = initFleet();

function stepAircraft(aircraft, id) {
  const num = parseInt(id.split('-')[1], 10);

  // Normal gradual fuel drain
  aircraft.fuel_level = clamp(aircraft.fuel_level - rand(0.1, 0.5), 0, 100);

  // Normal slow temperature creep then cooling
  aircraft.temperature = clamp(
    aircraft.temperature + rand(-0.5, 0.8),
    40,
    120
  );

  // Slight weapons discharge / recharge cycle
  aircraft.weapons_charge = clamp(
    aircraft.weapons_charge + rand(-0.3, 0.3),
    0,
    100
  );

  // Slow hyperdrive wear
  aircraft.hyperdrive_condition = clamp(
    aircraft.hyperdrive_condition - rand(0, 0.1),
    0,
    100
  );

  // Occasional jump (small probability each tick)
  if (Math.random() < 0.002) {
    aircraft.jump_count += 1;
    aircraft.fuel_level = clamp(aircraft.fuel_level - rand(5, 15), 0, 100);
    aircraft.hyperdrive_condition = clamp(
      aircraft.hyperdrive_condition - rand(1, 3),
      0,
      100
    );
  }

  // --- Anomaly 1: XW-007 has a degrading shield ---
  if (num === ANOMALY_DEGRADING_SHIELD) {
    aircraft.shield_status = clamp(aircraft.shield_status - rand(0.3, 0.7), 0, 100);
  } else {
    // Normal shield drift
    aircraft.shield_status = clamp(aircraft.shield_status + rand(-0.2, 0.2), 0, 100);
  }

  // --- Anomaly 2: XW-013 has periodic temperature spikes ---
  if (num === ANOMALY_TEMP_SPIKE) {
    if (aircraft._temp_spike_cooldown > 0) {
      aircraft._temp_spike_cooldown -= 1;
      // Gradual cool-down after spike
      aircraft.temperature = clamp(aircraft.temperature - rand(0.5, 1.5), 40, 120);
    } else if (Math.random() < 0.05) {
      // Trigger a spike
      aircraft.temperature = clamp(aircraft.temperature + rand(20, 40), 40, 120);
      aircraft._temp_spike_cooldown = Math.floor(rand(5, 15));
    }
  }
}

function snapshot() {
  const now = new Date().toISOString();
  return Object.values(fleet).map(({ _temp_spike_cooldown, ...aircraft }) => ({
    timestamp: now,
    aircraft_id: aircraft.aircraft_id,
    shield_status: Math.round(aircraft.shield_status * 10) / 10,
    fuel_level: Math.round(aircraft.fuel_level * 10) / 10,
    weapons_charge: Math.round(aircraft.weapons_charge * 10) / 10,
    hyperdrive_condition: Math.round(aircraft.hyperdrive_condition * 10) / 10,
    temperature: Math.round(aircraft.temperature * 10) / 10,
    jump_count: aircraft.jump_count,
  }));
}

let _intervalId = null;
let _latestTelemetry = [];
const _listeners = new Set();

function start(intervalMs = 1000) {
  if (_intervalId) return;
  // Produce an initial snapshot immediately
  _latestTelemetry = snapshot();
  _intervalId = setInterval(() => {
    for (const [id, aircraft] of Object.entries(fleet)) {
      stepAircraft(aircraft, id);
    }
    _latestTelemetry = snapshot();
    for (const cb of _listeners) cb(_latestTelemetry);
  }, intervalMs);
}

function stop() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

function getLatest() {
  return _latestTelemetry;
}

function subscribe(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

module.exports = { start, stop, getLatest, subscribe };
