import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
          <h1 style={{ color: 'white', fontSize: 28, fontFamily: 'Sora, sans-serif' }}>MediBook</h1>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ marginBottom: 6, fontFamily: 'Sora', fontSize: 22 }}>Create Account</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>Join MediBook to manage your health</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" type="text" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" type="tel" placeholder="+91 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Register As</label>
              <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
            Already have an account? <Link to="/login" style={{ color: '#0ea5e9', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
