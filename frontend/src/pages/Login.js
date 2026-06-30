import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
          <h1 style={{ color: 'white', fontSize: 28, fontFamily: 'Sora, sans-serif' }}>MediBook</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Healthcare Appointment Manager</p>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 36, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ marginBottom: 6, fontFamily: 'Sora', fontSize: 22 }}>Welcome back</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28 }}>Sign in to your account</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
            Don't have an account? <Link to="/register" style={{ color: '#0ea5e9', fontWeight: 600 }}>Register</Link>
          </p>

          {/* Demo accounts */}
          <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demo Accounts</p>
            {[
              { role: 'Admin', email: 'admin@medibook.com', pass: 'admin123' },
              { role: 'Doctor', email: 'doctor@medibook.com', pass: 'doctor123' },
              { role: 'Patient', email: 'patient@medibook.com', pass: 'patient123' },
            ].map(({ role, email, pass }) => (
              <button key={role} onClick={() => setForm({ email, password: pass })} style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#0ea5e9', fontWeight: 500
              }}>
                {role}: {email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
