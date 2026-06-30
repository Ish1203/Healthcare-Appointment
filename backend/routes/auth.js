const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (!['patient', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)')
      .run(id, name, email, hashed, role, phone || null);

    const token = jwt.sign({ id, name, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, role, phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', require('../middleware/auth')(), (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, phone, google_tokens FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ...user, google_connected: !!user.google_tokens });
});

module.exports = router;
