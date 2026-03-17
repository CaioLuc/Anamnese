import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCXvdnqWEBL7Fjrp2LJev92kI-URCkotzw",
  authDomain: "anamnese-e9445.firebaseapp.com",
  projectId: "anamnese-e9445",
  storageBucket: "anamnese-e9445.firebasestorage.app",
  messagingSenderId: "307697854539",
  appId: "1:307697854539:web:c149c0853c6fc6945a05ce",
  measurementId: "G-GY8W414BC9"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Force WebSockets instead of Long-Polling (Bypasses AdBlockers and Antivirus traps)
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
