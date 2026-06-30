import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

const DAYS_MAP = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const SPECS = ['Cardiology','Dermatology','Neurology','Orthopedics','Pediatrics','Psychiatry','General Medicine','Gynecology','Ophthalmology','ENT','Urology','Oncology','Endocrinology'];
const EMPTY_FORM = { name:'', email:'', password:'', phone:'', specialization:'General Medicine', qualification:'', experience_years:0, slot_duration:30, working_hours_start:'09:00', working_hours_end:'17:00', working_days:[1,2,3,4,5], bio:'', fee:500 };

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const fetchDoctors = () => {
    api.get('/doctors').then(r => setDoctors(r.data)).finally(() => setLoading(false));
  };
  useEffect(fetchDoctors, []);

  const toggleDay = (day) => {
    const days = form.working_days.includes(day)
      ? form.working_days.filter(d => d !== day)
      : [...form.working_days, day].sort();
    setForm({ ...form, working_days: days });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, working_days: form.working_days.join(',') };
      if (editId) {
        await api.put(`/admin/doctors/${editId}`, payload);
        toast.success('Doctor updated!');
      } else {
        await api.post('/admin/doctors', payload);
        toast.success('Doctor created! They can now log in.');
      }
      setShowForm(false); setForm(EMPTY_FORM); setEditId(null);
      fetchDoctors();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Delete Dr. ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Doctor removed');
      fetchDoctors();
    } catch { toast.error('Delete failed'); }
  };

  const handleEdit = (doc) => {
    setForm({
      name: doc.name, email: doc.email, password: '', phone: doc.phone || '',
      specialization: doc.specialization, qualification: doc.qualification || '',
      experience_years: doc.experience_years, slot_duration: doc.slot_duration,
      working_hours_start: doc.working_hours_start, working_hours_end: doc.working_hours_end,
      working_days: doc.working_days?.split(',').map(Number) || [1,2,3,4,5],
      bio: doc.bio || '', fee: doc.fee,
    });
    setEditId(doc.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora', fontSize: 26 }}>Manage Doctors</h1>
          <p style={{ color: '#64748b' }}>Create and manage doctor profiles</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM); setEditId(null); }}>
          {showForm ? <><X size={16} /> Close</> : <><Plus size={16} /> Add Doctor</>}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-3" style={{ border: '2px solid #0ea5e9' }}>
          <div className="card-body">
            <h3 style={{ marginBottom: 20 }}>{editId ? 'Edit Doctor Profile' : 'Add New Doctor'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Dr. First Last" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required disabled={!!editId} />
                </div>
                {!editId && (
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-control" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Min 6 chars" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 9876543210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Specialization *</label>
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
                  <label className="form-label">Slot Duration (minutes)</label>
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
                <textarea className="form-control" rows={3} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Brief professional description..." />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Doctor' : 'Create Doctor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctors Table */}
      {loading
        ? <div className="loading"><div className="spinner" /></div>
        : <div className="card">
            <div className="card-body">
              {doctors.length === 0
                ? <div className="empty-state"><div className="icon">👨‍⚕️</div><h3>No doctors yet</h3><p>Add your first doctor above</p></div>
                : <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr><th>Doctor</th><th>Specialization</th><th>Experience</th><th>Slots</th><th>Fee</th><th>Working Days</th><th>Actions</th></tr>
                      </thead>
                      <tbody>
                        {doctors.map(doc => (
                          <tr key={doc.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>Dr. {doc.name}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{doc.email}</div>
                            </td>
                            <td><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{doc.specialization}</span></td>
                            <td>{doc.experience_years} yrs</td>
                            <td>{doc.slot_duration} min · {doc.working_hours_start}–{doc.working_hours_end}</td>
                            <td style={{ fontWeight: 600, color: '#10b981' }}>₹{doc.fee}</td>
                            <td style={{ fontSize: 12 }}>{doc.working_days?.split(',').map(d => DAYS_MAP[d]).join(', ')}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-outline btn-sm" onClick={() => handleEdit(doc)}><Edit2 size={13} /></button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(doc.user_id, doc.name)}><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
            </div>
          </div>
      }
    </div>
  );
}
