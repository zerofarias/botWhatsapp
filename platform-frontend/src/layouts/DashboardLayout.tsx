import { NavLink, Outlet } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import '../styles/sidebar.css';
import { sidebarIcons } from '../components/SidebarIcons';
import { initializeSocket } from '../services/socket/SocketManager';

type NavigationLink = {
  to: string;
  label: string;
  roles?: Role[];
};

const NAVIGATION_LINKS: NavigationLink[] = [
  { to: '/dashboard', label: 'Estado' },
  { to: '/dashboard/chat', label: 'Chat' },
  {
    to: '/dashboard/orders',
    label: 'Pedidos',
    roles: ['ADMIN', 'OPERATOR', 'SUPERVISOR'],
  },
  { to: '/dashboard/bots', label: 'Bots', roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/dashboard/users', label: 'Usuarios', roles: ['ADMIN'] },
  { to: '/dashboard/areas', label: 'Areas', roles: ['ADMIN'] },
  {
    to: '/dashboard/contacts',
    label: 'Contactos',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  { to: '/dashboard/working-hours', label: 'Horarios', roles: ['ADMIN'] },
  { to: '/dashboard/settings', label: 'Configuracion' },
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
  const [collapsed, setCollapsed] = useState(false);

  const availableLinks = NAVIGATION_LINKS.filter((link) => {
    if (!link.roles) return true;
    if (!user) return false;
    return link.roles.includes(user.role);
  });

  // Inicializar socket globalmente para todas las páginas del dashboard
  useEffect(() => {
    // Usar VITE_SOCKET_URL si está disponible, sino derivar de VITE_API_URL
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.VITE_API_URL || 'http://localhost:4001/api').replace(
        /\/api\/?$/,
        ''
      );

    console.log(
      '🔌 Initializing socket globally from DashboardLayout:',
      socketUrl
    );

    try {
      initializeSocket(socketUrl);
      console.log('✅ Socket initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize socket:', error);
    }
  }, []);

  return (
    <div className={`dashboard-layout${collapsed ? ' collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">Bot</span>
          <button
            className="sidebar__collapse"
            onClick={() => setCollapsed((c) => !c)}
            title="Colapsar menú"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <div className="sidebar__user">
          <div className="sidebar__user-name">{user?.name ?? 'Usuario'}</div>
          <div className="sidebar__user-role">{formatRole(user?.role)}</div>
        </div>
        <nav className="sidebar__nav">
          {availableLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                'sidebar__nav-link' + (isActive ? ' active' : '')
              }
              end={link.to === '/dashboard'}
            >
              <span className="sidebar__icon">
                {sidebarIcons[link.label] ?? '•'}
              </span>
              {!collapsed && (
                <span className="sidebar__text">{link.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar__logout" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
