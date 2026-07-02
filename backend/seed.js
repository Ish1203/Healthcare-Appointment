const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/database');

async function seed() {
  const existingAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get('admin@medibook.com');
  if (existingAdmin) {
    console.log('⚠️  Demo data already exists. Skipping seed.');
    return false;
  }

  console.log('🌱 Seeding database...');

  const hashedAdmin   = await bcrypt.hash('admin123', 10);
  const hashedDoctor  = await bcrypt.hash('doctor123', 10);
  const hashedPatient = await bcrypt.hash('patient123', 10);

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminId = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(adminId, 'Arjun Sharma', 'admin@medibook.com', hashedAdmin, 'admin', '+91 9811000001');

  // ── Doctor 1 – Cardiology ──────────────────────────────────────────────────
  const doc1UserId = uuidv4();
  const doc1Id     = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(doc1UserId, 'Priya Nair', 'doctor@medibook.com', hashedDoctor, 'doctor', '+91 9811000002');
  db.prepare(`INSERT INTO doctors
    (id, user_id, specialization, qualification, experience_years,
     slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(doc1Id, doc1UserId, 'Cardiology',
      'MBBS, MD (Cardiology), DM (Cardiology)', 12,
      30, '09:00', '17:00', '1,2,3,4,5',
      'Dr. Priya Nair is a senior cardiologist with 12 years of experience at AIIMS Delhi. She specialises in interventional cardiology and heart failure management.',
      800);

  // ── Doctor 2 – General Medicine ────────────────────────────────────────────
  const doc2UserId = uuidv4();
  const doc2Id     = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(doc2UserId, 'Anil Kulkarni', 'anil.kulkarni@medibook.com', hashedDoctor, 'doctor', '+91 9811000003');
  db.prepare(`INSERT INTO doctors
    (id, user_id, specialization, qualification, experience_years,
     slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(doc2Id, doc2UserId, 'General Medicine',
      'MBBS, MD (Internal Medicine)', 8,
      20, '10:00', '18:00', '1,2,3,4,5,6',
      'Dr. Anil Kulkarni is a general physician with 8 years of experience treating common illnesses, chronic conditions, and preventive care for families across all age groups.',
      400);

  // ── Doctor 3 – Pediatrics ──────────────────────────────────────────────────
  const doc3UserId = uuidv4();
  const doc3Id     = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(doc3UserId, 'Sunita Reddy', 'sunita.reddy@medibook.com', hashedDoctor, 'doctor', '+91 9811000004');
  db.prepare(`INSERT INTO doctors
    (id, user_id, specialization, qualification, experience_years,
     slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(doc3Id, doc3UserId, 'Pediatrics',
      'MBBS, MD (Pediatrics)', 10,
      20, '09:00', '16:00', '1,2,3,4,5',
      'Dr. Sunita Reddy is a paediatrician with 10 years of experience in child healthcare, vaccinations, and developmental disorders. She previously served at Hyderabad Children\'s Hospital.',
      600);

  // ── Doctor 4 – Dermatology ─────────────────────────────────────────────────
  const doc4UserId = uuidv4();
  const doc4Id     = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(doc4UserId, 'Vikram Mehta', 'vikram.mehta@medibook.com', hashedDoctor, 'doctor', '+91 9811000005');
  db.prepare(`INSERT INTO doctors
    (id, user_id, specialization, qualification, experience_years,
     slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(doc4Id, doc4UserId, 'Dermatology',
      'MBBS, MD (Dermatology)', 6,
      15, '11:00', '19:00', '1,2,3,4,5',
      'Dr. Vikram Mehta is a dermatologist with expertise in acne, eczema, psoriasis, and cosmetic skin treatments. He trained at Grant Medical College, Mumbai.',
      700);

  // ── Doctor 5 – Orthopedics ─────────────────────────────────────────────────
  const doc5UserId = uuidv4();
  const doc5Id     = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(doc5UserId, 'Kavitha Iyer', 'kavitha.iyer@medibook.com', hashedDoctor, 'doctor', '+91 9811000006');
  db.prepare(`INSERT INTO doctors
    (id, user_id, specialization, qualification, experience_years,
     slot_duration, working_hours_start, working_hours_end, working_days, bio, fee)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(doc5Id, doc5UserId, 'Orthopedics',
      'MBBS, MS (Orthopedics)', 15,
      30, '08:00', '15:00', '1,2,3,4,6',
      'Dr. Kavitha Iyer is an orthopaedic surgeon specialising in joint replacements, sports injuries, and spine disorders with 15 years of surgical experience at CMC Vellore.',
      900);

  // ── Patients ───────────────────────────────────────────────────────────────
  const pat1Id = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(pat1Id, 'Rahul Verma', 'patient@medibook.com', hashedPatient, 'patient', '+91 9911000001');

  const pat2Id = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(pat2Id, 'Neha Gupta', 'neha.gupta@medibook.com', hashedPatient, 'patient', '+91 9911000002');

  const pat3Id = uuidv4();
  db.prepare(`INSERT INTO users (id, name, email, password, role, phone) VALUES (?,?,?,?,?,?)`)
    .run(pat3Id, 'Rohan Joshi', 'rohan.joshi@medibook.com', hashedPatient, 'patient', '+91 9911000003');

  console.log('✅ Seed complete!\n');
  console.log('Demo Accounts:');
  console.log('  Admin:   admin@medibook.com            / admin123  (Arjun Sharma)');
  console.log('  Doctor:  doctor@medibook.com            / doctor123 (Dr. Priya Nair      - Cardiology)');
  console.log('  Doctor:  anil.kulkarni@medibook.com     / doctor123 (Dr. Anil Kulkarni   - General Medicine)');
  console.log('  Doctor:  sunita.reddy@medibook.com      / doctor123 (Dr. Sunita Reddy    - Pediatrics)');
  console.log('  Doctor:  vikram.mehta@medibook.com      / doctor123 (Dr. Vikram Mehta    - Dermatology)');
  console.log('  Doctor:  kavitha.iyer@medibook.com      / doctor123 (Dr. Kavitha Iyer    - Orthopedics)');
  console.log('  Patient: patient@medibook.com           / patient123 (Rahul Verma)');
  console.log('  Patient: neha.gupta@medibook.com        / patient123 (Neha Gupta)');
  console.log('  Patient: rohan.joshi@medibook.com       / patient123 (Rohan Joshi)');
  return true;
}

// Run standalone: node seed.js
if (require.main === module) {
  require('dotenv').config();
  seed()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = seed;
