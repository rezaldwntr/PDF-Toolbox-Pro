import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deteksi environment otomatis dari runtime Vercel
const vercelEnv = process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
const gitBranch = process.env.VERCEL_GIT_COMMIT_REF || '';

export default defineConfig({
  plugins: [react()],
  define: {
    __VERCEL_ENV__: JSON.stringify(vercelEnv),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
  },
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
