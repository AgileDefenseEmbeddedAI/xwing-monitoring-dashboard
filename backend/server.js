'use strict';

const express = require('express');
const cors = require('cors');
const { getFleet, getAircraft, startSimulator } = require('./simulator');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Start the telemetry simulator
startSimulator();

// GET /api/fleet - returns all aircraft summary
app.get('/api/fleet', (req, res) => {
  res.json(getFleet());
});

// GET /api/aircraft/:id - returns detailed aircraft data
app.get('/api/aircraft/:id', (req, res) => {
  const { id } = req.params;
  const data = getAircraft(id);
  if (!data) {
    return res.status(404).json({ error: `Aircraft ${id} not found` });
  }
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`X-Wing Fleet Backend running on http://localhost:${PORT}`);
});
