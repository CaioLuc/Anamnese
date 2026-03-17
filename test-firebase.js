import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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
  console.log("Starting backend connection test to Firebase Firestore...");
  
  // Set a timeout to catch infinite hangs
  const timeout = setTimeout(() => {
    console.error("❌ TIMEOUT: The connection hung indefinitely. This usually means the Firestore Database was never created in the Firebase Console, or port 443 is blocked.");
    process.exit(1);
  }, 10000);

  try {
    const docRef = await addDoc(collection(db, "test_connection"), {
      timestamp: new Date().toISOString(),
      source: "Node.js Script"
    });
    clearTimeout(timeout);
    console.log("✅ SUCCESS! Connected and wrote document with ID:", docRef.id);
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    console.error("❌ ERROR: Connection failed with:", error.code, error.message);
    process.exit(1);
  }
}

runTest();
