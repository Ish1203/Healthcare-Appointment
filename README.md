# 🏥 MediBook — Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with dedicated portals for **patients**, **doctors**, and **admins**. Patients describe their symptoms when booking, an AI model generates a structured pre-visit summary for the doctor, the doctor records notes and a prescription, and the AI converts that into a patient-friendly post-visit summary. Both parties stay in sync through automated email notifications and Google Calendar sync.

---

## ✨ Features

- **Role-based portals** — separate dashboards and permissions for patients, doctors, and admins
- **Doctor discovery** — search and filter doctors by specialization
- **Smart booking flow** — real-time slot availability, a short-lived slot hold to prevent double-booking, and a guided 3-step booking experience
- **AI pre-visit summary** — patient symptoms are analyzed to produce an urgency level (Low/Medium/High), a chief complaint, and suggested questions for the doctor
- **AI post-visit summary** — doctor's clinical notes and prescription are converted into a clear, patient-friendly summary with a medication schedule and follow-up steps
- **Leave management** — doctors/admins can mark leave dates; any affected patients are automatically notified and their appointments cancelled
- **Email notifications** — booking confirmations, cancellations, post-visit summaries, day-before reminders, and daily medication reminders, all with automatic retry on failure
- **Google Calendar sync** — appointments are created, updated, and deleted on both the patient's and doctor's calendar via OAuth 2.0
- **Admin dashboard** — clinic-wide stats and full doctor profile management

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Axios |
| Backend | Node.js, Express |
| Database | SQLite (WASM, zero native build dependencies) |
| Auth | JWT + bcrypt |
| AI | Groq API (Llama 3.3) |
| Email | Nodemailer (any SMTP provider) |
| Calendar | Google Calendar API (OAuth 2.0) |
| Scheduling | node-cron for background jobs |

---

## 📁 Project Structure

```
healthcare-app/
├── backend/
│   ├── db/             # database schema and connection
│   ├── middleware/      # auth middleware
│   ├── routes/           # API endpoints
│   ├── services/         # email, AI, calendar, background jobs
│   ├── seed.js            # demo data
│   └── server.js
├── frontend/
│   └── src/
│       ├── pages/         # all screens
│       ├── components/     # shared UI (layout, etc.)
│       ├── context/        # auth state
│       └── utils/          # API client
├── SYSTEM_DESIGN.md
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) v18 or higher
- A free [Groq API key](https://console.groq.com) for AI summaries
- A Gmail account (or any SMTP provider) for sending emails
- *(Optional)* A Google Cloud project for Calendar sync

### 1. Clone the repository
```bash
git clone https://github.com/Ish1203/Healthcare-Appointment.git
cd Healthcare-Appointment
```

### 2. Backend setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder (copy from `.env.example`) and fill in your values:
```env
PORT=5000
JWT_SECRET=any_long_random_string

DB_PATH=./db/healthcare.db

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Healthcare App <your_email@gmail.com>

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/callback

FRONTEND_URL=http://localhost:3000
```

Seed demo accounts and start the server:
```bash
node seed.js
npm run dev
```
The API runs at `http://localhost:5000`. Visiting `/` directly will show "Cannot GET /" — that's expected, since it's an API-only server. Check `http://localhost:5000/api/health` to confirm it's running.

### 3. Frontend setup
In a new terminal:
```bash
cd frontend
npm install
npm start
```
The app opens at `http://localhost:3000` and talks to the backend automatically in development.

### 4. Try it out
Demo accounts (also shown on the login screen):

| Role | Email | Password |
|---|---|---|
| Admin | admin@medibook.com | admin123 |
| Doctor | doctor@medibook.com | doctor123 |
| Doctor 2 | raj.mehta@medibook.com | doctor123 |
| Patient | patient@medibook.com | patient123 |

---

## 🔑 Getting Your API Keys

**Groq (AI summaries)** — free, no credit card required
1. Go to [console.groq.com](https://console.groq.com) and sign up
2. API Keys → Create API Key → copy it into `GROQ_API_KEY`

**Gmail App Password (for sending emails)**
1. Enable 2-Step Verification on your Google Account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate a password for "Mail" and use the 16-character code as `EMAIL_PASS` (not your normal password)

**Google Calendar OAuth (optional)**
1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Calendar API**
3. Configure the OAuth consent screen (External, add yourself as a test user)
4. Create an OAuth Client ID (Web application) with redirect URI `http://localhost:5000/api/calendar/callback`
5. Copy the Client ID and Secret into your `.env`

> The app works fully without Google Calendar configured — it simply skips calendar sync if credentials are missing.

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a patient or doctor |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/doctors` | List/search doctors |
| GET | `/api/doctors/:id/slots?date=` | Available slots for a date |
| POST | `/api/doctors/:id/leave` | Mark a leave date (notifies affected patients) |
| POST | `/api/appointments/hold` | Reserve a slot (5-minute hold) |
| POST | `/api/appointments/:id/confirm` | Submit symptoms, generate AI summary, confirm booking |
| PUT | `/api/appointments/:id/post-visit` | Doctor submits notes, generates patient summary |
| PUT | `/api/appointments/:id/cancel` | Cancel an appointment |
| PUT | `/api/appointments/:id/reschedule` | Move to a new slot |
| GET | `/api/admin/stats` | Admin dashboard statistics |
| GET | `/api/calendar/auth-url` | Start Google Calendar OAuth flow |

---

## 🌐 Deployment

**Backend** — deploy the `backend/` folder to a Node host such as [Render](https://render.com):
- Build command: `npm install`
- Start command: `npm start`
- Add all environment variables from your `.env`
- Run `node seed.js` once via the host's shell to seed demo data

**Frontend** — deploy the `frontend/` folder to [Vercel](https://vercel.com) or [Netlify](https://netlify.com):
- Set environment variable `REACT_APP_API_URL` to your deployed backend URL + `/api`

After deploying, update `FRONTEND_URL` in the backend's environment variables to your live frontend URL, and (if using Calendar) add the production redirect URI in Google Cloud Console.

---

## 📄 Additional Documentation

See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for the technical write-up covering double-booking prevention, doctor leave conflict handling, the slot hold mechanism, and notification failure handling.

---

## 📜 License

This project was built as part of a technical assignment and is provided as-is for evaluation purposes.