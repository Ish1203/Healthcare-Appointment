# 🏥 MediBook — Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with separate portals for **patients**, **doctors**, and **admins**. Patients book appointments and describe symptoms, an LLM generates a pre-visit summary for the doctor, the doctor submits notes/prescription, and an LLM converts that into a patient-friendly post-visit summary. Both sides are kept in sync via **email** and **Google Calendar**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Axios, Lucide Icons |
| Backend | Node.js, Express |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT + bcrypt, role-based (patient / doctor / admin) |
| LLM | Anthropic Claude API (pre-visit & post-visit summaries) |
| Email | Nodemailer (SMTP — Gmail/SendGrid/Mailgun compatible) |
| Calendar | Google Calendar API (OAuth 2.0) |
| Background Jobs | node-cron (medication reminders, appointment reminders, email retries, hold cleanup) |

---

## Project Structure

```
healthcare-app/
├── backend/
│   ├── db/database.js          # SQLite schema + connection
│   ├── middleware/auth.js      # JWT auth + role guard
│   ├── routes/                 # auth, doctors, appointments, admin, calendar, notifications
│   ├── services/               # email, llm, calendar, background jobs
│   ├── seed.js                 # demo data seeder
│   ├── server.js               # entry point
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/               # Login, Register, Dashboard, Doctors, Booking, etc.
│   │   ├── components/Layout.js # sidebar shell
│   │   ├── context/AuthContext.js
│   │   └── utils/api.js
│   └── .env.example
├── SYSTEM_DESIGN.md
└── README.md
```

---

## 1. Local Setup (VS Code)

### Prerequisites
- Node.js ≥ 18 ([nodejs.org](https://nodejs.org))
- Git
- A free [Anthropic API key](https://console.anthropic.com) (for AI summaries)
- A Gmail account (or any SMTP provider) for sending emails
- (Optional but recommended) A Google Cloud project for Calendar sync

### Step 1 — Clone & open in VS Code
```bash
git clone <your-repo-url>
cd healthcare-app
code .
```

### Step 2 — Backend setup
```bash
cd backend
npm install
cp .env.example .env
```
Open `.env` and fill in the values (see [Configuration](#3-configuration-env-values) below).

Seed demo accounts (admin/doctor/patient) and initialize the DB:
```bash
node seed.js
```

Start the backend (runs on `http://localhost:5000`):
```bash
npm run dev
```

### Step 3 — Frontend setup
Open a **second terminal**:
```bash
cd frontend
npm install
cp .env.example .env
npm start
```
The app opens at `http://localhost:3000` and proxies API calls to the backend automatically.

### Step 4 — Log in
Use the demo accounts (also shown on the login screen):

| Role | Email | Password |
|---|---|---|
| Admin | admin@medibook.com | admin123 |
| Doctor | doctor@medibook.com | doctor123 |
| Doctor 2 | raj.mehta@medibook.com | doctor123 |
| Patient | patient@medibook.com | patient123 |

---

## 2. Core Features Implemented

- **Auth**: JWT-based, role-based (patient / doctor / admin), bcrypt password hashing
- **Admin**: create/edit/delete doctor profiles (specialization, hours, slot duration, fee, working days)
- **Patient**: register, search doctors by specialization/name, view available slots, book
- **Slot hold mechanism**: selecting a slot creates a 5-minute "hold" (`status='pending'`, `hold_until` timestamp) so two patients can't double-book the same slot while one is mid-checkout. A cron job purges expired holds every minute.
- **Double-booking prevention**: booking confirmation runs inside a SQLite transaction that re-checks for conflicts atomically before insert.
- **Doctor leave**: marking a leave date cancels affected confirmed appointments and emails those patients automatically.
- **LLM pre-visit summary**: patient's symptom text → Claude returns urgency (Low/Medium/High), chief complaint, 3 suggested questions for the doctor.
- **LLM post-visit summary**: doctor's clinical notes + prescription → Claude returns a patient-friendly explanation, medication schedule, and follow-up steps. Stored in DB and emailed to the patient.
- **Medication reminders**: parsed medication schedule is stored in a `medications` table; a daily cron job emails reminders while the prescription is active.
- **Email notifications**: booking confirmation, cancellation, post-visit summary, daily medication reminders, day-before appointment reminders — all via Nodemailer, queued in an `email_queue` table with automatic retry (every 30 min, up to 3 attempts) on failure.
- **Google Calendar sync**: OAuth 2.0 per-user; on booking, an event is created on both the patient's and doctor's calendar; on cancel/reschedule, it's deleted/updated.
- **Graceful LLM failure handling**: if the Claude API call fails or returns invalid JSON, the system falls back to a safe default response and still allows booking/visit completion — it never blocks the user flow.

---

## 3. Configuration (`.env` values)

### Backend `.env`
```env
PORT=5000
JWT_SECRET=any_long_random_string

DB_PATH=./db/healthcare.db

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password   # NOT your normal Gmail password
EMAIL_FROM=Healthcare App <your_email@gmail.com>

ANTHROPIC_API_KEY=sk-ant-...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback

FRONTEND_URL=http://localhost:3000
```

**Getting a Gmail App Password:** Gmail blocks normal password SMTP login. Enable 2-Step Verification on your Google Account → [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → generate a password for "Mail" → paste the 16-character code into `EMAIL_PASS`.

**Getting an Anthropic API key:** [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key.

**Setting up Google Calendar OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. Enable the **Google Calendar API** (APIs & Services → Library).
3. Configure the OAuth consent screen (External, add your email as a test user while in testing mode).
4. Credentials → Create Credentials → OAuth Client ID → Application type: **Web application**.
5. Add Authorized redirect URI: `http://localhost:5000/api/calendar/callback` (and your deployed backend URL + `/api/calendar/callback` for production).
6. Copy the Client ID and Client Secret into `.env`.

> The app works fully without Google Calendar configured — calendar sync is skipped gracefully if credentials are missing.

### Frontend `.env`
```env
REACT_APP_API_URL=
```
Leave blank for local dev (uses the CRA proxy to `localhost:5000`). Set to your deployed backend URL (e.g. `https://your-backend.onrender.com/api`) in production.

---

## 4. Database Schema (SQLite)

- **users** — id, name, email, password (hashed), role, phone, google_tokens
- **doctors** — id, user_id, specialization, qualification, experience_years, slot_duration, working_hours_start/end, working_days (CSV of 0–6), bio, fee
- **leave_dates** — id, doctor_id, leave_date, reason
- **appointments** — id, patient_id, doctor_id, appointment_date, slot_time, status (pending/confirmed/completed/cancelled/rescheduled), symptoms, pre_visit_summary (JSON), urgency_level, post_visit_notes, post_visit_summary (JSON), prescription, google_event_id_patient/doctor, hold_until
- **medications** — id, appointment_id, patient_id, medicine_name, dosage, frequency, start_date, last_reminded_at
- **notifications** — id, user_id, type, message, is_read
- **email_queue** — id, to_email, subject, html, status, attempts (for retry logic)

Full schema lives in `backend/db/database.js`.

---

## 5. API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register patient/doctor |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/doctors` | List doctors (search/filter) |
| GET | `/api/doctors/:id/slots?date=` | Available slots for a date |
| POST | `/api/doctors/:id/leave` | Mark leave (cancels + notifies patients) |
| POST | `/api/appointments/hold` | Reserve a slot (5-min hold) |
| POST | `/api/appointments/:id/confirm` | Submit symptoms → LLM summary → confirm |
| PUT | `/api/appointments/:id/post-visit` | Doctor notes → LLM patient summary |
| PUT | `/api/appointments/:id/cancel` | Cancel (notifies, deletes calendar events) |
| PUT | `/api/appointments/:id/reschedule` | Reschedule to a new slot |
| GET | `/api/admin/stats` | Admin dashboard stats |
| GET | `/api/calendar/auth-url` | Google OAuth consent URL |

---

## 6. LLM Prompts Used

**Pre-visit summary** (in `backend/services/llmService.js`):
> "Analyse these symptoms and return a JSON object with exactly these fields: urgency_level (Low/Medium/High), chief_complaint, suggested_questions (array of 3). Symptoms: `<symptoms>`"

**Post-visit summary**:
> "Convert these clinical notes into a patient-friendly summary. Return JSON with: summary, medication_schedule (array of {medicine, dosage, frequency, instructions}), follow_up_steps (array). Clinical notes: `<notes>`"

Both calls request strict JSON and are parsed defensively; on any failure the system falls back to a safe default rather than crashing.

---

## 7. Deployment

See the step-by-step deployment guide for Render/Vercel/Railway in the chat — summary:

1. **Backend** → deploy `backend/` folder to **Render** (Web Service, Node), add all env vars, note the live URL.
2. **Frontend** → deploy `frontend/` folder to **Vercel**, set `REACT_APP_API_URL` to `<render-backend-url>/api`.
3. Update `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` env vars to the live URLs.
4. Re-add the new redirect URI in Google Cloud Console.

---

## 8. Known Limitations / Notes

- SQLite is used for simplicity and zero external setup; for high-concurrency production use, swap to Postgres (the query layer is small and isolated in `db/database.js` + route files).
- Google Calendar requires the OAuth consent screen to be published (or the user added as a test user) — while in "Testing" mode tokens expire after 7 days.
- Email sending requires real SMTP credentials; without them, emails are queued and marked `failed` but the app continues to function normally.
