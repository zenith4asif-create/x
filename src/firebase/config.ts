import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Firebase credentials directly hardcoded as requested
export const firebaseConfig = {
  apiKey: "AIzaSyACl9gSrNtkr5O0oLfYQeCIV8OaXbsRrh0",
  authDomain: "thio-82063.firebaseapp.com",
  databaseURL: "https://thio-82063-default-rtdb.firebaseio.com",
  projectId: "thio-82063",
  storageBucket: "thio-82063.firebasestorage.app",
  messagingSenderId: "458356046416",
  appId: "1:458356046416:web:fb5539ac71cb4de875af55",
  measurementId: "G-6YD9BSMSYY"
};

// Initialize Firebase singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(firebaseApp);
export const rtdb = getDatabase(firebaseApp);
export const googleAuthProvider = new GoogleAuthProvider();
