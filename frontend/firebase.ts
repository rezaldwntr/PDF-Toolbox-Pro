import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';

const firebaseConfig = {
  apiKey: "AIzaSyBVklKrsLmun5q0VMCxX4DsQqJHDhLoUTY",
  authDomain: "projectonone-277c2.firebaseapp.com",
  projectId: "projectonone-277c2",
  storageBucket: "projectonone-277c2.firebasestorage.app",
  messagingSenderId: "854870558222",
  appId: "1:854870558222:web:dbe44a0b60b3347e079e5f",
  measurementId: "G-C2CL25PY0F"
};

let app, analytics, performance;

try {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  performance = getPerformance(app);
} catch (error) {
  console.warn("Firebase initialization failed:", error);
}

export { app, analytics, performance };