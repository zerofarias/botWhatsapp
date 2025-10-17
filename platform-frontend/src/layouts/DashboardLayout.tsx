import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const links = [
    { to: '/dashboard', label: 'Estado' },
    { to: '/dashboard/flows', label: 'Flujos' },
    { to: '/dashboard/messages', label: 'Mensajes' },
    { to: '/dashboard/settings', label: 'Configuración' },
    ...(user?.role === 'ADMIN'
      ? [{ to: '/dashboard/admin', label: 'Admin' as const }]
      : []),
  ];

  return (
    <div>
      <header
        style={{
          backgroundColor: '#0f172a',
          color: '#fff',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <strong>WPPConnect Platform</strong>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            {user?.name} — {user?.role}
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                color: isActive ? '#38bdf8' : '#fff',
              })}
              end={link.to === '/dashboard'}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          style={{
            background: '#ef4444',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Cerrar sesión
        </button>
      </header>
      <main className="container" style={{ padding: '2rem 0' }}>
        <Outlet />
      </main>
    </div>
  );
}
