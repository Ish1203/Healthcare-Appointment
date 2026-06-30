import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Calendar, UserCog, LogOut,
  Menu, X, Stethoscope, Bell, ClipboardList, User, CalendarOff
} from 'lucide-react';

const navItems = {
  patient: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctors', icon: Stethoscope, label: 'Find Doctors' },
    { to: '/appointments', icon: Calendar, label: 'My Appointments' },
    { to: '/profile', icon: User, label: 'Profile' },
  ],
  doctor: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/appointments', icon: ClipboardList, label: 'Appointments' },
    { to: '/doctor/profile', icon: UserCog, label: 'My Profile' },
    { to: '/doctor/leave', icon: CalendarOff, label: 'Leave Management' },
    { to: '/profile', icon: User, label: 'Account' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/doctors', icon: Stethoscope, label: 'Manage Doctors' },
    { to: '/appointments', icon: Calendar, label: 'All Appointments' },
    { to: '/doctors', icon: Users, label: 'All Doctors' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = navItems[user?.role] || [];

  const handleLogout = () => { logout(); navigate('/login'); };
  const roleColor = { patient: '#0ea5e9', doctor: '#10b981', admin: '#6366f1' }[user?.role] || '#0ea5e9';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{
        width: 250, background: 'white', borderRight: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-250px',
        height: '100vh', zIndex: 100, transition: 'left 0.25s ease', boxShadow: '2px 0 12px rgba(0,0,0,0.06)'
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, #0ea5e9, #6366f1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 }}>🏥</span>
            </div>
            <div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, color: '#0f172a' }}>MediBook</div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>{user?.role} Portal</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 8, marginBottom: 4, textDecoration: 'none', fontWeight: 500, fontSize: 14,
              color: isActive ? roleColor : '#64748b',
              background: isActive ? `${roleColor}12` : 'transparent',
              transition: 'all 0.15s',
            })}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: '#f8fafc', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
            borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer',
            color: '#ef4444', fontWeight: 500, fontSize: 14, transition: 'background 0.15s',
          }} onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 99 }} />}

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <header style={{
          height: 60, background: 'white', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
          position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center'
          }}>
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: '#0f172a' }}>MediBook</span>
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${roleColor}, #6366f1)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1200, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
