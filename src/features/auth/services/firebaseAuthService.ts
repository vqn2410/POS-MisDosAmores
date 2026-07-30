import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  doc as firestoreDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import type { User } from '../../../types';
import { stripUndefined } from '../../../services/firestoreService';

export function emailFromUsername(username: string): string {
  return `${username.trim()}@pos.local`;
}

/**
 * Searches for a user in the "users" Firestore collection using their username.
 */
async function getUserDocByUsername(username: string): Promise<User | null> {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.trim()));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as User;
}

/**
 * Creates a Firebase Auth account and a Firestore user document.
 * Uses {username}@pos.local as the internal email for Firebase Auth.
 */
export async function createFirebaseUser(
  userData: Omit<User, 'id'>,
  password: string
): Promise<User> {
  const email = emailFromUsername(userData.username);

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const fbUser = credential.user;

  const newUser: User = {
    id: fbUser.uid,
    ...userData,
    email,
  };

  await setDoc(firestoreDoc(db, 'users', fbUser.uid), stripUndefined({
    ...newUser,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  return newUser;
}

/**
 * Authenticates an existing active POS user after it is selected from the terminal list.
 */
export async function loginWithUsername(username: string, password: string): Promise<User> {
  const userDoc = await getUserDocByUsername(username);

  if (!userDoc) {
    throw new Error('Usuario no encontrado.');
  }
  if (userDoc.isActive === false) {
    throw new Error('El usuario se encuentra inactivo. Acceso denegado.');
  }

  const email = userDoc.email || emailFromUsername(username);
  const credential = await signInWithEmailAndPassword(auth, email, password);

  try {
    await updateDoc(doc(db, 'users', userDoc.id), {
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('No se pudo actualizar lastLogin en Firestore:', err);
  }

  return { ...userDoc, id: credential.user.uid };
}

/**
 * Signs out from Firebase Authentication.
 */
export async function logoutFirebase(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribes to Firebase auth state changes to persist session.
 */
export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
