import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    // Aumentar el límite de advertencia de chunk size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Estrategia manual de chunking para separar código de librerías grandes
        manualChunks: {
          // Vendor chunks separados
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['react-icons', 'react-hot-toast'],
          'vendor-http': ['axios', 'socket.io-client'],
          // Separar componentes pesados por feature
          'pages-chats': [
            './src/pages/ChatPage_v2.tsx',
            // './src/pages/ChatDetailsPage.tsx', // File doesn't exist
          ],
          'pages-orders': ['./src/pages/OrdersPage_v2.tsx'],
          'pages-users': ['./src/pages/UsersPage_v2.tsx'],
          'pages-contacts': [
            './src/pages/ContactsPage.tsx',
            './src/pages/AreasPage_v2.tsx',
          ],
          'pages-bots': ['./src/pages/BotsPage.tsx'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Permite acceso desde cualquier IP (necesario para acceso público)
    allowedHosts: ['localhost', '127.0.0.1', 'altheavn.duckdns.org', '*.duckdns.org'],
    proxy: {
      '/api': {
        // El proxy solo funciona en desarrollo
        // En producción, el frontend conecta directamente según VITE_API_URL
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
