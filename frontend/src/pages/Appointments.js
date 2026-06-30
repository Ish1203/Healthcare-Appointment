import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Search } from 'lucide-react';

const STATUS_FILTERS = ['all', 'confirmed', 'completed', 'cancelled'];

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = {};
    if (filter !== 'all') params.status = filter;
    api.get('/appointments', { params })
      .then(r => setAppointments(r.data))
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = appointments.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return a.patient_name?.toLowerCase().includes(s) || a.doctor_name?.toLowerCase().includes(s) || a.appointment_date?.includes(s);
  });

  return (
    <div>
      <div className="page-header">
        <h1>{user.role === 'admin' ? 'All Appointments' : 'My Appointments'}</h1>
        <p>Track and manage {user.role === 'patient' ? 'your' : ''} appointments</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Status filters */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
              borderColor: filter === s ? '#0ea5e9' : '#e2e8f0',
              background: filter === s ? '#0ea5e9' : 'white',
              color: filter === s ? 'white' : '#374151', fontWeight: 500, textTransform: 'capitalize',
            }}>{s}</button>
          ))}
        </div>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, fontSize: 13 }} />
        </div>
      </div>

      {loading
        ? <div className="loading"><div className="spinner" /></div>
        : filtered.length === 0
          ? <div className="empty-state">
              <div className="icon">📋</div>
              <h3>No appointments found</h3>
              {user.role === 'patient' && <Link to="/doctors" className="btn btn-primary mt-2">Book an Appointment</Link>}
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(appt => (
                <div key={appt.id} className="card" style={{ transition: 'box-shadow 0.15s' }}>
                  <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e910, #6366f110)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        {user.role === 'patient' ? '👨‍⚕️' : '👤'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {user.role === 'patient' ? `Dr. ${appt.doctor_name}` : appt.patient_name}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 13 }}>
                          {user.role === 'patient' ? appt.specialization : `Patient`} · {appt.appointment_date} at {appt.slot_time}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {appt.urgency_level && (
                        <span className={`badge badge-${appt.urgency_level?.toLowerCase()}`}>
                          {appt.urgency_level === 'High' ? '🚨' : appt.urgency_level === 'Medium' ? '⚠️' : '✅'} {appt.urgency_level}
                        </span>
                      )}
                      <span className={`badge badge-${appt.status}`}>{appt.status}</span>
                      <Link to={`/appointments/${appt.id}`} className="btn btn-outline btn-sm">View Details</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  );
}
