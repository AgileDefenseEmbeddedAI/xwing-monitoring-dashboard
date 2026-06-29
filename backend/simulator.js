const PILOTS = [
  'Luke Skywalker', 'Wedge Antilles', 'Biggs Darklighter', 'Jek Porkins',
  'Garven Dreis', 'Wes Janson', 'Derek Klivian', 'Tycho Celchu',
  'Corran Horn', 'Gavin Darklighter', 'Mara Jade', 'Poe Dameron',
  'Jessika Pava', 'Snap Wexley', 'Nien Nunb', 'Ello Asty',
  'Temmin Wexley', 'Kare Kun', 'Bastian', 'Yolo Ziff',
];

const SQUADRONS = [
  'Red Squadron', 'Gold Squadron', 'Blue Squadron', 'Green Squadron', 'Rogue Squadron',
];

const METRIC_KEYS = [
  'shield', 'fuel', 'hull_integrity', 'engine_temp',
  'targeting', 'nav_computer', 'laser_charge', 'hyperdrive',
  'life_support', 'comms',
];

const HISTORY_LENGTH = 60;

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

class Simulator {
  constructor() {
    this.aircraft = this._initAircraft();
  }

  _initAircraft() {
    const aircraft = [];
    for (let i = 0; i < 30; i++) {
      const baseline = {};
      for (const key of METRIC_KEYS) {
        baseline[key] = clamp(rand(72, 97));
      }

      // A few critical aircraft (any metric < 40)
      if (i < 2) {
        baseline.shield = rand(10, 35);
        baseline.hull_integrity = rand(15, 38);
      }
      // A few degrading aircraft (some metrics 40-70)
      else if (i < 6) {
        baseline.fuel = rand(42, 65);
        baseline.engine_temp = rand(48, 68);
      }

      const metrics = Object.assign({}, baseline);

      // Pre-fill history with realistic values around the baseline
      const history = {};
      for (const key of METRIC_KEYS) {
        history[key] = Array.from({ length: HISTORY_LENGTH }, () =>
          clamp(baseline[key] + rand(-8, 8))
        );
        history[key][HISTORY_LENGTH - 1] = metrics[key];
      }

      aircraft.push({
        id: `X-Wing-${String(i + 1).padStart(2, '0')}`,
        pilot: PILOTS[i % PILOTS.length],
        squadron: SQUADRONS[Math.floor(i / 6)],
        metrics,
        baseline,
        history,
      });
    }
    return aircraft;
  }

  _getStatus(metrics) {
    const values = Object.values(metrics);
    if (values.some(v => v < 40)) return 'critical';
    if (values.some(v => v < 70)) return 'degrading';
    return 'operational';
  }

  tick() {
    for (const ac of this.aircraft) {
      for (const key of METRIC_KEYS) {
        const baseline = ac.baseline[key];
        const current = ac.metrics[key];
        // Mean-revert drift + random noise
        const drift = (baseline - current) * 0.04;
        const noise = rand(-2, 2);
        const next = clamp(current + drift + noise);
        ac.metrics[key] = next;
        ac.history[key].push(next);
        if (ac.history[key].length > HISTORY_LENGTH) {
          ac.history[key].shift();
        }
      }
    }
  }

  getFleet() {
    return {
      aircraft: this.aircraft.map(ac => ({
        id: ac.id,
        pilot: ac.pilot,
        squadron: ac.squadron,
        status: this._getStatus(ac.metrics),
        metrics: Object.fromEntries(
          Object.entries(ac.metrics).map(([k, v]) => [k, parseFloat(v.toFixed(1))])
        ),
        history: Object.fromEntries(
          Object.entries(ac.history).map(([k, arr]) => [k, arr.map(v => parseFloat(v.toFixed(1)))])
        ),
      })),
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = Simulator;
