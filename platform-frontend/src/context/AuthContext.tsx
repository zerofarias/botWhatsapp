import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'SUPPORT' | 'SALES';

export interface AreaMembership {
  id: number | null;
  name: string | null;
}

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: Role;
  defaultAreaId: number | null;
  areas: AreaMembership[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<{ user: AuthUser }>('/auth/me');
    return data.user;
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    setLoading(true);
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setLoading(true);
      try {
        await api.post('/auth/login', { identifier, password });
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
        if (currentUser) {
          const redirectPath =
            (location.state as { from?: string } | null)?.from ?? '/dashboard';
          navigate(redirectPath, { replace: true });
        }
      } finally {
        setLoading(false);
      }
    },
    [location.state, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    const currentUser = await fetchCurrentUser();
    setUser(currentUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [loading, login, logout, refreshUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
