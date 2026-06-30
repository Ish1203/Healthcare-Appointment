const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const { getAuthUrl, getOAuthClient } = require('../services/calendarService');

// Get Google OAuth URL
router.get('/auth-url', auth(), (req, res) => {
  try {
    const url = getAuthUrl(req.user.id, req.user.role);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Google Calendar not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env' });
  }
});

// OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) return res.status(400).send('No code received');

  try {
    const { userId } = JSON.parse(state);
    const oAuth2Client = getOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    db.prepare('UPDATE users SET google_tokens = ? WHERE id = ?').run(JSON.stringify(tokens), userId);
    res.send(`<script>window.close()</script><p>Google Calendar connected! You can close this window.</p>`);
  } catch (err) {
    res.status(500).send('OAuth failed: ' + err.message);
  }
});

// Disconnect Google Calendar
router.delete('/disconnect', auth(), (req, res) => {
  db.prepare('UPDATE users SET google_tokens = NULL WHERE id = ?').run(req.user.id);
  res.json({ message: 'Google Calendar disconnected' });
});

module.exports = router;
