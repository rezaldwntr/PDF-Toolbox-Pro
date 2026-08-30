// Import fungsi-fungsi yang dibutuhkan dari Firebase SDK Modular
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';

// Konfigurasi Firebase untuk aplikasi web Anda
// Data ini didapatkan dari Firebase Console (Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyBVklKrsLmun5q0VMCxX4DsQqJHDhLoUTY",
  authDomain: "projectonone-277c2.firebaseapp.com",
  projectId: "projectonone-277c2",
  storageBucket: "projectonone-277c2.firebasestorage.app",
  messagingSenderId: "854870558222",
  appId: "1:854870558222:web:dbe44a0b60b3347e079e5f",
  measurementId: "G-C2CL25PY0F"
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// Inisialisasi layanan Analytics (untuk melacak penggunaan dan perilaku user)
const analytics = getAnalytics(app);

// Inisialisasi layanan Performance Monitoring (untuk memantau kecepatan aplikasi)
const performance = getPerformance(app);

// Ekspor instance agar bisa digunakan di file lain jika diperlukan
export { app, analytics, performance };