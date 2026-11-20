import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC5freZBatfO5zrhhNNFo_nYw7ejfym2aY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ferreteria-sistema.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ferreteria-sistema",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ferreteria-sistema.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "122400105302",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:122400105302:web:36586c69fc2d2b9e71ecf7"
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// Conexión opcional a emulador solo si se activa por env
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    console.info('[Firebase] Conectado a emuladores locales');
  } catch {
    // Ya conectado
  }
}

export { app, auth, db };

