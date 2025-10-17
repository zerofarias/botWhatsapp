import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';

type NavigationLink = {
  to: string;
  label: string;
  roles?: Role[];
};

const NAVIGATION_LINKS: NavigationLink[] = [
  { to: '/dashboard', label: 'Estado' },
  { to: '/dashboard/chat', label: 'Chat' },
  { to: '/dashboard/flows', label: 'Flujos', roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/dashboard/users', label: 'Usuarios', roles: ['ADMIN'] },
  { to: '/dashboard/areas', label: 'Áreas', roles: ['ADMIN'] },
  { to: '/dashboard/settings', label: 'Configuración' },
];

function formatRole(role?: Role) {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'SUPERVISOR':
      return 'Supervisor';
    case 'OPERATOR':
      return 'Operador';
    case 'SUPPORT':
      return 'Soporte';
    case 'SALES':
      return 'Ventas';
    default:
      return 'Invitado';
  }
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();

  const availableLinks = NAVIGATION_LINKS.filter((link) => {
    if (!link.roles) return true;
    if (!user) return false;
    return link.roles.includes(user.role);
  });

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
            {user?.name ?? 'Usuario'} · {formatRole(user?.role)}
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {availableLinks.map((link) => (
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
