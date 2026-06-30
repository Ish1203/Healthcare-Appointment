import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Clock, Star, MapPin, Phone, Mail, Calendar } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/doctors/${id}`).then(r => setDoctor(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!doctor) return <div className="empty-state"><h3>Doctor not found</h3></div>;

  const workingDays = doctor.working_days?.split(',').map(Number) || [];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/doctors" style={{ color: '#64748b', fontSize: 14, textDecoration: 'none' }}>← Back to Doctors</Link>
      </div>

      <div className="grid grid-3" style={{ gap: 24 }}>
        {/* Left: Profile */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card mb-3">
            <div className="card-body">
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ width: 80, height: 80, borderRadius: 16, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>
                  👨‍⚕️
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: 24, marginBottom: 6 }}>Dr. {doctor.name}</h1>
                  <span style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', padding: '4px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                    {doctor.specialization}
                  </span>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#64748b' }}>
                      <Star size={15} color="#f59e0b" fill="#f59e0b" />
                      <span><strong>{doctor.experience_years}</strong> years experience</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#64748b' }}>
                      <Clock size={15} />
                      <span><strong>{doctor.slot_duration} min</strong> appointments</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {doctor.bio && (
            <div className="card mb-3">
              <div className="card-body">
                <h3 style={{ marginBottom: 12 }}>About Dr. {doctor.name}</h3>
                <p style={{ color: '#374151', lineHeight: 1.7 }}>{doctor.bio}</p>
                {doctor.qualification && <p style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>🎓 {doctor.qualification}</p>}
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginBottom: 16 }}>Schedule</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DAYS.map((day, i) => (
                  <div key={day} style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: workingDays.includes(i) ? '#d1fae5' : '#f1f5f9',
                    color: workingDays.includes(i) ? '#065f46' : '#94a3b8',
                    border: `1px solid ${workingDays.includes(i) ? '#6ee7b7' : '#e2e8f0'}`,
                  }}>{day}</div>
                ))}
              </div>
              <div style={{ marginTop: 16, color: '#374151', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} />
                <span>{doctor.working_hours_start} - {doctor.working_hours_end}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Booking Card */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 80 }}>
            <div className="card-body">
              <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Sora', color: '#10b981' }}>₹{doctor.fee}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Consultation fee</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {doctor.email && <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#64748b' }}>
                  <Mail size={14} />{doctor.email}
                </div>}
                {doctor.phone && <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#64748b' }}>
                  <Phone size={14} />{doctor.phone}
                </div>}
              </div>

              {user?.role === 'patient' ? (
                <Link to={`/book/${doctor.id}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '14px' }}>
                  <Calendar size={16} /> Book Appointment
                </Link>
              ) : (
                <div className="alert alert-info" style={{ textAlign: 'center', fontSize: 13 }}>Login as a patient to book</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
