import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

// Initialize Firestore with persistent offline cache + multi-tab support
// Replaces the deprecated enableMultiTabIndexedDbPersistence() API
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
