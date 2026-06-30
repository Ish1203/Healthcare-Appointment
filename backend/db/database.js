const { Database } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './db/healthcare.db';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const rawDb = new Database(DB_PATH);
rawDb.exec('PRAGMA foreign_keys = ON');

// --- better-sqlite3-compatible shim --------------------------------------
// Routes throughout this app use the better-sqlite3 style:
//   db.prepare(sql).run(...args)
//   db.prepare(sql).get(...args)
//   db.prepare(sql).all(...args)
//   db.transaction(fn)()
// node-sqlite3-wasm exposes db.run(sql, values), db.get(sql, values), db.all(sql, values)
// instead, so this shim adapts the call shape without touching any route file.

function prepare(sql) {
  return {
    run: (...args) => rawDb.run(sql, args),
    get: (...args) => rawDb.get(sql, args),
    all: (...args) => rawDb.all(sql, args),
  };
}

function transaction(fn) {
  return (...args) => {
    rawDb.exec('BEGIN');
    try {
      const result = fn(...args);
      rawDb.exec('COMMIT');
      return result;
    } catch (err) {
      rawDb.exec('ROLLBACK');
      throw err;
    }
  };
}

function pragma(stmt) {
  rawDb.exec(`PRAGMA ${stmt}`);
}

const db = { prepare, transaction, pragma, exec: (sql) => rawDb.exec(sql) };

// --- Schema ---------------------------------------------------------------
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('patient','doctor','admin')),
      phone TEXT,
      google_tokens TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      specialization TEXT NOT NULL,
      qualification TEXT,
      experience_years INTEGER DEFAULT 0,
      slot_duration INTEGER DEFAULT 30,
      working_hours_start TEXT DEFAULT '09:00',
      working_hours_end TEXT DEFAULT '17:00',
      working_days TEXT DEFAULT '1,2,3,4,5',
      bio TEXT,
      fee REAL DEFAULT 500,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leave_dates (
      id TEXT PRIMARY KEY,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      leave_date TEXT NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(doctor_id, leave_date)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES users(id),
      doctor_id TEXT NOT NULL REFERENCES doctors(id),
      appointment_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled','rescheduled')),
      symptoms TEXT,
      pre_visit_summary TEXT,
      urgency_level TEXT CHECK(urgency_level IN ('Low','Medium','High')),
      post_visit_notes TEXT,
      post_visit_summary TEXT,
      prescription TEXT,
      google_event_id_patient TEXT,
      google_event_id_doctor TEXT,
      hold_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES users(id),
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      duration_days INTEGER,
      start_date TEXT,
      last_reminded_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS email_queue (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      html TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      last_attempt DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Database initialized');
}

initDB();
module.exports = db;
