import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { UserCard } from '../components/users/UserCard';
import { EditUserModal } from '../components/users/EditUserModal';
import type { AreaMembership } from '../context/AuthContext';
import './UsersPage_v2.css';

type Role = 'ADMIN' | 'SUPERVISOR' | 'OPERATOR' | 'SUPPORT' | 'SALES';

type UserListItem = {
  id: number;
  name: string;
  username: string;
  email: string | null;
  role: Role;
  defaultAreaId: number | null;
  areas: AreaMembership[];
  isActive: boolean;
  photoUrl?: string;
};

type AreaItem = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'OPERATOR', label: 'Operador' },
  { value: 'SUPPORT', label: 'Soporte' },
  { value: 'SALES', label: 'Ventas' },
];

type CreateUserPayload = {
  name: string;
  username: string;
  email: string;
  password: string;
  role: Role;
  defaultAreaId: number | null;
  areaIds: number[];
  isActive: boolean;
  photoUrl?: string;
};

type UpdateUserPayload = Partial<{
  name: string;
  email: string | null;
  password: string;
  role: Role;
  defaultAreaId: number | null;
  areaIds: number[];
  isActive: boolean;
  photoUrl?: string;
}>;

const initialCreateState: CreateUserPayload = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'OPERATOR',
  defaultAreaId: null,
  areaIds: [],
  isActive: true,
};

export default function UsersPage_v2() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [createState, setCreateState] =
    useState<CreateUserPayload>(initialCreateState);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeAreas = useMemo(
    () => areas.filter((area) => area.isActive),
    [areas]
  );

  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResponse, areasResponse] = await Promise.all([
        api.get<UserListItem[]>('/users'),
        api.get<AreaItem[]>('/areas'),
      ]);
      setUsers(usersResponse.data);
      setAreas(areasResponse.data);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/users', createState);
      setCreateState(initialCreateState);
      setShowCreateForm(false);
      await fetchData();
    } catch (err) {
      setError('Error al crear el usuario');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (payload: UpdateUserPayload) => {
    if (!selectedUser) return;
    setUpdating(true);
    try {
      await api.patch(`/users/${selectedUser.id}`, payload);
      setSelectedUser(null);
      await fetchData();
    } catch (err) {
      setError('Error al actualizar el usuario');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const toggleUserActive = async (user: UserListItem) => {
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      await fetchData();
    } catch (err) {
      setError('Error al cambiar el estado del usuario');
      console.error(err);
    }
  };

  return (
    <div className="users-page">
      <header className="users-page__header">
        <div>
          <p className="users-page__subtitle">Administración de personal</p>
          <h1 className="users-page__title">Usuarios</h1>
          <p className="users-page__description">
            Gestiona los usuarios y sus permisos en el sistema
          </p>
        </div>
      </header>

      {error && <div className="users-page__error">❌ {error}</div>}

      <div className="users-page__controls">
        <div className="users-page__search">
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="users-page__search-input"
          />
          <span className="users-page__search-icon">🔍</span>
        </div>

        <button
          className="users-page__btn-add"
          onClick={() => setShowCreateForm(!showCreateForm)}
          type="button"
        >
          ➕ Agregar usuario
        </button>
      </div>

      {loading ? (
        <div className="users-page__loading">Cargando usuarios...</div>
      ) : (
        <>
          {showCreateForm && (
            <section className="users-page__create-form">
              <header className="users-page__form-header">
                <h2>Nuevo usuario</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  type="button"
                  className="users-page__form-close"
                >
                  ✕
                </button>
              </header>

              <form onSubmit={handleCreateUser} className="users-page__form">
                <div className="users-page__form-grid">
                  <label className="users-page__form-field">
                    <span>Nombre completo</span>
                    <input
                      type="text"
                      value={createState.name}
                      onChange={(e) =>
                        setCreateState((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      required
                      placeholder="Nombre del usuario"
                    />
                  </label>

                  <label className="users-page__form-field">
                    <span>Usuario</span>
                    <input
                      type="text"
                      value={createState.username}
                      onChange={(e) =>
                        setCreateState((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
                      }
                      required
                      placeholder="nombre_usuario"
                    />
                  </label>

                  <label className="users-page__form-field">
                    <span>Correo</span>
                    <input
                      type="email"
                      value={createState.email}
                      onChange={(e) =>
                        setCreateState((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="usuario@ejemplo.com"
                    />
                  </label>

                  <label className="users-page__form-field">
                    <span>Contraseña</span>
                    <input
                      type="password"
                      value={createState.password}
                      onChange={(e) =>
                        setCreateState((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      required
                      placeholder="Contraseña segura"
                    />
                  </label>

                  <label className="users-page__form-field">
                    <span>Rol</span>
                    <select
                      value={createState.role}
                      onChange={(e) =>
                        setCreateState((prev) => ({
                          ...prev,
                          role: e.target.value as Role,
                        }))
                      }
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="users-page__form-field">
                    <span>Área principal</span>
                    <select
                      value={createState.defaultAreaId ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCreateState((prev) => ({
                          ...prev,
                          defaultAreaId: value ? Number(value) : null,
                        }));
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {activeAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="users-page__form-actions">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="users-page__form-btn users-page__form-btn--cancel"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="users-page__form-btn users-page__form-btn--submit"
                  >
                    {submitting ? 'Creando...' : 'Crear usuario'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {filteredUsers.length === 0 ? (
            <div className="users-page__empty">
              <p>No hay usuarios que mostrar</p>
            </div>
          ) : (
            <>
              <div className="users-page__count">
                Mostrando {filteredUsers.length} de {users.length} usuarios
              </div>

              <div className="users-page__grid">
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onEdit={setSelectedUser}
                    onToggleActive={toggleUserActive}
                    loading={updating}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          areas={areas}
          onClose={() => setSelectedUser(null)}
          onSave={handleUpdateUser}
          loading={updating}
        />
      )}
    </div>
  );
}
