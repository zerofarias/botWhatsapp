import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.length
    ? import.meta.env.VITE_API_URL
    : '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token si existe
api.interceptors.request.use((config) => {
  // Si usas cookies para la sesión, withCredentials ya lo envía
  // Si usas token en localStorage/sessionStorage, agrégalo aquí
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
