import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Menangani proxy untuk endpoint konversi
      '/convert': {
        target: 'http://167.99.74.xxx:8000', // Ganti dengan IP backend yang benar
        changeOrigin: true,
        secure: false,
        // Meningkatkan timeout hingga 5 menit (300.000 ms)
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
});
