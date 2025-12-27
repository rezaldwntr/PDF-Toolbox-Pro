import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Menangani proxy untuk endpoint konversi ke backend VPS
      '/convert': {
        target: 'http://167.99.74.204:8000',
        changeOrigin: true,
        secure: false,
        // Meningkatkan timeout hingga 5 menit (300.000 ms) untuk mendukung file besar
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
});
