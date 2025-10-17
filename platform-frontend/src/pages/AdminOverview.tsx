import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

export default function AdminOverview() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    (async () => {
      try {
        const { data } = await api.get<UserRow[]>('/users');
        setUsers(data);
      } catch (err) {
        console.error(err);
        setError('No se pudieron recuperar los usuarios.');
      }
    })();
  }, [user?.role]);

  if (user?.role !== 'ADMIN') {
    return (
      <section
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2>Acceso restringido</h2>
        <p>No tienes permisos para ver esta sección.</p>
      </section>
    );
  }

  return (
    <section
      style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.35)',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Panel de administración</h2>
      {error ? (
        <p style={{ color: '#ef4444' }}>{error}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>
                Usuario
              </th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>
                Email
              </th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>
                Rol
              </th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>
                Alta
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>{row.name}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{row.email}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{row.role}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  {new Date(row.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
