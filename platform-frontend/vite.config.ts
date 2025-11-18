import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 5173,
    host: '0.0.0.0', // Permite acceso desde cualquier IP (necesario para acceso público)
    allowedHosts: ['localhost', '127.0.0.1', 'camarafarma.duckdns.org'],
    proxy: {
      '/api': {
        target:
          process.env.VITE_API_URL?.replace('/api', '') ||
          'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: process.env.VITE_SOCKET_URL || 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
