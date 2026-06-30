import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { toast } from 'react-toastify';

export default function Profile() {
  const { user } = useAuth();
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
    toast.success('Disconnected');
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <h1>My Account</h1>
        <p>Manage your account settings</p>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 26, fontWeight: 700 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h3>{user.name}</h3>
              <span style={{ textTransform: 'capitalize', background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{user.role}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: '#64748b' }}>Email</span><span style={{ fontWeight: 500 }}>{user.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '10px 0' }}>
              <span style={{ color: '#64748b' }}>Phone</span><span style={{ fontWeight: 500 }}>{user.phone || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>📅</span>
            <div>
              <div style={{ fontWeight: 600 }}>Google Calendar</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{googleConnected ? 'Connected' : 'Sync appointments to your calendar'}</div>
            </div>
          </div>
          {googleConnected
            ? <button className="btn btn-outline btn-sm" onClick={disconnectGoogle}>Disconnect</button>
            : <button className="btn btn-primary btn-sm" onClick={connectGoogle}>Connect</button>
          }
        </div>
      </div>
    </div>
  );
}
