/**
 * Firebase Configuration for Server-side/Node.js Scripts
 * This is specifically for database management scripts
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration - same as your project
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

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// No emulator connection for production scripts
console.log('🔥 Firebase initialized for database management scripts');
console.log(`📊 Project: ${firebaseConfig.projectId}`);

export default app;