import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const DAYS_MAP = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SPECS = ['Cardiology','Dermatology','Neurology','Orthopedics','Pediatrics','Psychiatry','General Medicine','Gynecology','Ophthalmology','ENT','Urology','Oncology','Endocrinology'];

export default function DoctorProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);

  useEffect(() => {
    api.get('/doctors', { params: {} }).then(r => {
      const mine = r.data.find(d => d.user_id === user.id);
      if (mine) {
        setProfile(mine);
        setForm({ ...mine, working_days: mine.working_days?.split(',').map(Number) || [1,2,3,4,5] });
        setHasProfile(true);
      } else {
        setHasProfile(false);
        setForm({ specialization: 'General Medicine', qualification: '', experience_years: 0, slot_duration: 30, working_hours_start: '09:00', working_hours_end: '17:00', working_days: [1,2,3,4,5], bio: '', fee: 500 });
      }
    }).finally(() => setLoading(false));
  }, [user.id]);

  const toggleDay = (day) => {
    const days = form.working_days.includes(day) ? form.working_days.filter(d => d !== day) : [...form.working_days, day].sort();
    setForm({ ...form, working_days: days });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, working_days: form.working_days.join(',') };
      if (hasProfile) {
        await api.put('/doctors/profile', payload);
        toast.success('Profile updated!');
      } else {
        await api.post('/doctors/profile', { ...payload, user_id: user.id });
        toast.success('Profile created!');
        setHasProfile(true);
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  // Google Calendar connection
  const [googleConnected, setGoogleConnected] = useState(false);
  useEffect(() => {
    api.get('/auth/me').then(r => setGoogleConnected(r.data.google_connected));
  }, []);

  const connectGoogle = async () => {
    try {
      const { data } = await api.get('/calendar/auth-url');
      const popup = window.open(data.url, '_blank', 'width=500,height=600');
      // Poll until the OAuth popup closes, then refresh connection status automatically
      // instead of requiring the user to manually reload the page.
      const poll = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(poll);
          api.get('/auth/me').then(r => {
            setGoogleConnected(r.data.google_connected);
            if (r.data.google_connected) toast.success('Google Calendar connected!');
          });
        }
      }, 1000);
    } catch (err) { toast.error(err.response?.data?.error || 'Google Calendar not configured'); }
  };

  const disconnectGoogle = async () => {
    await api.delete('/calendar/disconnect');
    setGoogleConnected(false);
    toast.success('Disconnected from Google Calendar');
  };

  if (loading || !form) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your professional information and availability</p>
      </div>

      {!hasProfile && (
        <div className="alert alert-info mb-3">👋 Welcome! Set up your professional profile to start receiving appointments.</div>
      )}

      {/* Google Calendar */}
      <div className="card mb-3">
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>📅</span>
            <div>
              <div style={{ fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{googleConnected ? 'Connected — appointments sync automatically' : 'Connect to sync appointments to your calendar'}</div>
            </div>
          </div>
          {googleConnected
            ? <button className="btn btn-outline btn-sm" onClick={disconnectGoogle}>Disconnect</button>
            : <button className="btn btn-primary btn-sm" onClick={connectGoogle}>Connect</button>
          }
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <select className="form-control" value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})}>
                  {SPECS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Qualification</label>
                <input className="form-control" value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} placeholder="MBBS, MD, etc." />
              </div>
              <div className="form-group">
                <label className="form-label">Experience (years)</label>
                <input className="form-control" type="number" min={0} value={form.experience_years} onChange={e => setForm({...form, experience_years: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="form-label">Consultation Fee (₹)</label>
                <input className="form-control" type="number" min={0} value={form.fee} onChange={e => setForm({...form, fee: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="form-label">Slot Duration</label>
                <select className="form-control" value={form.slot_duration} onChange={e => setForm({...form, slot_duration: Number(e.target.value)})}>
                  {[15,20,30,45,60].map(d => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Working Hours</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="form-control" type="time" value={form.working_hours_start} onChange={e => setForm({...form, working_hours_start: e.target.value})} />
                  <span style={{ color: '#64748b' }}>to</span>
                  <input className="form-control" type="time" value={form.working_hours_end} onChange={e => setForm({...form, working_hours_end: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Working Days</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {DAYS_MAP.map((day, i) => (
                  <button type="button" key={day} onClick={() => toggleDay(i)} style={{
                    padding: '6px 12px', borderRadius: 8, border: '1.5px solid', fontSize: 13, cursor: 'pointer',
                    borderColor: form.working_days.includes(i) ? '#0ea5e9' : '#e2e8f0',
                    background: form.working_days.includes(i) ? '#0ea5e9' : 'white',
                    color: form.working_days.includes(i) ? 'white' : '#374151', fontWeight: 500,
                  }}>{day}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-control" rows={4} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Tell patients about your expertise..." />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : hasProfile ? 'Update Profile' : 'Create Profile'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
