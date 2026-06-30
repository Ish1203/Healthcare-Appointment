import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { Trash2 } from 'lucide-react';

export default function DoctorLeave() {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/doctors').then(r => setDoctors(r.data)).finally(() => setLoading(false));
    } else {
      api.get('/doctors').then(r => {
        const mine = r.data.find(d => d.user_id === user.id);
        if (mine) { setDoctorId(mine.id); setSelectedDoctorId(mine.id); }
      }).finally(() => setLoading(false));
    }
  }, [user]);

  const activeDocId = user.role === 'admin' ? selectedDoctorId : doctorId;

  useEffect(() => {
    if (!activeDocId) return;
    api.get(`/doctors/${activeDocId}/leave`).then(r => setLeaves(r.data));
  }, [activeDocId]);

  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!activeDocId || !leaveDate) return toast.error('Select doctor and date');
    setSaving(true);
    try {
      const { data } = await api.post(`/doctors/${activeDocId}/leave`, { leave_date: leaveDate, reason });
      toast.success(`Leave marked! ${data.affected_appointments > 0 ? `${data.affected_appointments} patient(s) notified.` : ''}`);
      setLeaveDate(''); setReason('');
      const r = await api.get(`/doctors/${activeDocId}/leave`);
      setLeaves(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (leaveId) => {
    await api.delete(`/doctors/${activeDocId}/leave/${leaveId}`);
    setLeaves(leaves.filter(l => l.id !== leaveId));
    toast.success('Leave removed');
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1>Leave Management</h1>
        <p>Mark leave dates — affected patients are automatically notified</p>
      </div>

      {user.role === 'admin' && (
        <div className="form-group mb-3">
          <label className="form-label">Select Doctor</label>
          <select className="form-control" value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}>
            <option value="">-- Select --</option>
            {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization})</option>)}
          </select>
        </div>
      )}

      {activeDocId && (
        <>
          <div className="card mb-3">
            <div className="card-body">
              <h3 style={{ marginBottom: 16 }}>Add Leave Date</h3>
              <form onSubmit={handleAddLeave}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-control" type="date" min={new Date().toISOString().split('T')[0]} value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason (optional)</label>
                  <input className="form-control" value={reason} onChange={e => setReason(e.target.value)} placeholder="Personal leave, conference, etc." />
                </div>
                <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Mark as Leave'}</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 16 }}>Upcoming Leave Dates</h3>
              {leaves.length === 0
                ? <div className="empty-state"><p>No leave dates scheduled</p></div>
                : leaves.map(l => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{l.leave_date}</div>
                        {l.reason && <div style={{ fontSize: 13, color: '#64748b' }}>{l.reason}</div>}
                      </div>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(l.id)}><Trash2 size={14} /></button>
                    </div>
                  ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
