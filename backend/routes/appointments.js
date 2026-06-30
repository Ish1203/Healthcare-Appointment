const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const auth = require('../middleware/auth');
const { sendEmail, bookingConfirmationHtml, cancellationHtml } = require('../services/emailService');
const { generatePreVisitSummary, generatePostVisitSummary } = require('../services/llmService');
const { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } = require('../services/calendarService');

const HOLD_DURATION_SECONDS = 300; // 5 min slot hold

// Hold a slot (before symptom form)
router.post('/hold', auth(['patient']), (req, res) => {
  const { doctor_id, appointment_date, slot_time } = req.body;
  if (!doctor_id || !appointment_date || !slot_time) {
    return res.status(400).json({ error: 'doctor_id, appointment_date, slot_time required' });
  }

  // Atomic check + hold using SQLite transaction
  const result = db.transaction(() => {
    // Check for existing confirmed or held appointments in this slot
    const conflict = db.prepare(`
      SELECT id FROM appointments
      WHERE doctor_id = ? AND appointment_date = ? AND slot_time = ?
      AND status NOT IN ('cancelled')
      AND (hold_until IS NULL OR hold_until > datetime('now'))
    `).get(doctor_id, appointment_date, slot_time);

    if (conflict) return { error: 'Slot already taken or held' };

    // Check leave
    const onLeave = db.prepare('SELECT id FROM leave_dates WHERE doctor_id = ? AND leave_date = ?').get(doctor_id, appointment_date);
    if (onLeave) return { error: 'Doctor is on leave on this date' };

    const id = uuidv4();
    const holdUntil = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000).toISOString();
    db.prepare(`INSERT INTO appointments (id, patient_id, doctor_id, appointment_date, slot_time, status, hold_until)
      VALUES (?,?,?,?,?,'pending',?)`)
      .run(id, req.user.id, doctor_id, appointment_date, slot_time, holdUntil);

    return { id, hold_until: holdUntil };
  })();

  if (result.error) return res.status(409).json({ error: result.error });
  res.json(result);
});

// Confirm appointment with symptoms
router.post('/:id/confirm', auth(['patient']), async (req, res) => {
  const { symptoms } = req.body;
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id);

  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.status !== 'pending') return res.status(400).json({ error: 'Appointment not in pending state' });
  if (new Date(appt.hold_until) < new Date()) return res.status(400).json({ error: 'Hold expired, please rebook' });

  // Generate pre-visit summary via LLM
  let preVisitSummary = null;
  let urgencyLevel = 'Medium';
  if (symptoms) {
    const llmResult = await generatePreVisitSummary(symptoms);
    urgencyLevel = llmResult.urgency_level;
    preVisitSummary = JSON.stringify({
      chief_complaint: llmResult.chief_complaint,
      suggested_questions: llmResult.suggested_questions,
      urgency_level: llmResult.urgency_level,
    });
  }

  // Update appointment
  db.prepare(`UPDATE appointments SET status='confirmed', symptoms=?, pre_visit_summary=?, urgency_level=?, hold_until=NULL WHERE id=?`)
    .run(symptoms || '', preVisitSummary, urgencyLevel, req.params.id);

  // Get doctor and patient info for emails
  const doctor = db.prepare(`SELECT d.*, u.name, u.email, u.google_tokens FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`).get(appt.doctor_id);
  const patient = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const updatedAppt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);

  // Create Google Calendar events
  let patientEventId = null, doctorEventId = null;
  const eventTitle = `Appointment: ${patient.name} with Dr. ${doctor.name}`;
  const eventDesc = `Appointment confirmed.\nPatient: ${patient.name}\nDoctor: Dr. ${doctor.name}\nDate: ${appt.appointment_date} at ${appt.slot_time}`;

  if (patient.google_tokens) {
    patientEventId = await createCalendarEvent(patient.google_tokens, eventTitle, eventDesc, appt.appointment_date, appt.slot_time, doctor.slot_duration);
  }
  if (doctor.google_tokens) {
    doctorEventId = await createCalendarEvent(doctor.google_tokens, eventTitle, eventDesc, appt.appointment_date, appt.slot_time, doctor.slot_duration);
  }
  if (patientEventId || doctorEventId) {
    db.prepare('UPDATE appointments SET google_event_id_patient=?, google_event_id_doctor=? WHERE id=?')
      .run(patientEventId, doctorEventId, req.params.id);
  }

  // Send emails (non-blocking)
  const patientHtml = bookingConfirmationHtml(patient.name, updatedAppt, doctor.name, patient.name, 'patient');
  const doctorHtml = bookingConfirmationHtml(`Dr. ${doctor.name}`, updatedAppt, doctor.name, patient.name, 'doctor');
  sendEmail(patient.email, 'Appointment Confirmed', patientHtml).catch(console.error);
  sendEmail(doctor.email, 'New Appointment Booked', doctorHtml).catch(console.error);

  res.json({ message: 'Appointment confirmed', urgency_level: urgencyLevel, pre_visit_summary: preVisitSummary });
});

// Get appointments (role-based)
router.get('/', auth(), (req, res) => {
  const { status, date } = req.query;
  let query, params;

  if (req.user.role === 'patient') {
    query = `SELECT a.*, d.specialization, d.fee, du.name AS doctor_name, du.email AS doctor_email
             FROM appointments a JOIN doctors d ON a.doctor_id = d.id JOIN users du ON d.user_id = du.id
             WHERE a.patient_id = ? AND a.status != 'pending'`;
    params = [req.user.id];
  } else if (req.user.role === 'doctor') {
    const doc = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
    if (!doc) return res.json([]);
    query = `SELECT a.*, u.name AS patient_name, u.email AS patient_email, u.phone AS patient_phone
             FROM appointments a JOIN users u ON a.patient_id = u.id
             WHERE a.doctor_id = ? AND a.status != 'pending'`;
    params = [doc.id];
  } else {
    query = `SELECT a.*, u.name AS patient_name, du.name AS doctor_name FROM appointments a
             JOIN users u ON a.patient_id = u.id JOIN doctors d ON a.doctor_id = d.id
             JOIN users du ON d.user_id = du.id WHERE a.status != 'pending'`;
    params = [];
  }

  if (status) { query += ' AND a.status = ?'; params.push(status); }
  if (date) { query += ' AND a.appointment_date = ?'; params.push(date); }
  query += ' ORDER BY a.appointment_date DESC, a.slot_time DESC';

  res.json(db.prepare(query).all(...params));
});

// Get single appointment
router.get('/:id', auth(), (req, res) => {
  const appt = db.prepare(`
    SELECT a.*, u.name AS patient_name, u.email AS patient_email, u.phone AS patient_phone,
           du.name AS doctor_name, du.email AS doctor_email, d.specialization, d.fee, d.slot_duration
    FROM appointments a
    JOIN users u ON a.patient_id = u.id
    JOIN doctors d ON a.doctor_id = d.id
    JOIN users du ON d.user_id = du.id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Not found' });
  res.json(appt);
});

// Doctor submits post-visit notes
router.put('/:id/post-visit', auth(['doctor']), async (req, res) => {
  const { post_visit_notes, prescription } = req.body;
  if (!post_visit_notes) return res.status(400).json({ error: 'Notes required' });

  const doc = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND doctor_id = ?').get(req.params.id, doc?.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  // LLM post-visit summary
  const llmResult = await generatePostVisitSummary(post_visit_notes + (prescription ? `\n\nPrescription: ${prescription}` : ''));

  db.prepare(`UPDATE appointments SET status='completed', post_visit_notes=?, post_visit_summary=?, prescription=? WHERE id=?`)
    .run(post_visit_notes, JSON.stringify(llmResult), prescription || '', req.params.id);

  // Parse and store medications for reminders
  if (llmResult.success && llmResult.medication_schedule?.length) {
    const stmt = db.prepare(`INSERT INTO medications (id, appointment_id, patient_id, medicine_name, dosage, frequency, start_date) VALUES (?,?,?,?,?,?,?)`);
    for (const med of llmResult.medication_schedule) {
      stmt.run(uuidv4(), req.params.id, appt.patient_id, med.medicine, med.dosage || '', med.frequency || 'daily', new Date().toISOString().split('T')[0]);
    }
  }

  // Send post-visit summary to patient
  const patient = db.prepare('SELECT * FROM users WHERE id = ?').get(appt.patient_id);
  const summaryHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#10b981,#6366f1);padding:32px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:white;margin:0">📋 Visit Summary</h1>
      </div>
      <div style="background:#f9fafb;padding:32px;border-radius:0 0 12px 12px">
        <p>Dear <strong>${patient.name}</strong>,</p>
        <p>${llmResult.summary}</p>
        ${llmResult.follow_up_steps?.length ? `<h3>Next Steps</h3><ul>${llmResult.follow_up_steps.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
        ${llmResult.medication_schedule?.length ? `<h3>Medications</h3><ul>${llmResult.medication_schedule.map(m => `<li><strong>${m.medicine}</strong> - ${m.dosage} - ${m.frequency}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`;
  await sendEmail(patient.email, 'Your Visit Summary', summaryHtml);

  res.json({ message: 'Post-visit notes saved', summary: llmResult });
});

// Cancel appointment
router.put('/:id/cancel', auth(), async (req, res) => {
  const { reason } = req.body;
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Not found' });

  // Authorization
  const isPatient = appt.patient_id === req.user.id;
  const doc = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.id);
  const isDoctor = doc && appt.doctor_id === doc.id;
  if (!isPatient && !isDoctor && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });

  db.prepare("UPDATE appointments SET status='cancelled' WHERE id=?").run(req.params.id);

  // Delete calendar events
  const patient = db.prepare('SELECT * FROM users WHERE id = ?').get(appt.patient_id);
  const doctor = db.prepare(`SELECT d.*, u.name, u.email, u.google_tokens FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`).get(appt.doctor_id);

  if (appt.google_event_id_patient && patient?.google_tokens) {
    deleteCalendarEvent(patient.google_tokens, appt.google_event_id_patient).catch(console.error);
  }
  if (appt.google_event_id_doctor && doctor?.google_tokens) {
    deleteCalendarEvent(doctor.google_tokens, appt.google_event_id_doctor).catch(console.error);
  }

  // Send cancellation emails
  const cancelHtml = cancellationHtml(patient.name, appt, doctor.name, patient.name, reason);
  sendEmail(patient.email, 'Appointment Cancelled', cancelHtml).catch(console.error);
  sendEmail(doctor.email, 'Appointment Cancelled', cancellationHtml(`Dr. ${doctor.name}`, appt, doctor.name, patient.name, reason)).catch(console.error);

  res.json({ message: 'Appointment cancelled' });
});

// Reschedule
router.put('/:id/reschedule', auth(['patient']), async (req, res) => {
  const { new_date, new_slot } = req.body;
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ? AND patient_id = ?').get(req.params.id, req.user.id);
  if (!appt) return res.status(404).json({ error: 'Not found' });
  if (!['confirmed', 'pending'].includes(appt.status)) return res.status(400).json({ error: 'Cannot reschedule' });

  // Check new slot availability
  const conflict = db.prepare(`
    SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND slot_time = ?
    AND status NOT IN ('cancelled') AND id != ?
  `).get(appt.doctor_id, new_date, new_slot, req.params.id);
  if (conflict) return res.status(409).json({ error: 'New slot not available' });

  db.prepare("UPDATE appointments SET appointment_date=?, slot_time=?, status='confirmed' WHERE id=?")
    .run(new_date, new_slot, req.params.id);

  // Update calendar events
  const patient = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const doctor = db.prepare(`SELECT d.*, u.name, u.google_tokens FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?`).get(appt.doctor_id);
  const eventTitle = `Appointment: ${patient.name} with Dr. ${doctor.name}`;

  if (appt.google_event_id_patient && patient?.google_tokens) {
    updateCalendarEvent(patient.google_tokens, appt.google_event_id_patient, eventTitle, '', new_date, new_slot, doctor.slot_duration).catch(console.error);
  }
  if (appt.google_event_id_doctor && doctor?.google_tokens) {
    updateCalendarEvent(doctor.google_tokens, appt.google_event_id_doctor, eventTitle, '', new_date, new_slot, doctor.slot_duration).catch(console.error);
  }

  res.json({ message: 'Appointment rescheduled' });
});

module.exports = router;
