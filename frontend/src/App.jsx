import { useEffect, useState } from 'react';

const API = '/api/telemetry';
const REFRESH_MS = 2000;

export default function App() {
  const [fleet, setFleet] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTelemetry() {
      try {
        const res = await fetch(API);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFleet(await res.json());
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchTelemetry();
    const id = setInterval(fetchTelemetry, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ fontFamily: 'monospace', padding: '1rem' }}>
      <h1>X-Wing Fleet Monitor</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <p>Tracking {fleet.length} aircraft &mdash; refreshes every {REFRESH_MS / 1000}s</p>
      <table border="1" cellPadding="4" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Shield %</th>
            <th>Fuel %</th>
            <th>Weapons %</th>
            <th>Hyperdrive %</th>
            <th>Temp °C</th>
            <th>Jumps</th>
          </tr>
        </thead>
        <tbody>
          {fleet.map((a) => (
            <tr key={a.aircraft_id}>
              <td>{a.aircraft_id}</td>
              <td>{a.shield_status}</td>
              <td>{a.fuel_level}</td>
              <td>{a.weapons_charge}</td>
              <td>{a.hyperdrive_condition}</td>
              <td>{a.temperature}</td>
              <td>{a.jump_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
