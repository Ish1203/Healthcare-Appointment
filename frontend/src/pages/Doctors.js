import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Search, Star, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SPECS = ['Cardiology','Dermatology','Neurology','Orthopedics','Pediatrics','Psychiatry','General Medicine','Gynecology','Ophthalmology','ENT'];

export default function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [spec, setSpec] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        if (spec) params.specialization = spec;
        const { data } = await api.get('/doctors', { params });
        setDoctors(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    const timer = setTimeout(fetchDoctors, 300);
    return () => clearTimeout(timer);
  }, [search, spec]);

  return (
    <div>
      <div className="page-header">
        <h1>Find a Doctor</h1>
        <p>Browse specialists and book your appointment</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input className="form-control" placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38 }} />
        </div>
        <select className="form-control" value={spec} onChange={e => setSpec(e.target.value)} style={{ width: 200 }}>
          <option value="">All Specializations</option>
          {SPECS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Specialization tags */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {SPECS.map(s => (
          <button key={s} onClick={() => setSpec(spec === s ? '' : s)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1.5px solid',
            borderColor: spec === s ? '#0ea5e9' : '#e2e8f0',
            background: spec === s ? '#0ea5e9' : 'white',
            color: spec === s ? 'white' : '#374151', fontWeight: 500,
          }}>{s}</button>
        ))}
      </div>

      {loading
        ? <div className="loading"><div className="spinner" /></div>
        : doctors.length === 0
          ? <div className="empty-state"><div className="icon">🔍</div><h3>No doctors found</h3><p>Try a different search or specialization</p></div>
          : <div className="grid grid-3">
              {doctors.map(doc => (
                <div key={doc.id} className="card" style={{ transition: 'box-shadow 0.2s' }} onMouseOver={e => e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)'} onMouseOut={e => e.currentTarget.style.boxShadow = ''}>
                  <div className="card-body">
                    <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                      <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                        👨‍⚕️
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, marginBottom: 2 }}>Dr. {doc.name}</h3>
                        <span style={{ display: 'inline-block', background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{doc.specialization}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748b' }}>
                        <Star size={14} color="#f59e0b" fill="#f59e0b" />
                        <span>{doc.experience_years} yrs exp</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748b' }}>
                        <Clock size={14} />
                        <span>{doc.slot_duration} min slots</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                        <DollarSign size={14} />
                        <span>₹{doc.fee}</span>
                      </div>
                    </div>

                    {doc.bio && <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{doc.bio}</p>}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link to={`/doctors/${doc.id}`} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>View Profile</Link>
                      {user?.role === 'patient' && (
                        <Link to={`/book/${doc.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>Book Now</Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  );
}
