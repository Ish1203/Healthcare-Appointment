// Seed script - creates demo accounts (admin, doctor, patient) for quick testing
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/database');

async function seed() {
  console.log('🌱 Seeding database...');

  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get('admin@medibook.com');
  if (existingAdmin) {
    console.log('⚠️  Demo data already exists. Skipping seed.');
    process.exit(0);
  }

  const hashedAdmin = await bcrypt.hash('admin123', 10);
  const hashedDoctor = await bcrypt.hash('doctor123', 10);
  const hashedPatient = await bcrypt.hash('patient123', 10);

  const adminId = uuidv4();
  const doctorUserId = uuidv4();
  const doctorId = uuidv4();
  const patientId = uuidv4();

  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(adminId, 'Admin User', 'admin@medibook.com', hashedAdmin, 'admin', '+91 9000000001');

  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(doctorUserId, 'Sarah Johnson', 'doctor@medibook.com', hashedDoctor, 'doctor', '+91 9000000002');

  db.prepare(`INSERT INTO doctors (id, user_id, specialization, qualification, experience_years,
    slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(doctorId, doctorUserId, 'Cardiology', 'MBBS, MD (Cardiology)', 12, 30, '09:00', '17:00', '1,2,3,4,5',
      'Dr. Sarah Johnson is a board-certified cardiologist with over 12 years of experience in treating heart conditions.', 800);

  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(patientId, 'John Patient', 'patient@medibook.com', hashedPatient, 'patient', '+91 9000000003');

  // A second doctor for variety
  const doctor2UserId = uuidv4();
  const doctor2Id = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(doctor2UserId, 'Raj Mehta', 'raj.mehta@medibook.com', hashedDoctor, 'doctor', '+91 9000000004');
  db.prepare(`INSERT INTO doctors (id, user_id, specialization, qualification, experience_years,
    slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(doctor2Id, doctor2UserId, 'General Medicine', 'MBBS', 8, 20, '10:00', '18:00', '1,2,3,4,5,6',
      'Dr. Raj Mehta specializes in general medicine and family healthcare.', 400);

  console.log('✅ Seed complete!\n');
  console.log('Demo Accounts:');
  console.log('  Admin:   admin@medibook.com   / admin123');
  console.log('  Doctor:  doctor@medibook.com  / doctor123  (Dr. Sarah Johnson - Cardiology)');
  console.log('  Doctor:  raj.mehta@medibook.com / doctor123 (Dr. Raj Mehta - General Medicine)');
  console.log('  Patient: patient@medibook.com / patient123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
