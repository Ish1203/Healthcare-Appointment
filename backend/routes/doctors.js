const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const auth = require('../middleware/auth');
const { sendEmail, cancellationHtml } = require('../services/emailService');

// Get all doctors (with optional specialization filter)
router.get('/', (req, res) => {
  const { specialization, search } = req.query;
  let query = `
    SELECT d.*, u.name, u.email, u.phone
    FROM doctors d JOIN users u ON d.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (specialization) { query += ' AND d.specialization LIKE ?'; params.push(`%${specialization}%`); }
  if (search) { query += ' AND (u.name LIKE ? OR d.specialization LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const doctors = db.prepare(query).all(...params);
  res.json(doctors);
});

// Get doctor profile
router.get('/:id', (req, res) => {
  const doctor = db.prepare(`
    SELECT d.*, u.name, u.email, u.phone
    FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?
  `).get(req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json(doctor);
});

// Get available slots for a doctor on a date
router.get('/:id/slots', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date required' });

  const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  // Check if on leave
  const onLeave = db.prepare('SELECT id FROM leave_dates WHERE doctor_id = ? AND leave_date = ?').get(req.params.id, date);
  if (onLeave) return res.json({ available: false, reason: 'Doctor is on leave', slots: [] });

  // Check working day
  const dayOfWeek = new Date(date).getDay();
  const workingDays = doctor.working_days.split(',').map(Number);
  if (!workingDays.includes(dayOfWeek)) return res.json({ available: false, reason: 'Not a working day', slots: [] });

  // Generate slots
  const slots = [];
  const [startH, startM] = doctor.working_hours_start.split(':').map(Number);
  const [endH, endM] = doctor.working_hours_end.split(':').map(Number);
  let current = startH * 60 + startM;
  const endTime = endH * 60 + endM;

  while (current + doctor.slot_duration <= endTime) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += doctor.slot_duration;
  }

  // Remove booked/held slots
  const booked = db.prepare(`
    SELECT slot_time FROM appointments
    WHERE doctor_id = ? AND appointment_date = ?
    AND status NOT IN ('cancelled')
    AND (hold_until IS NULL OR hold_until > CURRENT_TIMESTAMP)
  `).all(req.params.id, date).map(a => a.slot_time);

  const available = slots.filter(s => !booked.includes(s));
  res.json({ available: true, slots: available, booked });
});

// Create doctor profile (admin or doctor themselves)
router.post('/profile', auth(['admin', 'doctor']), (req, res) => {
  const { user_id, specialization, qualification, experience_years, slot_duration,
    working_hours_start, working_hours_end, working_days, bio, fee } = req.body;

  const targetUserId = req.user.role === 'admin' ? user_id : req.user.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(targetUserId, 'doctor');
  if (!user) return res.status(400).json({ error: 'Doctor user not found' });

  const existing = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(targetUserId);
  if (existing) return res.status(400).json({ error: 'Profile already exists' });

  const id = uuidv4();
  db.prepare(`INSERT INTO doctors (id, user_id, specialization, qualification, experience_years,
    slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, targetUserId, specialization, qualification || '', experience_years || 0,
      slot_duration || 30, working_hours_start || '09:00', working_hours_end || '17:00',
      working_days || '1,2,3,4,5', bio || '', fee || 500);

  res.json({ id, message: 'Doctor profile created' });
});

// Update doctor profile
router.put('/profile', auth(['admin', 'doctor']), (req, res) => {
  const { specialization, qualification, experience_years, slot_duration,
    working_hours_start, working_hours_end, working_days, bio, fee } = req.body;

  const doctor = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(req.user.id);
  if (!doctor) return res.status(404).json({ error: 'Profile not found' });

  db.prepare(`UPDATE doctors SET specialization=?, qualification=?, experience_years=?,
    slot_duration=?, working_hours_start=?, working_hours_end=?, working_days=?, bio=?, fee=?
    WHERE user_id=?`)
    .run(specialization, qualification, experience_years, slot_duration,
      working_hours_start, working_hours_end, working_days, bio, fee, req.user.id);

  res.json({ message: 'Profile updated' });
});

// Add leave date
router.post('/:id/leave', auth(['admin', 'doctor']), async (req, res) => {
  const { leave_date, reason } = req.body;
  const doctorId = req.params.id;

  // Verify ownership
  if (req.user.role === 'doctor') {
    const doctor = db.prepare('SELECT * FROM doctors WHERE id = ? AND user_id = ?').get(doctorId, req.user.id);
    if (!doctor) return res.status(403).json({ error: 'Access denied' });
  }

  try {
    db.prepare('INSERT OR IGNORE INTO leave_dates (id, doctor_id, leave_date, reason) VALUES (?,?,?,?)')
      .run(uuidv4(), doctorId, leave_date, reason || '');

    // Notify affected patients
    const affected = db.prepare(`
      SELECT a.*, u.email AS patient_email, u.name AS patient_name,
             du.name AS doctor_name
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      WHERE a.doctor_id = ? AND a.appointment_date = ? AND a.status = 'confirmed'
    `).all(doctorId, leave_date);

    for (const appt of affected) {
      db.prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?").run(appt.id);
      const html = cancellationHtml(appt.patient_name, appt, appt.doctor_name, appt.patient_name,
        `Dr. ${appt.doctor_name} is on leave on ${leave_date}. Please rebook.`);
      await sendEmail(appt.patient_email, 'Appointment Cancelled - Doctor on Leave', html);
    }

    res.json({ message: 'Leave added', affected_appointments: affected.length });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Leave already marked for this date' });
    res.status(500).json({ error: 'Failed to add leave' });
  }
});

// Get leave dates for a doctor
router.get('/:id/leave', (req, res) => {
  const leaves = db.prepare('SELECT * FROM leave_dates WHERE doctor_id = ? ORDER BY leave_date').all(req.params.id);
  res.json(leaves);
});

// Delete leave date
router.delete('/:id/leave/:leaveId', auth(['admin', 'doctor']), (req, res) => {
  db.prepare('DELETE FROM leave_dates WHERE id = ? AND doctor_id = ?').run(req.params.leaveId, req.params.id);
  res.json({ message: 'Leave removed' });
});

// Get specializations list
router.get('/meta/specializations', (req, res) => {
  const specs = db.prepare('SELECT DISTINCT specialization FROM doctors').all().map(d => d.specialization);
  res.json(specs);
});

module.exports = router;
