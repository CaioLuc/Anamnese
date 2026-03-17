import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import fs from 'fs';

const log = (msg) => {
  fs.appendFileSync('firebase-debug.log', msg + '\n');
}

const firebaseConfig = {
  apiKey: "AIzaSyCXvdnqWEBL7Fjrp2LJev92kI-URCkotzw",
  authDomain: "anamnese-e9445.firebaseapp.com",
  projectId: "anamnese-e9445",
  storageBucket: "anamnese-e9445.firebasestorage.app",
  messagingSenderId: "307697854539",
  appId: "1:307697854539:web:c149c0853c6fc6945a05ce"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runTest() {
  log("Starting backend connection test to Firebase Firestore...");
  
  const timeout = setTimeout(() => {
    log("TIMEOUT: Connection hung indefinitely (Possible missing database).");
    process.exit(1);
  }, 10000);

  try {
    const docRef = await addDoc(collection(db, "test_connection"), {
      timestamp: new Date().toISOString(),
      source: "Node.js Script"
    });
    clearTimeout(timeout);
    log("SUCCESS! Document ID: " + docRef.id);
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    log("ERROR: " + error.code + " - " + error.message);
    process.exit(1);
  }
}

fs.writeFileSync('firebase-debug.log', '');
runTest();
