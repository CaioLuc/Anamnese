import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebaseConfig';

export const loginFirebaseUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Login errorMessage:", error);
    throw error;
  }
};

export const logoutFirebaseUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout errorMessage:", error);
    throw error;
  }
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};
