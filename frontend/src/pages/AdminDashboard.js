import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Users, Stethoscope, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

function StatCard({ icon: Icon, value, label, color, sub }) {
  return (
    <div className="card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Sora', color }}>{value ?? '—'}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
            {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
          </div>
          <div style={{ background: `${color}15`, padding: 12, borderRadius: 10 }}>
            <Icon size={24} color={color} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard 🏥</h1>
        <p>Clinic-wide overview and management</p>
      </div>

      <div className="grid grid-3 mb-3">
        <StatCard icon={Users} value={stats?.totalPatients} label="Total Patients" color="#0ea5e9" />
        <StatCard icon={Stethoscope} value={stats?.totalDoctors} label="Active Doctors" color="#10b981" />
        <StatCard icon={Calendar} value={stats?.totalAppointments} label="Total Appointments" color="#6366f1" />
        <StatCard icon={Clock} value={stats?.todayAppointments} label="Today's Schedule" color="#f59e0b" sub="Confirmed for today" />
        <StatCard icon={CheckCircle} value={stats?.completedAppointments} label="Completed" color="#10b981" />
        <StatCard icon={XCircle} value={stats?.cancelledAppointments} label="Cancelled" color="#ef4444" />
      </div>

      {/* Quick Actions */}
      <div className="card mb-3">
        <div className="card-body">
          <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/admin/doctors" className="btn btn-primary">➕ Add New Doctor</Link>
            <Link to="/appointments" className="btn btn-outline">📋 View All Appointments</Link>
            <Link to="/doctors" className="btn btn-outline">👨‍⚕️ Browse Doctors</Link>
          </div>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>Recent Appointments</h3>
            <Link to="/appointments" style={{ color: '#0ea5e9', fontSize: 14, fontWeight: 500 }}>View all →</Link>
          </div>
          {stats?.recentAppointments?.length === 0
            ? <div className="empty-state"><p>No appointments yet</p></div>
            : <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Urgency</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentAppointments?.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.patient_name}</td>
                        <td>Dr. {a.doctor_name}</td>
                        <td>{a.appointment_date}</td>
                        <td>{a.slot_time}</td>
                        <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                        <td>{a.urgency_level ? <span className={`badge badge-${a.urgency_level?.toLowerCase()}`}>{a.urgency_level}</span> : '—'}</td>
                        <td><Link to={`/appointments/${a.id}`} className="btn btn-outline btn-sm">View</Link></td>
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
