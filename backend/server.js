require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Initialize DB
require('./db/database');

// Auto-seed demo accounts if the database is empty (safe to run every boot —
// it checks for existing data first and skips if already seeded). This lets
// hosts without Shell access, like Render's free tier, get demo data without
// any manual step.
const seed = require('./seed');
seed().catch(err => console.error('Seed error:', err.message));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Start background jobs
const { startAllJobs } = require('./services/jobs');
startAllJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🏥 Healthcare API running on http://localhost:${PORT}`);
});

module.exports = app;
