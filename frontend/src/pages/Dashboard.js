import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Calendar, Users, CheckCircle, Clock, AlertCircle, Stethoscope } from 'lucide-react';

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-value" style={{ color }}>{value}</div>
          <div className="stat-label">{label}</div>
        </div>
        <div style={{ background: `${color}18`, padding: 10, borderRadius: 8 }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.role === 'admin') {
          const res = await api.get('/admin/stats');
          setData(res.data);
        } else {
          const res = await api.get('/appointments');
          setData(res.data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user.role]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (user.role === 'admin') {
    return (
      <div>
        <div className="page-header">
          <h1>{greeting()}, {user.name} 👋</h1>
          <p>Here's your clinic overview for today</p>
        </div>
        <div className="grid grid-4 mb-3">
          <StatCard icon={Users} value={data?.totalPatients} label="Total Patients" color="#0ea5e9" />
          <StatCard icon={Stethoscope} value={data?.totalDoctors} label="Doctors" color="#10b981" />
          <StatCard icon={Calendar} value={data?.todayAppointments} label="Today's Appointments" color="#6366f1" />
          <StatCard icon={CheckCircle} value={data?.completedAppointments} label="Completed" color="#f59e0b" />
        </div>
        <div className="card">
          <div className="card-body">
            <h3 style={{ marginBottom: 16 }}>Recent Appointments</h3>
            {data?.recentAppointments?.length === 0
              ? <div className="empty-state"><p>No appointments yet</p></div>
              : <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Urgency</th></tr></thead>
                    <tbody>
                      {data?.recentAppointments?.map(appt => (
                        <tr key={appt.id}>
                          <td><Link to={`/appointments/${appt.id}`} style={{ color: '#0ea5e9', fontWeight: 500 }}>{appt.patient_name}</Link></td>
                          <td>Dr. {appt.doctor_name}</td>
                          <td>{appt.appointment_date}</td>
                          <td>{appt.slot_time}</td>
                          <td><span className={`badge badge-${appt.status}`}>{appt.status}</span></td>
                          <td>{appt.urgency_level && <span className={`badge badge-${appt.urgency_level?.toLowerCase()}`}>{appt.urgency_level}</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      </div>
    );
  }

  // Patient / Doctor dashboard
  const appointments = data || [];
  const upcoming = appointments.filter(a => ['confirmed', 'pending'].includes(a.status) && a.appointment_date >= new Date().toISOString().split('T')[0]);
  const completed = appointments.filter(a => a.status === 'completed');
  const cancelled = appointments.filter(a => a.status === 'cancelled');

  return (
    <div>
      <div className="page-header">
        <h1>{greeting()}, {user.role === 'doctor' ? 'Dr.' : ''} {user.name} 👋</h1>
        <p>{user.role === 'patient' ? 'Manage your health appointments' : 'Your patient schedule overview'}</p>
      </div>

      <div className="grid grid-3 mb-3">
        <StatCard icon={Calendar} value={upcoming.length} label="Upcoming" color="#0ea5e9" />
        <StatCard icon={CheckCircle} value={completed.length} label="Completed" color="#10b981" />
        <StatCard icon={AlertCircle} value={cancelled.length} label="Cancelled" color="#ef4444" />
      </div>

      {user.role === 'patient' && (
        <div className="card mb-3" style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', border: 'none', color: 'white' }}>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: 'white', marginBottom: 6 }}>Need to see a doctor?</h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>Find specialists and book appointments instantly</p>
            </div>
            <Link to="/doctors" className="btn" style={{ background: 'white', color: '#0ea5e9', fontWeight: 700 }}>
              <Stethoscope size={16} /> Find Doctors
            </Link>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>Upcoming Appointments</h3>
            <Link to="/appointments" style={{ color: '#0ea5e9', fontSize: 14, fontWeight: 500 }}>View all →</Link>
          </div>
          {upcoming.length === 0
            ? <div className="empty-state">
                <div className="icon">📅</div>
                <h3>No upcoming appointments</h3>
                {user.role === 'patient' && <Link to="/doctors" className="btn btn-primary mt-2">Book an Appointment</Link>}
              </div>
            : upcoming.slice(0, 5).map(appt => (
                <div key={appt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {user.role === 'patient' ? '👨‍⚕️' : '👤'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {user.role === 'patient' ? `Dr. ${appt.doctor_name}` : appt.patient_name}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{appt.appointment_date} at {appt.slot_time}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {appt.urgency_level && <span className={`badge badge-${appt.urgency_level?.toLowerCase()}`}>{appt.urgency_level}</span>}
                    <span className={`badge badge-${appt.status}`}>{appt.status}</span>
                    <Link to={`/appointments/${appt.id}`} className="btn btn-outline btn-sm">View</Link>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
