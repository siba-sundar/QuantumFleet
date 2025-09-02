/**
 * Firebase Configuration for Node.js Environment
 * This is used for server-side scripts like database migration
 */

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAYTmD4etOIkoSy0iubiR-j35Q_6GzfHcc",
  authDomain: "quantumfleet-d5f24.firebaseapp.com",
  projectId: "quantumfleet-d5f24",
  storageBucket: "quantumfleet-d5f24.firebasestorage.app",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Connect to emulators if requested via environment variable
const useEmulator = process.env.USE_EMULATOR === 'true';

if (useEmulator) {
  console.log('🔧 Connecting to Firebase emulators...');
  
  try {
    // Connect to Firestore emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('✅ Connected to Firestore emulator');
  } catch (error) {
    console.warn('⚠️ Could not connect to Firestore emulator:', error.message);
  }
  
  try {
    // Connect to Auth emulator
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('✅ Connected to Auth emulator');
  } catch (error) {
    console.warn('⚠️ Could not connect to Auth emulator:', error.message);
  }
} else {
  console.log('🔗 Using production Firebase services');
}

export default app;