# System Design Write-up — MediBook Healthcare Appointment Manager

## 1. Double-Booking Prevention

The core risk is two patients booking the same doctor/date/slot simultaneously. This is solved with a **two-phase booking flow** plus a **database-level atomic check**.

**Phase 1 — Hold:** When a patient selects a slot, `POST /appointments/hold` runs inside a SQLite transaction (`db.transaction(...)`). Inside that transaction it queries for any existing appointment on that `doctor_id + appointment_date + slot_time` that is not cancelled and whose hold (if any) hasn't expired. If none exists, it inserts a new row with `status='pending'` and `hold_until = now + 5 minutes`. Because SQLite serializes writes and the check-then-insert happens inside one transaction, two simultaneous requests for the same slot cannot both pass the check — the second request's transaction will see the first's insert (or block until it commits) and correctly return a 409 conflict.

**Phase 2 — Confirm:** The patient then fills the symptom form and calls `POST /appointments/:id/confirm`, which flips status to `confirmed`. If they abandon the flow, a cron job (`startHoldCleanup`, runs every minute) deletes expired `pending` rows, freeing the slot automatically — no manual cleanup needed and no permanently "stuck" holds.

This means the slot is only genuinely reserved for 5 minutes during checkout, preventing both double-booking and indefinite slot-squatting.

## 2. Doctor Leave Conflict Handling

When an admin or doctor marks a leave date (`POST /doctors/:id/leave`), the leave row is inserted first (its `UNIQUE(doctor_id, leave_date)` constraint prevents duplicate leave entries). The same request then queries all `confirmed` appointments for that doctor on that date, cancels each one (`status='cancelled'`), and sends a cancellation email to every affected patient explaining the doctor is on leave and inviting them to rebook. This is done synchronously in the same request so the admin/doctor gets immediate feedback on how many patients were affected (`affected_appointments` count in the response), rather than this happening invisibly in the background.

Leave dates also block future bookings: `GET /doctors/:id/slots?date=` checks the `leave_dates` table before generating any slots, returning `available: false` with a reason, so the UI never shows bookable slots for a leave day in the first place.

## 3. Slot Hold Mechanism

As described above, the hold uses the *same `appointments` table* rather than a separate "locks" table — a pending row functions as the lock. This avoids the complexity of a secondary reservation system getting out of sync with the appointments table, at the cost of slightly noisier query filters (`status != 'cancelled' AND (hold_until IS NULL OR hold_until > now)`). The 5-minute window is short enough to avoid wasting slot inventory but long enough for a patient to comfortably type out symptoms before confirming.

## 4. Notification Failure Handling

Every outbound email goes through `sendEmail()` in `emailService.js`, which **always writes to an `email_queue` table first** (status: pending → sent/failed) before attempting delivery via Nodemailer. If the SMTP call throws (bad credentials, provider downtime, rate limiting), the row is marked `failed` with an incremented `attempts` counter, but the **HTTP request to the user never fails because of it** — booking, cancellation, and visit-completion endpoints call `sendEmail()` without awaiting it block the response, or wrap it in try/catch so email problems never break the core workflow (a graceful-degradation principle applied consistently, mirroring how LLM failures are handled).

A cron job (`startEmailRetry`, every 30 minutes) re-attempts any `failed` email with `attempts < 3`, giving transient outages (e.g., a brief SMTP rate limit) a chance to self-heal without manual intervention. Appointment and medication reminder jobs also reuse this same queue/retry path, so all email types benefit from the same reliability layer.

## 5. LLM Integration & Failure Handling

Both LLM calls (pre-visit and post-visit summaries) request strict JSON output and are parsed defensively (`response.replace(/```json|```/g,'').trim()` then `JSON.parse`). If the API call fails entirely (network error, invalid key, rate limit) or returns malformed JSON, the service catches the error and returns a hard-coded safe fallback object (e.g., urgency defaults to "Medium", a generic chief complaint, and three generic clarifying questions) instead of throwing. This guarantees the booking/visit-completion flow **always completes successfully** even if Claude is unavailable — the appointment is still booked, the doctor still gets a usable starting point, and the patient still receives *a* summary, just a more generic one, clearly flagged by `success: false` in the stored JSON for later auditing/reprocessing if needed.

## 6. Database Schema Rationale

SQLite (via `better-sqlite3`, synchronous and transactional) was chosen for zero-setup local development and straightforward grading/review, while keeping the schema relational and normalized (separate `users`, `doctors`, `appointments`, `medications`, `leave_dates` tables with foreign keys) so a swap to Postgres would require minimal query changes if horizontal scaling were ever needed.
