// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXvdnqWEBL7Fjrp2LJev92kI-URCkotzw",
  authDomain: "anamnese-e9445.firebaseapp.com",
  projectId: "anamnese-e9445",
  storageBucket: "anamnese-e9445.firebasestorage.app",
  messagingSenderId: "307697854539",
  appId: "1:307697854539:web:c149c0853c6fc6945a05ce",
  measurementId: "G-GY8W414BC9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
