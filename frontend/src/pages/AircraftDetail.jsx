import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// ---------- MetricChart ----------
function MetricChart({ title, dataKey, history, color }) {
  const last20 = history.slice(-20)

  const chartData = last20.map((reading, idx) => ({
    idx,
    value: reading[dataKey],
    anomaly: reading.anomalies && reading.anomalies.includes(dataKey)
  }))

  const renderDot = (props) => {
    const { cx, cy, index } = props
    if (chartData[index] && chartData[index].anomaly) {
      return <circle key={`dot-${index}`} cx={cx} cy={cy} r={5} fill="#ff4444" stroke="none" />
    }
    return null
  }

  return (
    <div className="chart-container">
      <div className="chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d5a" />
          <XAxis dataKey="idx" tick={false} axisLine={{ stroke: '#1e2d5a' }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#5c7099', fontSize: 11 }} axisLine={{ stroke: '#1e2d5a' }} />
          <Tooltip
            contentStyle={{ background: '#0d1226', border: '1px solid #1e2d5a', color: '#e0e6ff', fontFamily: 'monospace' }}
            labelFormatter={() => ''}
            formatter={(val) => [val != null ? val.toFixed(1) : 'N/A', title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={renderDot}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------- Helpers ----------
function formatTimestamp(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  })
}

function formatMetricName(key) {
  return key
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ---------- AircraftDetail ----------
function AircraftDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchAircraft() {
      try {
        const res = await axios.get(`/api/aircraft/${id}`)
        if (!cancelled) {
          setData(res.data)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          if (err.response && err.response.status === 404) {
            setNotFound(true)
            setLoading(false)
          } else {
            console.error('Fetch error:', err)
          }
        }
      }
    }

    fetchAircraft()
    const interval = setInterval(fetchAircraft, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [id])

  function downloadHistory() {
    if (!data) return
    const blob = new Blob([JSON.stringify(data.history, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${id}-history.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading && !data) {
    return (
      <div>
        <header className="nav-header">
          <h1>X-Wing Fleet Monitor</h1>
        </header>
        <div className="page-container">
          <p className="loading-text">Loading aircraft data&hellip;</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div>
        <header className="nav-header">
          <h1>X-Wing Fleet Monitor</h1>
        </header>
        <div className="page-container">
          <div className="not-found-container">
            <h2>Aircraft Not Found</h2>
            <p>No aircraft with ID <strong>{id}</strong> exists in the fleet registry.</p>
            <Link to="/" className="back-link">&larr; Back to Fleet Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  const { aircraft, history, anomalies, predictions } = data

  // Build unified alert timeline
  const predictionAlerts = predictions.map(p => ({
    type: 'prediction',
    timestamp: p.timestamp,
    metric: p.metric,
    value: p.current_value,
    hours_until_failure: p.hours_until_failure,
    action: p.action,
    severity: p.severity
  }))

  const unified = [...anomalies, ...predictionAlerts]
  unified.sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div>
      <header className="nav-header">
        <h1>X-Wing Fleet Monitor</h1>
        <span className="nav-subtitle">Aircraft Detail</span>
      </header>

      <div className="page-container">
        <Link to="/" className="back-link">&larr; Back to Fleet Dashboard</Link>

        {/* Aircraft Header */}
        <div className="aircraft-header">
          <div className="aircraft-header-info">
            <div className="aircraft-id">{aircraft.id}</div>
            <div className="aircraft-pilot">{aircraft.pilot}</div>
            <div className="aircraft-squadron">{aircraft.squadron} Squadron</div>
          </div>
          <div className="aircraft-header-status">
            <span className={`status-badge status-${aircraft.status}`}>{aircraft.status}</span>
            <button className="btn" onClick={downloadHistory}>
              &#8659; Download History
            </button>
          </div>
        </div>

        {/* Metric Charts 2x2 Grid */}
        <div className="charts-grid">
          <MetricChart
            title="Shield Level"
            dataKey="shield_level"
            history={history}
            color="#00ff88"
          />
          <MetricChart
            title="Fuel Level"
            dataKey="fuel_level"
            history={history}
            color="#4fc3f7"
          />
          <MetricChart
            title="Weapons Power"
            dataKey="weapons_power"
            history={history}
            color="#ffaa00"
          />
          <MetricChart
            title="Hyperdrive Status"
            dataKey="hyperdrive_status"
            history={history}
            color="#cc88ff"
          />
        </div>

        {/* Maintenance Recommendations */}
        {predictions.length > 0 && (
          <div className="card">
            <div className="card-title">Maintenance Recommendations</div>
            <div className="maintenance-grid">
              {predictions.map((pred, i) => (
                <div key={i} className="maintenance-card">
                  <div className="maintenance-card-header">
                    <span className="maintenance-metric-name">{formatMetricName(pred.metric)}</span>
                    <span className={`status-badge status-${pred.severity === 'critical' ? 'CRITICAL' : pred.severity === 'warning' ? 'WARNING' : 'NOMINAL'}`}>
                      {pred.severity}
                    </span>
                  </div>
                  <div className="maintenance-row">
                    <span className="maintenance-label">Current value</span>
                    <span className="maintenance-value">{pred.current_value.toFixed(1)}</span>
                  </div>
                  <div className="maintenance-row">
                    <span className="maintenance-label">Est. hrs until failure</span>
                    <span className="maintenance-value">{pred.hours_until_failure.toFixed(1)} h</span>
                  </div>
                  <div className="maintenance-action">{pred.action}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alert Timeline */}
        <div className="card">
          <div className="card-title">Alert Timeline</div>
          {unified.length === 0 ? (
            <p className="no-alerts">No alerts or predictions recorded yet.</p>
          ) : (
            <ul className="alert-timeline">
              {unified.map((item, i) => (
                <li key={i} className="alert-item">
                  <div className={`alert-dot alert-dot-${item.severity}`} />
                  <div className="alert-content">
                    <div className="alert-timestamp">{formatTimestamp(item.timestamp)}</div>
                    <div className={`alert-label alert-label-${item.type}`}>
                      {item.type === 'anomaly' ? 'ANOMALY DETECTED' : 'MAINTENANCE PREDICTION'}
                    </div>
                    <div className="alert-metric">{formatMetricName(item.metric)}</div>
                    {item.type === 'anomaly' && (
                      <div className="alert-detail">Value dropped to {item.value.toFixed(1)}</div>
                    )}
                    {item.type === 'prediction' && (
                      <div className="alert-detail">
                        {item.action} &mdash; ~{item.hours_until_failure.toFixed(1)} h remaining
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default AircraftDetail
