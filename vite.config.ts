
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Menangani proxy untuk endpoint konversi
      '/convert': {
        target: 'https://api-backend.club',
        changeOrigin: true,
        secure: false,
        timeout: 300000,
        proxyTimeout: 300000,
      },
      // Menangani proxy untuk endpoint tools (Merge, Split, Compress)
      '/tools': {
        target: 'https://api-backend.club',
        changeOrigin: true,
        secure: false,
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
});
