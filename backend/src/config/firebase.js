import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import dotenv from 'dotenv';

dotenv.config();

// Firebase configuration - use environment variables or default to actual project
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAYTmD4etOIkoSy0iubiR-j35Q_6GzfHcc",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "quantumfleet-d5f24.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "quantumfleet-d5f24", 
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "quantumfleet-d5f24.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "898149537923",
  appId: process.env.FIREBASE_APP_ID || "1:898149537923:web:27812063799f4c20d423b6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.USE_EMULATORS === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('🔥 Connected to Firebase emulators');
  } catch (error) {
    console.warn('Firebase emulators not available:', error.message);
  }
}

export default app;