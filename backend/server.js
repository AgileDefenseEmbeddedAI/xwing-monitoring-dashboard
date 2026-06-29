const express = require('express');
const cors = require('cors');
const Simulator = require('./simulator');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const simulator = new Simulator();

// Advance telemetry every second
setInterval(() => simulator.tick(), 1000);

app.get('/api/fleet/aircraft', (req, res) => {
  res.json(simulator.getFleet());
});

app.get('/api/fleet/aircraft/:id', (req, res) => {
  const fleet = simulator.getFleet();
  const aircraft = fleet.aircraft.find(a => a.id === req.params.id);
  if (!aircraft) return res.status(404).json({ error: 'Aircraft not found' });
  res.json(aircraft);
});

app.listen(PORT, () => {
  console.log(`X-Wing monitoring backend running on http://localhost:${PORT}`);
});
