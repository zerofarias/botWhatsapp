import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { AreaMembership } from '../context/AuthContext';

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
};

type UpdateUserPayload = Partial<{
  name: string;
  email: string | null;
  password: string;
  role: Role;
  defaultAreaId: number | null;
  areaIds: number[];
  isActive: boolean;
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

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [createState, setCreateState] =
    useState<CreateUserPayload>(initialCreateState);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [editState, setEditState] = useState<UpdateUserPayload>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAreas = useMemo(
    () => areas.filter((area) => area.isActive),
    [areas]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersResponse, areasResponse] = await Promise.all([
        api.get<UserListItem[]>('/users'),
        api.get<AreaItem[]>('/areas'),
      ]);
      setUsers(usersResponse.data);
      setAreas(areasResponse.data);
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
    setError(null);
    try {
      await api.post('/users', {
        ...createState,
        areaIds: createState.areaIds,
        defaultAreaId: createState.defaultAreaId,
      });
      setCreateState(initialCreateState);
      void fetchData();
    } catch (err) {
      console.error(err);
      setError('No se pudo crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectUser = (user: UserListItem) => {
    setSelectedUser(user);
    setEditState({
      name: user.name,
      email: user.email,
      role: user.role,
      defaultAreaId: user.defaultAreaId,
      areaIds: user.areas
        .map((area) => area.id)
        .filter((id): id is number => typeof id === 'number'),
      isActive: user.isActive,
    });
  };

  const handleUpdateUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;
    setUpdating(true);
    setError(null);
    try {
      await api.put(`/users/${selectedUser.id}`, editState);
      setSelectedUser(null);
      setEditState({});
      void fetchData();
    } catch (err) {
      console.error(err);
      setError('No se pudo actualizar el usuario.');
    } finally {
      setUpdating(false);
    }
  };

  const toggleUserActive = async (user: UserListItem) => {
    setUpdating(true);
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      void fetchData();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ margin: 0 }}>Crear usuario</h2>
        <p style={{ marginTop: '0.25rem', color: '#64748b' }}>
          Define operadores, supervisores o administradores y asigna sus áreas.
        </p>
        <form
          onSubmit={handleCreateUser}
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            marginTop: '1rem',
          }}
        >
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Nombre completo</span>
            <input
              value={createState.name}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Usuario</span>
            <input
              value={createState.username}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  username: event.target.value,
                }))
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Correo electrónico</span>
            <input
              type="email"
              value={createState.email}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Contraseña</span>
            <input
              type="password"
              value={createState.password}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Rol</span>
            <select
              value={createState.role}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  role: event.target.value as Role,
                }))
              }
              style={inputStyle}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Área principal</span>
            <select
              value={createState.defaultAreaId ?? ''}
              onChange={(event) => {
                const value = event.target.value;
                setCreateState((prev) => ({
                  ...prev,
                  defaultAreaId: value ? Number(value) : null,
                }));
              }}
              style={inputStyle}
            >
              <option value="">Sin asignar</option>
              {activeAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset
            style={{
              border: '1px solid #cbd5f5',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              gridColumn: '1 / -1',
              display: 'grid',
              gap: '0.5rem',
            }}
          >
            <legend
              style={{
                padding: '0 0.5rem',
                fontWeight: 600,
              }}
            >
              Áreas asignadas
            </legend>
            {activeAreas.length === 0 ? (
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                No hay áreas activas disponibles.
              </span>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gap: '0.35rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
              >
                {activeAreas.map((area) => {
                  const checked = createState.areaIds.includes(area.id);
                  return (
                    <label
                      key={area.id}
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setCreateState((prev) => ({
                            ...prev,
                            areaIds: checked
                              ? prev.areaIds.filter((id) => id !== area.id)
                              : [...prev.areaIds, area.id],
                          }));
                        }}
                      />
                      {area.name}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: '#0f172a',
                color: '#fff',
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Creando...' : 'Crear usuario'}
            </button>
            {error && <span style={{ color: '#ef4444' }}>{error}</span>}
          </div>
        </form>
      </section>

      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Usuarios registrados</h2>
            <p style={{ margin: 0, color: '#64748b' }}>
              {users.length} usuarios activos en la plataforma.
            </p>
          </div>
          <button
            onClick={() => void fetchData()}
            style={{
              border: '1px solid #0f172a',
              borderRadius: '8px',
              padding: '0.5rem 1.25rem',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Actualizar
          </button>
        </header>
        {loading ? (
          <p>Cargando usuarios...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '720px',
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <th style={tableHeaderStyle}>Nombre</th>
                  <th style={tableHeaderStyle}>Rol</th>
                  <th style={tableHeaderStyle}>Ãreas</th>
                  <th style={tableHeaderStyle}>Estado</th>
                  <th style={tableHeaderStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid #e2e8f0' }}
                  >
                    <td style={tableCellStyle}>
                      <div style={{ fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        @{user.username} · {user.email ?? 'sin correo'}
                      </div>
                    </td>
                    <td style={tableCellStyle}>{roleLabel(user.role)}</td>
                    <td style={tableCellStyle}>
                      {user.areas.length === 0
                        ? 'Sin áreas'
                        : user.areas
                            .map((area) => area.name ?? '—')
                            .filter(Boolean)
                            .join(', ')}
                    </td>
                    <td style={tableCellStyle}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                          color: user.isActive ? '#16a34a' : '#ef4444',
                        }}
                      >
                        <span
                          style={{
                            width: '0.55rem',
                            height: '0.55rem',
                            borderRadius: '999px',
                            background: user.isActive ? '#16a34a' : '#ef4444',
                          }}
                        />
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tableCellStyle,
                        display: 'flex',
                        gap: '0.75rem',
                      }}
                    >
                      <button
                        onClick={() => handleSelectUser(user)}
                        style={linkButtonStyle}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleUserActive(user)}
                        style={linkButtonStyle}
                        type="button"
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedUser && (
        <section
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
            display: 'grid',
            gap: '1rem',
          }}
        >
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>Editar usuario</h3>
              <p style={{ margin: 0, color: '#64748b' }}>
                {selectedUser.name} · @{selectedUser.username}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedUser(null);
                setEditState({});
              }}
              style={linkButtonStyle}
              type="button"
            >
              Cerrar
            </button>
          </header>

          <form
            onSubmit={handleUpdateUser}
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            }}
          >
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Nombre completo</span>
              <input
                value={editState.name ?? ''}
                onChange={(event) =>
                  setEditState((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Correo</span>
              <input
                value={editState.email ?? ''}
                onChange={(event) =>
                  setEditState((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Nuevo password</span>
              <input
                type="password"
                value={editState.password ?? ''}
                onChange={(event) =>
                  setEditState((prev) => ({
                    ...prev,
                    password: event.target.value || undefined,
                  }))
                }
                placeholder="Opcional"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Rol</span>
              <select
                value={editState.role ?? selectedUser.role}
                onChange={(event) =>
                  setEditState((prev) => ({
                    ...prev,
                    role: event.target.value as Role,
                  }))
                }
                style={inputStyle}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Área principal</span>
              <select
                value={editState.defaultAreaId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setEditState((prev) => ({
                    ...prev,
                    defaultAreaId: value ? Number(value) : null,
                  }));
                }}
                style={inputStyle}
              >
                <option value="">Sin asignar</option>
                {activeAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
            <fieldset
              style={{
                border: '1px solid #cbd5f5',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                gridColumn: '1 / -1',
                display: 'grid',
                gap: '0.5rem',
              }}
            >
              <legend
                style={{
                  padding: '0 0.5rem',
                  fontWeight: 600,
                }}
              >
                Áreas asignadas
              </legend>
              <div
                style={{
                  display: 'grid',
                  gap: '0.35rem',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
              >
                {activeAreas.map((area) => {
                  const checked =
                    editState.areaIds?.includes(area.id) ??
                    selectedUser.areas.some(
                      (membership) => membership.id === area.id
                    );
                  return (
                    <label
                      key={area.id}
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setEditState((prev) => {
                            const current =
                              prev.areaIds ??
                              selectedUser.areas
                                .map((membership) => membership.id)
                                .filter(
                                  (id): id is number => typeof id === 'number'
                                );
                            const exists = current.includes(area.id);
                            const next = exists
                              ? current.filter((id) => id !== area.id)
                              : [...current, area.id];
                            return { ...prev, areaIds: next };
                          });
                        }}
                      />
                      {area.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={updating}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#fff',
                  cursor: updating ? 'wait' : 'pointer',
                }}
              >
                {updating ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setEditState({});
                }}
                style={linkButtonStyle}
              >
                Cancelar
              </button>
              {error && <span style={{ color: '#ef4444' }}>{error}</span>}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.65rem 1rem',
  borderRadius: '8px',
  border: '1px solid #cbd5f5',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
  fontWeight: 600,
  color: '#475569',
  fontSize: '0.9rem',
};

const tableCellStyle: React.CSSProperties = {
  padding: '0.75rem 0.5rem',
  verticalAlign: 'top',
  fontSize: '0.92rem',
};

const linkButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#2563eb',
  cursor: 'pointer',
  padding: 0,
  fontSize: '0.9rem',
};

function roleLabel(role: Role) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}
