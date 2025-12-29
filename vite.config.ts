
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Menangani proxy untuk endpoint konversi ke backend VPS
      '/convert': {
        target: 'https://api-backend.club',
        changeOrigin: true,
        secure: false,
        // Meningkatkan timeout hingga 5 menit (300.000 ms) untuk mendukung file besar
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
});
