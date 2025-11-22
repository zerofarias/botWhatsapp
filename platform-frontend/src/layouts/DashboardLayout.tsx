import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import '../styles/sidebar.css';
import { sidebarIcons } from '../components/SidebarIcons';
import { initializeSocket } from '../services/socket/SocketManager';
import PageShell from '../components/layout/PageShell';
import { FiChevronLeft, FiChevronRight, FiLogOut } from 'react-icons/fi';

type NavigationLink = {
  to: string;
  label: string;
  roles?: Role[];
};

const NAVIGATION_LINKS: NavigationLink[] = [
  { to: '/dashboard', label: 'Estado' },
  {
    to: '/dashboard/stats',
    label: 'Estadísticas',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
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
  {
    to: '/dashboard/reminders',
    label: 'Recordatorios',
    roles: ['ADMIN', 'SUPERVISOR', 'OPERATOR'],
  },
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
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [autoCollapsed, setAutoCollapsed] = useState(true);
  const location = useLocation();

  const isCollapsed = sidebarPinned ? false : autoCollapsed;

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

  const handleSidebarMouseEnter = () => {
    if (!sidebarPinned) {
      setAutoCollapsed(false);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (!sidebarPinned) {
      setAutoCollapsed(true);
    }
  };

  const toggleSidebarPin = () => {
    setSidebarPinned((prev) => {
      const next = !prev;
      if (next) {
        setAutoCollapsed(false);
      } else {
        setAutoCollapsed(true);
      }
      return next;
    });
  };

  const handleNavClick = (link: NavigationLink) => {
    const isChatLink = link.to === '/dashboard/chat';
    const isActiveChat =
      isChatLink && location.pathname.startsWith('/dashboard/chat');

    if (isActiveChat) {
      window.dispatchEvent(new CustomEvent('chat:refreshRequested'));
    }
  };

  return (
    <div className={`dashboard-layout${isCollapsed ? ' collapsed' : ''}`}>
      <aside
        className="sidebar"
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="sidebar__brand">
          <span className="sidebar__logo">Bot</span>
          <button
            className="sidebar__collapse"
            onClick={toggleSidebarPin}
            title={sidebarPinned ? 'Desanclar panel' : 'Anclar panel'}
            aria-label={
              sidebarPinned ? 'Desanclar panel lateral' : 'Anclar panel lateral'
            }
            type="button"
          >
            {sidebarPinned ? (
              <FiChevronRight aria-hidden="true" />
            ) : (
              <FiChevronLeft aria-hidden="true" />
            )}
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
              onClick={() => handleNavClick(link)}
              end={link.to === '/dashboard'}
            >
              <span className="sidebar__icon">
                {sidebarIcons[link.label] ?? '•'}
              </span>
              {!isCollapsed && (
                <span className="sidebar__text">{link.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar__logout" onClick={logout} type="button">
          <span className="sidebar__logout-icon" aria-hidden="true">
            <FiLogOut />
          </span>
          {!isCollapsed && (
            <span className="sidebar__logout-text">Cerrar sesión</span>
          )}
        </button>
      </aside>
      <main className="dashboard-main">
        <div className="dashboard-main__content">
          <ShellOutlet />
        </div>
      </main>
    </div>
  );
}

type ShellMeta = {
  path: string;
  title: string;
  subtitle: string;
  fullHeight?: boolean;
};

const DISABLED_SHELL_PATHS = [
  '/dashboard/orders',
  '/dashboard/chat',
  '/dashboard/stats',
] as const;

const PAGE_SHELL_CONFIG: ShellMeta[] = [
  {
    path: '/dashboard/users',
    title: 'Usuarios',
    subtitle: 'Gestiona roles, accesos y permisos',
  },
  {
    path: '/dashboard/areas',
    title: 'Áreas',
    subtitle: 'Define equipos y horarios de atención',
  },
  {
    path: '/dashboard/contacts',
    title: 'Contactos',
    subtitle: 'Administra tu libreta de clientes',
  },
  {
    path: '/dashboard/bots',
    title: 'Bots',
    subtitle: 'Crea y sincroniza asistentes para tus flujos',
  },
  {
    path: '/dashboard/settings',
    title: 'Configuración',
    subtitle: 'Preferencias generales del sistema',
  },
  {
    path: '/dashboard',
    title: 'Estado general',
    subtitle: 'Monitorea bots y conversaciones en tiempo real',
  },
];

function ShellOutlet() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isDisabled = DISABLED_SHELL_PATHS.some((path) =>
    currentPath.startsWith(path)
  );

  if (isDisabled) {
    return <Outlet />;
  }

  const meta =
    PAGE_SHELL_CONFIG.find(
      (entry) =>
        currentPath === entry.path || currentPath.startsWith(`${entry.path}/`)
    ) ?? PAGE_SHELL_CONFIG[PAGE_SHELL_CONFIG.length - 1];

  if (!meta) {
    return <Outlet />;
  }

  return (
    <PageShell
      title={meta.title}
      subtitle={meta.subtitle}
      fullHeight={meta.fullHeight}
    >
      <Outlet />
    </PageShell>
  );
}

