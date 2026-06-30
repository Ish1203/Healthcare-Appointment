import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

export default function AppointmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postNotes, setPostNotes] = useState('');
  const [prescription, setPrescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlots, setNewSlots] = useState([]);
  const [newSlot, setNewSlot] = useState('');
  const [doctorId, setDoctorId] = useState(null);

  const fetch = () => {
    setLoading(true);
    api.get(`/appointments/${id}`).then(r => {
      setAppt(r.data);
      setDoctorId(r.data.doctor_id);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [id]);

  useEffect(() => {
    if (!newDate || !doctorId) return;
    api.get(`/doctors/${doctorId}/slots`, { params: { date: newDate } })
      .then(r => setNewSlots(r.data.slots || []));
  }, [newDate, doctorId]);

  const handlePostVisit = async () => {
    if (!postNotes) return toast.error('Notes required');
    setSaving(true);
    try {
      const { data } = await api.put(`/appointments/${id}/post-visit`, { post_visit_notes: postNotes, prescription });
      toast.success('Post-visit summary saved and sent to patient!');
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await api.put(`/appointments/${id}/cancel`, { reason: 'Cancelled by user' });
      toast.success('Appointment cancelled');
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleReschedule = async () => {
    if (!newDate || !newSlot) return toast.error('Select date and slot');
    try {
      await api.put(`/appointments/${id}/reschedule`, { new_date: newDate, new_slot: newSlot });
      toast.success('Appointment rescheduled!');
      setShowReschedule(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Slot not available'); }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!appt) return <div className="empty-state"><h3>Appointment not found</h3></div>;

  let preVisit = null;
  try { preVisit = appt.pre_visit_summary ? JSON.parse(appt.pre_visit_summary) : null; } catch {}

  let postVisit = null;
  try { postVisit = appt.post_visit_summary ? JSON.parse(appt.post_visit_summary) : null; } catch {}

  const isDoctor = user.role === 'doctor';
  const isPatient = user.role === 'patient';
  const canCancel = ['confirmed'].includes(appt.status) && (isPatient || isDoctor || user.role === 'admin');
  const canReschedule = isPatient && ['confirmed'].includes(appt.status);
  const canPostVisit = isDoctor && appt.status === 'confirmed';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>← Back</button>

      {/* Header */}
      <div className="card mb-3">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span className={`badge badge-${appt.status}`}>{appt.status}</span>
                {appt.urgency_level && <span className={`badge badge-${appt.urgency_level?.toLowerCase()}`}>⚠️ {appt.urgency_level} Urgency</span>}
              </div>
              <h2 style={{ marginBottom: 4 }}>
                {isPatient ? `Appointment with Dr. ${appt.doctor_name}` : `${appt.patient_name}'s Appointment`}
              </h2>
              <p style={{ color: '#64748b', fontSize: 14 }}>{appt.specialization} · {appt.appointment_date} at {appt.slot_time} · ₹{appt.fee}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canReschedule && <button className="btn btn-outline btn-sm" onClick={() => setShowReschedule(!showReschedule)}>📅 Reschedule</button>}
              {canCancel && <button className="btn btn-danger btn-sm" onClick={handleCancel}>✕ Cancel</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule form */}
      {showReschedule && (
        <div className="card mb-3" style={{ border: '2px solid #0ea5e9' }}>
          <div className="card-body">
            <h3 style={{ marginBottom: 16 }}>Reschedule Appointment</h3>
            <div className="form-group">
              <label className="form-label">New Date</label>
              <input className="form-control" type="date" min={new Date().toISOString().split('T')[0]} value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
            {newSlots.length > 0 && (
              <div className="form-group">
                <label className="form-label">New Slot</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {newSlots.map(s => (
                    <button key={s} onClick={() => setNewSlot(s)} style={{
                      padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                      borderColor: newSlot === s ? '#0ea5e9' : '#e2e8f0',
                      background: newSlot === s ? '#0ea5e9' : 'white',
                      color: newSlot === s ? 'white' : '#374151', cursor: 'pointer', fontSize: 13,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setShowReschedule(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleReschedule} disabled={!newDate || !newSlot}>Confirm Reschedule</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ gap: 20 }}>
        {/* Patient info + Symptoms */}
        <div>
          <div className="card mb-3">
            <div className="card-body">
              <h3 style={{ marginBottom: 14 }}>Patient Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Name', appt.patient_name],
                  ['Email', appt.patient_email],
                  ['Phone', appt.patient_phone || '—'],
                  ['Doctor', `Dr. ${appt.doctor_name}`],
                  ['Date', appt.appointment_date],
                  ['Time', appt.slot_time],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: '#64748b' }}>{k}</span>
                    <span style={{ fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {appt.symptoms && (
            <div className="card mb-3">
              <div className="card-body">
                <h3 style={{ marginBottom: 10 }}>Reported Symptoms</h3>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>{appt.symptoms}</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Summaries */}
        <div>
          {/* Pre-visit AI Summary */}
          {preVisit && (
            <div className="card mb-3" style={{ border: '1px solid #93c5fd' }}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>🤖</span>
                  <h3>AI Pre-Visit Summary</h3>
                </div>
                <div style={{ background: '#eff6ff', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Chief Complaint</div>
                  <p style={{ fontSize: 14, color: '#1e40af' }}>{preVisit.chief_complaint}</p>
                </div>
                {preVisit.suggested_questions?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Suggested Questions for Doctor</div>
                    {preVisit.suggested_questions.map((q, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 14 }}>
                        <span style={{ color: '#0ea5e9', fontWeight: 700 }}>{i + 1}.</span>
                        <span style={{ color: '#374151' }}>{q}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Post-visit summary */}
          {postVisit && (
            <div className="card mb-3" style={{ border: '1px solid #6ee7b7' }}>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>📋</span>
                  <h3>Post-Visit Summary</h3>
                </div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 12 }}>{postVisit.summary}</p>
                {postVisit.medication_schedule?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Medications</div>
                    {postVisit.medication_schedule.map((m, i) => (
                      <div key={i} style={{ background: '#f0fdf4', borderRadius: 6, padding: '8px 12px', marginBottom: 6, fontSize: 13 }}>
                        <strong>💊 {m.medicine}</strong> · {m.dosage} · {m.frequency}
                      </div>
                    ))}
                  </div>
                )}
                {postVisit.follow_up_steps?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Follow-up Steps</div>
                    {postVisit.follow_up_steps.map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 14 }}>
                        <span style={{ color: '#10b981' }}>✓</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Doctor Post-Visit Form */}
          {canPostVisit && !postVisit && (
            <div className="card" style={{ border: '2px dashed #10b981' }}>
              <div className="card-body">
                <h3 style={{ marginBottom: 4 }}>Complete Visit Notes</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>AI will generate a patient-friendly summary</p>
                <div className="form-group">
                  <label className="form-label">Clinical Notes</label>
                  <textarea className="form-control" rows={4} placeholder="Diagnosis, observations, recommendations..." value={postNotes} onChange={e => setPostNotes(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Prescription</label>
                  <textarea className="form-control" rows={3} placeholder="Medicine name, dosage, frequency, duration..." value={prescription} onChange={e => setPrescription(e.target.value)} />
                </div>
                <button className="btn btn-success" onClick={handlePostVisit} disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                  {saving ? '⏳ Generating AI Summary...' : '✓ Save & Send Summary to Patient'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
