import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCXvdnqWEBL7Fjrp2LJev92kI-URCkotzw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "anamnese-e9445.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "anamnese-e9445",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "anamnese-e9445.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "307697854539",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:307697854539:web:c149c0853c6fc6945a05ce",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GY8W414BC9"
};

export const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Force WebSockets instead of Long-Polling (Bypasses AdBlockers and Antivirus traps)
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});

// Enable offline persistence (works across multiple tabs)
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore: multiple tabs open, persistence limited to one tab.');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore: browser does not support offline persistence.');
  }
});
