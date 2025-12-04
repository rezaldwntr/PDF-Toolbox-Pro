// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVklKrsLmun5q0VMCxX4DsQqJHDhLoUTY",
  authDomain: "projectonone-277c2.firebaseapp.com",
  projectId: "projectonone-277c2",
  storageBucket: "projectonone-277c2.firebasestorage.app",
  messagingSenderId: "854870558222",
  appId: "1:854870558222:web:dbe44a0b60b3347e079e5f",
  measurementId: "G-C2CL25PY0F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
