// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
// Analytics is only for browser environments
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYTmD4etOIkoSy0iubiR-j35Q_6GzfHcc",
  authDomain: "quantumfleet-d5f24.firebaseapp.com",
  projectId: "quantumfleet-d5f24",
  storageBucket: "quantumfleet-d5f24.firebasestorage.app",
  messagingSenderId: "898149537923",
  appId: "1:898149537923:web:27812063799f4c20d423b6",
  measurementId: "G-Q97GJEHGRB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize analytics only in browser environment
export const analytics = (() => {
  if (typeof window !== 'undefined') {
    // Dynamically import analytics for browser only
    import('firebase/analytics').then(({ getAnalytics }) => {
      return getAnalytics(app);
    }).catch(() => null);
  }
  return null;
})();

// Connect to emulators only in browser/Vite environment when configured
const isVite = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined';
const useEmulator = (isVite && import.meta.env.VITE_USE_EMULATOR === 'true') ||
  (typeof process !== 'undefined' && process.env && process.env.USE_EMULATORS === 'true');

if (useEmulator) {
  try {
    // Connect to Firestore emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firestore emulator');
  } catch (error) {
    console.log('Firestore emulator not available or already connected');
  }
  
  try {
    // Connect to Auth emulator
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('Connected to Auth emulator');
  } catch (error) {
    console.log('Auth emulator not available or already connected');
  }
}

// Export the app instance
export default app;