import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import './Dashboard.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
  operational: '#22c55e',
  degrading:   '#eab308',
  critical:    '#ef4444',
};

const METRIC_LABELS = {
  shield:        'Shield Strength',
  fuel:          'Fuel Level',
  hull_integrity:'Hull Integrity',
  engine_temp:   'Engine Temp',
  targeting:     'Targeting System',
  nav_computer:  'Nav Computer',
  laser_charge:  'Laser Charge',
  hyperdrive:    'Hyperdrive',
  life_support:  'Life Support',
  comms:         'Comms',
};

function metricColor(value) {
  if (value < 40) return STATUS_COLOR.critical;
  if (value < 70) return STATUS_COLOR.degrading;
  return STATUS_COLOR.operational;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }) {
  const chartData = data.map(v => ({ v }));
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={22}>
        <LineChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── AircraftCard ─────────────────────────────────────────────────────────────

function AircraftCard({ aircraft, isSelected, onClick }) {
  const color = STATUS_COLOR[aircraft.status];
  const { metrics, history } = aircraft;

  return (
    <div
      className={`aircraft-card ${isSelected ? 'selected' : ''}`}
      style={{ '--status-color': color }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="card-header">
        <span className="card-id">{aircraft.id}</span>
        <span className="status-dot" style={{ background: color }} />
      </div>
      <div className="card-pilot">{aircraft.pilot}</div>
      <div className="card-metrics">
        {[['shield', 'SHD'], ['fuel', 'FUEL'], ['engine_temp', 'ENG']].map(([key, label]) => (
          <div className="metric-row" key={key}>
            <span className="metric-mini-label">{label}</span>
            <Sparkline data={history[key]} color={color} />
            <span className="metric-mini-val">{metrics[key].toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fleet Summary ────────────────────────────────────────────────────────────

function FleetSummary({ aircraft, lastUpdated }) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setSecondsAgo(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [lastUpdated]);

  const counts = { operational: 0, degrading: 0, critical: 0 };
  for (const ac of aircraft) counts[ac.status] = (counts[ac.status] || 0) + 1;

  return (
    <div className="fleet-summary">
      <div className="summary-title">◈ X-Wing Fleet Monitor</div>
      <div className="summary-counts">
        {['operational', 'degrading', 'critical'].map(status => (
          <div className="summary-stat" key={status}>
            <span className="stat-num" style={{ color: STATUS_COLOR[status] }}>
              {counts[status]}
            </span>
            <span className="stat-label">{status}</span>
          </div>
        ))}
      </div>
      <div className="summary-timestamp">
        Last refresh: {secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}
      </div>
    </div>
  );
}

// ─── Status Timeline ──────────────────────────────────────────────────────────

function StatusTimeline({ history }) {
  const keys = Object.keys(history);
  const length = history[keys[0]]?.length || 0;
  const statuses = [];
  for (let i = 0; i < length; i++) {
    const vals = keys.map(k => history[k][i]);
    if (vals.some(v => v < 40)) statuses.push('critical');
    else if (vals.some(v => v < 70)) statuses.push('degrading');
    else statuses.push('operational');
  }
  return (
    <div className="status-timeline" title="Status history (60s)">
      {statuses.map((s, i) => (
        <div key={i} className="timeline-segment" style={{ background: STATUS_COLOR[s] }} />
      ))}
    </div>
  );
}

// ─── Metric Chart ─────────────────────────────────────────────────────────────

function MetricChart({ label, values, currentValue }) {
  const color = metricColor(currentValue);
  const data = values.map(v => ({ v }));
  return (
    <div className="metric-chart">
      <div className="metric-chart-header">
        <span className="metric-chart-label">{label}</span>
        <span className="metric-chart-value" style={{ color }}>
          {currentValue.toFixed(1)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={55}>
        <LineChart data={data} margin={{ top: 2, right: 4, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1f2937" vertical={false} />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: 'none', fontSize: '0.7rem' }}
            formatter={v => [`${v.toFixed(1)}%`, label]}
            labelFormatter={() => ''}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ aircraft, onClose }) {
  if (!aircraft) {
    return (
      <div className="detail-panel empty">
        <span className="detail-empty-hint">Select an aircraft to view telemetry</span>
      </div>
    );
  }

  const color = STATUS_COLOR[aircraft.status];

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <div className="detail-id">{aircraft.id}</div>
          <div className="detail-pilot">{aircraft.pilot}</div>
          <div className="detail-squadron">{aircraft.squadron}</div>
        </div>
        <div className="detail-header-right">
          <span className="detail-status-badge" style={{ color, borderColor: color }}>
            {aircraft.status.toUpperCase()}
          </span>
          <button className="detail-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
      </div>

      <div className="detail-section-label">Status Timeline (60s)</div>
      <StatusTimeline history={aircraft.history} />

      <div className="detail-section-label">Metric History</div>
      <div className="detail-metrics">
        {Object.entries(METRIC_LABELS).map(([key, label]) => (
          <MetricChart
            key={key}
            label={label}
            values={aircraft.history[key]}
            currentValue={aircraft.metrics[key]}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard (main) ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const [fleet, setFleet] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const selectedAircraft = fleet?.aircraft.find(a => a.id === selectedId) ?? null;

  useEffect(() => {
    let active = true;

    async function fetchFleet() {
      try {
        const res = await fetch('/api/fleet/aircraft');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) {
          setFleet(data);
          setLastUpdated(Date.now());
          setError(null);
        }
      } catch (err) {
        if (active) setError(err.message);
      }
    }

    fetchFleet();
    const interval = setInterval(fetchFleet, 1000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  if (error) {
    return <div className="dashboard-state">⚠ Backend unreachable: {error}</div>;
  }

  if (!fleet) {
    return <div className="dashboard-state">Connecting to fleet telemetry…</div>;
  }

  return (
    <div className="dashboard">
      <FleetSummary aircraft={fleet.aircraft} lastUpdated={lastUpdated} />
      <div className="dashboard-body">
        <div className="aircraft-grid">
          {fleet.aircraft.map(ac => (
            <AircraftCard
              key={ac.id}
              aircraft={ac}
              isSelected={ac.id === selectedId}
              onClick={() => setSelectedId(prev => prev === ac.id ? null : ac.id)}
            />
          ))}
        </div>
        <DetailPanel aircraft={selectedAircraft} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  );
}
