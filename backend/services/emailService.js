const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail(to, subject, html) {
  // Queue it first
  const id = uuidv4();
  db.prepare(`INSERT INTO email_queue (id, to_email, subject, html) VALUES (?,?,?,?)`)
    .run(id, to, subject, html);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'Healthcare App <noreply@healthcare.app>',
      to,
      subject,
      html,
    });
    db.prepare(`UPDATE email_queue SET status='sent' WHERE id=?`).run(id);
    return true;
  } catch (err) {
    db.prepare(`UPDATE email_queue SET status='failed', attempts=attempts+1, last_attempt=CURRENT_TIMESTAMP WHERE id=?`).run(id);
    console.error('Email error:', err.message);
    return false;
  }
}

function bookingConfirmationHtml(recipientName, appointment, doctorName, patientName, role) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9fafb;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">🏥 Appointment Confirmed</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#374151">Dear <strong>${recipientName}</strong>,</p>
      <p style="color:#374151">Your appointment has been ${appointment.status === 'confirmed' ? 'confirmed' : 'booked'}.</p>
      <div style="background:white;border-radius:8px;padding:20px;border:1px solid #e5e7eb;margin:20px 0">
        <table style="width:100%">
          <tr><td style="color:#6b7280;padding:6px 0">Patient</td><td style="color:#111827;font-weight:600">${patientName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Doctor</td><td style="color:#111827;font-weight:600">Dr. ${doctorName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Date</td><td style="color:#111827;font-weight:600">${appointment.appointment_date}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Time</td><td style="color:#111827;font-weight:600">${appointment.slot_time}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Status</td><td><span style="background:#d1fae5;color:#065f46;padding:2px 10px;border-radius:20px;font-size:13px">Confirmed</span></td></tr>
        </table>
      </div>
      <p style="color:#6b7280;font-size:13px">Please arrive 10 minutes early. If you need to cancel, do so at least 2 hours before.</p>
    </div>
    <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af">Healthcare Appointment Manager</div>
  </div>`;
}

function cancellationHtml(recipientName, appointment, doctorName, patientName, reason) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9fafb;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">⚠️ Appointment Cancelled</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#374151">Dear <strong>${recipientName}</strong>,</p>
      <p style="color:#374151">Your appointment has been cancelled.</p>
      <div style="background:white;border-radius:8px;padding:20px;border:1px solid #e5e7eb;margin:20px 0">
        <table style="width:100%">
          <tr><td style="color:#6b7280;padding:6px 0">Patient</td><td style="color:#111827;font-weight:600">${patientName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Doctor</td><td style="color:#111827;font-weight:600">Dr. ${doctorName}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Date</td><td style="color:#111827;font-weight:600">${appointment.appointment_date}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Time</td><td style="color:#111827;font-weight:600">${appointment.slot_time}</td></tr>
          ${reason ? `<tr><td style="color:#6b7280;padding:6px 0">Reason</td><td style="color:#111827">${reason}</td></tr>` : ''}
        </table>
      </div>
    </div>
    <div style="background:#f3f4f6;padding:16px;text-align:center;font-size:12px;color:#9ca3af">Healthcare Appointment Manager</div>
  </div>`;
}

function medicationReminderHtml(patientName, medications) {
  const medList = medications.map(m =>
    `<tr><td style="padding:8px;color:#111827">${m.medicine_name}</td><td style="padding:8px;color:#6b7280">${m.dosage}</td><td style="padding:8px;color:#6b7280">${m.frequency}</td></tr>`
  ).join('');
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f9fafb;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#10b981,#0ea5e9);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">💊 Medication Reminder</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#374151">Dear <strong>${patientName}</strong>, here are your medications for today:</p>
      <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
        <thead><tr style="background:#f3f4f6"><th style="padding:10px;text-align:left;color:#374151">Medicine</th><th style="padding:10px;text-align:left;color:#374151">Dosage</th><th style="padding:10px;text-align:left;color:#374151">Frequency</th></tr></thead>
        <tbody>${medList}</tbody>
      </table>
      <p style="color:#6b7280;font-size:13px;margin-top:20px">Take your medications on time for a faster recovery. 💪</p>
    </div>
  </div>`;
}

module.exports = { sendEmail, bookingConfirmationHtml, cancellationHtml, medicationReminderHtml };
