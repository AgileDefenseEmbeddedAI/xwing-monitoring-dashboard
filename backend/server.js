'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const simulator = require('./src/simulators/telemetrySimulator');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// Start the telemetry simulator
simulator.start(Number(process.env.SIMULATOR_INTERVAL_MS) || 1000);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Return latest telemetry snapshot for all aircraft
app.get('/api/telemetry', (_req, res) => {
  res.json(simulator.getLatest());
});

app.listen(PORT, () => {
  console.log(`X-Wing backend listening on http://localhost:${PORT}`);
});
