import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { registerServiceWorker } from './lib/pwa';

// Mendaftarkan Service Worker PWA untuk offline caching
registerServiceWorker();

// Mendapatkan elemen root dari HTML tempat aplikasi React akan dipasang
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Inisialisasi Root React dan render aplikasi
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* ThemeProvider membungkus aplikasi untuk menyediakan konteks Dark/Light mode ke seluruh komponen */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);