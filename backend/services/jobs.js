const cron = require('node-cron');
const db = require('../db/database');
const { sendEmail, medicationReminderHtml } = require('./emailService');

// Medication reminders - runs every day at 8 AM
function startMedicationReminders() {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running medication reminder job...');
    const today = new Date().toISOString().split('T')[0];

    const medications = db.prepare(`
      SELECT m.*, u.email, u.name
      FROM medications m
      JOIN users u ON m.patient_id = u.id
      WHERE m.start_date <= ? AND (
        m.duration_days IS NULL OR
        date(m.start_date, '+' || m.duration_days || ' days') >= ?
      )
      AND (m.last_reminded_at IS NULL OR date(m.last_reminded_at) < ?)
    `).all(today, today, today);

    // Group by patient
    const byPatient = {};
    for (const med of medications) {
      if (!byPatient[med.patient_id]) {
        byPatient[med.patient_id] = { email: med.email, name: med.name, meds: [] };
      }
      byPatient[med.patient_id].meds.push(med);
    }

    for (const [patientId, data] of Object.entries(byPatient)) {
      const html = medicationReminderHtml(data.name, data.meds);
      const sent = await sendEmail(data.email, '💊 Daily Medication Reminder', html);
      if (sent) {
        db.prepare("UPDATE medications SET last_reminded_at = CURRENT_TIMESTAMP WHERE patient_id = ? AND date(start_date) <= ? AND (duration_days IS NULL OR date(start_date, '+' || duration_days || ' days') >= ?)")
          .run(patientId, today, today);
      }
    }

    console.log(`✅ Sent reminders to ${Object.keys(byPatient).length} patients`);
  });
}

// Appointment reminders - runs every hour
function startAppointmentReminders() {
  cron.schedule('0 * * * *', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const upcoming = db.prepare(`
      SELECT a.*, u.email AS patient_email, u.name AS patient_name,
             du.name AS doctor_name, d.specialization
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users du ON d.user_id = du.id
      WHERE a.appointment_date = ? AND a.status = 'confirmed'
    `).all(tomorrow);

    for (const appt of upcoming) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9fafb;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px;text-align:center">
            <h2 style="color:white;margin:0">🔔 Appointment Tomorrow</h2>
          </div>
          <div style="padding:24px">
            <p>Dear <strong>${appt.patient_name}</strong>,</p>
            <p>Reminder: You have an appointment with <strong>Dr. ${appt.doctor_name}</strong> (${appt.specialization}) tomorrow at <strong>${appt.slot_time}</strong>.</p>
            <p style="color:#6b7280;font-size:13px">Please arrive 10 minutes early and bring any previous medical reports.</p>
          </div>
        </div>`;
      await sendEmail(appt.patient_email, '🔔 Appointment Reminder - Tomorrow', html);
    }
  });
}

// Email retry job - runs every 30 minutes
function startEmailRetry() {
  cron.schedule('*/30 * * * *', async () => {
    const failed = db.prepare("SELECT * FROM email_queue WHERE status = 'failed' AND attempts < 3").all();
    for (const email of failed) {
      await sendEmail(email.to_email, email.subject, email.html);
    }
  });
}

// Clean expired holds - runs every minute
function startHoldCleanup() {
  cron.schedule('* * * * *', () => {
    db.prepare("DELETE FROM appointments WHERE status = 'pending' AND hold_until < datetime('now')").run();
  });
}

function startAllJobs() {
  startMedicationReminders();
  startAppointmentReminders();
  startEmailRetry();
  startHoldCleanup();
  console.log('🔄 Background jobs started');
}

module.exports = { startAllJobs };
