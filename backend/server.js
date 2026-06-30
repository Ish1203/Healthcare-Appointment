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
