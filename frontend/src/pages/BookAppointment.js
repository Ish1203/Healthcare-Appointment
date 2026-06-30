import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

const STEPS = ['Select Date & Slot', 'Describe Symptoms', 'Confirmation'];

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [appointmentId, setAppointmentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [holdExpiry, setHoldExpiry] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [summary, setSummary] = useState(null);
  const [slotsInfo, setSlotsInfo] = useState(null);

  useEffect(() => {
    api.get(`/doctors/${doctorId}`).then(r => setDoctor(r.data));
  }, [doctorId]);

  useEffect(() => {
    if (!selectedDate || !doctorId) return;
    setSlotsLoading(true);
    setSelectedSlot('');
    api.get(`/doctors/${doctorId}/slots`, { params: { date: selectedDate } })
      .then(r => { setSlots(r.data.slots || []); setSlotsInfo(r.data); })
      .catch(() => toast.error('Could not fetch slots'))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, doctorId]);

  // Countdown timer for slot hold
  useEffect(() => {
    if (!holdExpiry) return;
    const interval = setInterval(() => {
      const left = Math.floor((new Date(holdExpiry) - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) { clearInterval(interval); toast.error('Hold expired! Please select a new slot.'); setStep(0); setAppointmentId(null); }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiry]);

  const handleHoldSlot = async () => {
    if (!selectedDate || !selectedSlot) return toast.error('Select a date and time slot');
    setLoading(true);
    try {
      const { data } = await api.post('/appointments/hold', { doctor_id: doctorId, appointment_date: selectedDate, slot_time: selectedSlot });
      setAppointmentId(data.id);
      setHoldExpiry(data.hold_until);
      setTimeLeft(300);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Slot not available');
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/appointments/${appointmentId}/confirm`, { symptoms });
      setSummary(data);
      setStep(2);
      toast.success('Appointment booked successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally { setLoading(false); }
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (!doctor) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <a href="/doctors" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>← Back to Doctors</a>
      </div>

      <div className="page-header">
        <h1>Book Appointment</h1>
        <p>with Dr. {doctor.name} · {doctor.specialization}</p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32, position: 'relative' }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 8px', fontWeight: 700, fontSize: 14,
              background: i < step ? '#10b981' : i === step ? '#0ea5e9' : '#e2e8f0',
              color: i <= step ? 'white' : '#94a3b8',
              zIndex: 1, position: 'relative',
            }}>{i < step ? '✓' : i + 1}</div>
            <div style={{ fontSize: 12, color: i === step ? '#0ea5e9' : '#94a3b8', fontWeight: i === step ? 600 : 400 }}>{s}</div>
            {i < STEPS.length - 1 && <div style={{ position: 'absolute', top: 16, left: '50%', width: '100%', height: 2, background: i < step ? '#10b981' : '#e2e8f0' }} />}
          </div>
        ))}
      </div>

      {/* Step 0: Date + Slot */}
      {step === 0 && (
        <div className="card">
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Select Date</label>
              <input className="form-control" type="date" min={minDate} max={maxDate} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
            </div>

            {selectedDate && (
              <div className="form-group">
                <label className="form-label">Available Time Slots</label>
                {slotsLoading
                  ? <div className="loading" style={{ minHeight: 80 }}><div className="spinner" /></div>
                  : slotsInfo && !slotsInfo.available
                    ? <div className="alert alert-error">⚠️ {slotsInfo.reason}</div>
                    : slots.length === 0
                      ? <div className="alert alert-info">No slots available for this date</div>
                      : <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {slots.map(slot => (
                            <button key={slot} onClick={() => setSelectedSlot(slot)} style={{
                              padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                              borderColor: selectedSlot === slot ? '#0ea5e9' : '#e2e8f0',
                              background: selectedSlot === slot ? '#0ea5e9' : 'white',
                              color: selectedSlot === slot ? 'white' : '#374151',
                              cursor: 'pointer', fontWeight: 500, fontSize: 14,
                            }}>
                              <Clock size={12} style={{ marginRight: 4 }} />{slot}
                            </button>
                          ))}
                        </div>
                }
              </div>
            )}

            <button className="btn btn-primary" onClick={handleHoldSlot} disabled={loading || !selectedDate || !selectedSlot} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Reserving slot...' : 'Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Symptoms */}
      {step === 1 && (
        <div className="card">
          <div className="card-body">
            {holdExpiry && (
              <div className="alert" style={{ background: timeLeft < 60 ? '#fee2e2' : '#fef3c7', color: timeLeft < 60 ? '#991b1b' : '#92400e', border: '1px solid' }}>
                <AlertCircle size={14} style={{ marginRight: 6 }} />
                Slot reserved for <strong>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</strong>
              </div>
            )}

            <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 14 }}>
              <strong>📅 {selectedDate}</strong> at <strong>⏰ {selectedSlot}</strong>
              <br /><span style={{ color: '#64748b' }}>Dr. {doctor.name} · ₹{doctor.fee}</span>
            </div>

            <div className="form-group">
              <label className="form-label">Describe Your Symptoms</label>
              <textarea className="form-control" rows={5} placeholder="Please describe what you're experiencing — when it started, how severe, any related symptoms..."
                value={symptoms} onChange={e => setSymptoms(e.target.value)} />
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                💡 Our AI will generate a pre-visit summary for the doctor based on your symptoms
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setStep(0)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
              <button className="btn btn-primary" onClick={handleConfirm} disabled={loading} style={{ flex: 2, justifyContent: 'center' }}>
                {loading ? '⏳ Generating AI Summary...' : '✓ Confirm Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <h2 style={{ marginBottom: 8 }}>Appointment Confirmed!</h2>
            <p style={{ color: '#64748b', marginBottom: 24 }}>You'll receive a confirmation email shortly.</p>

            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 20, textAlign: 'left', marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Doctor', `Dr. ${doctor.name}`],
                  ['Date', selectedDate],
                  ['Time', selectedSlot],
                  ['Fee', `₹${doctor.fee}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{k}</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {summary?.urgency_level && (
              <div style={{ background: summary.urgency_level === 'High' ? '#fee2e2' : summary.urgency_level === 'Medium' ? '#fef3c7' : '#d1fae5', borderRadius: 8, padding: 14, marginBottom: 16, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>AI Pre-Visit Assessment</div>
                <div style={{ fontSize: 13 }}>Urgency: <span className={`badge badge-${summary.urgency_level?.toLowerCase()}`}>{summary.urgency_level}</span></div>
                {summary.pre_visit_summary && (() => {
                  try { const p = JSON.parse(summary.pre_visit_summary); return <p style={{ fontSize: 13, marginTop: 8, color: '#374151' }}>{p.chief_complaint}</p>; } catch { return null; }
                })()}
              </div>
            )}

            <button className="btn btn-primary" onClick={() => navigate('/appointments')} style={{ width: '100%', justifyContent: 'center' }}>
              View My Appointments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
