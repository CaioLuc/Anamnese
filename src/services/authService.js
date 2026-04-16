import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import { trackAction } from './logService';

export const loginFirebaseUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await trackAction('LOGIN', { method: 'email_password' });
    return userCredential.user;
  } catch (error) {
    console.error("Login errorMessage:", error);
    throw error;
  }
};

export const logoutFirebaseUser = async () => {
  try {
    await trackAction('LOGOUT', { method: 'manual' });
    await signOut(auth);
  } catch (error) {
    console.error("Logout errorMessage:", error);
    throw error;
  }
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};
