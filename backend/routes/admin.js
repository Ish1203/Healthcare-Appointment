const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const auth = require('../middleware/auth');

// Get all users
router.get('/users', auth(['admin']), (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// Create doctor account (admin only)
router.post('/doctors', auth(['admin']), async (req, res) => {
  const { name, email, password, phone, specialization, qualification,
    experience_years, slot_duration, working_hours_start, working_hours_end, working_days, bio, fee } = req.body;

  if (!name || !email || !password || !specialization) {
    return res.status(400).json({ error: 'name, email, password, specialization required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already exists' });

  const hashed = await bcrypt.hash(password, 10);
  const userId = uuidv4();
  const docId = uuidv4();

  db.transaction(() => {
    db.prepare('INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)')
      .run(userId, name, email, hashed, 'doctor', phone || null);
    db.prepare(`INSERT INTO doctors (id, user_id, specialization, qualification, experience_years,
      slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(docId, userId, specialization, qualification || '', experience_years || 0,
        slot_duration || 30, working_hours_start || '09:00', working_hours_end || '17:00',
        working_days || '1,2,3,4,5', bio || '', fee || 500);
  })();

  res.json({ message: 'Doctor created', userId, docId });
});

// Update doctor profile (admin)
router.put('/doctors/:docId', auth(['admin']), (req, res) => {
  const { specialization, qualification, experience_years, slot_duration,
    working_hours_start, working_hours_end, working_days, bio, fee } = req.body;
  db.prepare(`UPDATE doctors SET specialization=?, qualification=?, experience_years=?,
    slot_duration=?, working_hours_start=?, working_hours_end=?, working_days=?, bio=?, fee=?
    WHERE id=?`)
    .run(specialization, qualification, experience_years, slot_duration,
      working_hours_start, working_hours_end, working_days, bio, fee, req.params.docId);
  res.json({ message: 'Doctor updated' });
});

// Delete user
router.delete('/users/:id', auth(['admin']), (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

// Dashboard stats
router.get('/stats', auth(['admin']), (req, res) => {
  const totalPatients = db.prepare("SELECT COUNT(*) as count FROM users WHERE role='patient'").get().count;
  const totalDoctors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role='doctor'").get().count;
  const totalAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status != 'pending'").get().count;
  const todayAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_date = date('now') AND status = 'confirmed'").get().count;
  const completedAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'").get().count;
  const cancelledAppointments = db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'cancelled'").get().count;
  const recentAppointments = db.prepare(`
    SELECT a.id, a.appointment_date, a.slot_time, a.status, a.urgency_level,
           pu.name as patient_name, du.name as doctor_name
    FROM appointments a
    JOIN users pu ON a.patient_id = pu.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users du ON d.user_id = du.id
    WHERE a.status != 'pending'
    ORDER BY a.created_at DESC LIMIT 10
  `).all();

  res.json({ totalPatients, totalDoctors, totalAppointments, todayAppointments, completedAppointments, cancelledAppointments, recentAppointments });
});

module.exports = router;
