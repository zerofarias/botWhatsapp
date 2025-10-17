import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login(identifier, password);
    } catch (err) {
      console.error(err);
      setError('No se pudo iniciar sesión. Verificá tus credenciales.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(circle at top left, #1e293b, #020617)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '2rem',
          width: 'min(420px, 90vw)',
          boxShadow: '0 20px 40px -24px rgba(15, 23, 42, 0.5)',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <h1 style={{ margin: 0 }}>Ingresar</h1>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span>Usuario o correo</span>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </label>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </label>
        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
