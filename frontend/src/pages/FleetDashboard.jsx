import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function metricClass(value) {
  if (value < 20) return 'metric-low'
  if (value < 40) return 'metric-warn'
  return 'metric-ok'
}

function FleetDashboard() {
  const [fleet, setFleet] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function fetchFleet() {
      try {
        const res = await axios.get('/api/fleet')
        if (!cancelled) {
          setFleet(res.data)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch fleet:', err)
      }
    }

    fetchFleet()
    const interval = setInterval(fetchFleet, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <div>
      <header className="nav-header">
        <h1>X-Wing Fleet Monitor</h1>
        <span className="nav-subtitle">Real-time telemetry &mdash; {fleet ? fleet.length : 0} aircraft</span>
      </header>

      <div className="page-container">
        {loading && !fleet ? (
          <p className="loading-text">Loading fleet telemetry&hellip;</p>
        ) : (
          <div className="card">
            <div className="card-title">Fleet Status</div>
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Pilot</th>
                  <th>Squadron</th>
                  <th>Status</th>
                  <th>Shield</th>
                  <th>Fuel</th>
                  <th>Weapons</th>
                  <th>Hyperdrive</th>
                </tr>
              </thead>
              <tbody>
                {fleet && fleet.map(aircraft => (
                  <tr
                    key={aircraft.id}
                    onClick={() => navigate(`/aircraft/${aircraft.id}`)}
                    title={`View ${aircraft.id} details`}
                  >
                    <td style={{ color: '#4fc3f7', fontWeight: 'bold' }}>{aircraft.id}</td>
                    <td>{aircraft.pilot}</td>
                    <td style={{ color: '#5c7099' }}>{aircraft.squadron}</td>
                    <td>
                      <span className={`status-badge status-${aircraft.status}`}>
                        {aircraft.status}
                      </span>
                    </td>
                    <td className={`metric-value ${metricClass(aircraft.latestMetrics.shield_level)}`}>
                      {aircraft.latestMetrics.shield_level.toFixed(1)}
                    </td>
                    <td className={`metric-value ${metricClass(aircraft.latestMetrics.fuel_level)}`}>
                      {aircraft.latestMetrics.fuel_level.toFixed(1)}
                    </td>
                    <td className={`metric-value ${metricClass(aircraft.latestMetrics.weapons_power)}`}>
                      {aircraft.latestMetrics.weapons_power.toFixed(1)}
                    </td>
                    <td className={`metric-value ${metricClass(aircraft.latestMetrics.hyperdrive_status)}`}>
                      {aircraft.latestMetrics.hyperdrive_status.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default FleetDashboard
