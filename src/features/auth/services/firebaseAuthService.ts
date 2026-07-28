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
 * Authenticates a user using Username and Password.
 * 1. Finds user document in Firestore "users" collection by username.
 * 2. If not found, tries Firebase Auth directly (the username may be an email,
 *    or the account exists in Auth but not in Firestore yet).
 * 3. On first login for an Auth-only user, creates the Firestore doc automatically.
 */
export async function loginWithUsername(username: string, password: string): Promise<User> {
  // Try Firestore lookup first
  const userDoc = await getUserDocByUsername(username);

  if (userDoc) {
    // Existing document — normal flow
    if (!userDoc.isActive) {
      throw new Error('El usuario se encuentra inactivo. Acceso denegado.');
    }
    const email = userDoc.email || emailFromUsername(username);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    try {
      const userRef = doc(db, 'users', userDoc.id);
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('No se pudo actualizar lastLogin en Firestore:', err);
    }

    return { ...userDoc, id: firebaseUser.uid };
  }

  // No Firestore doc — try multiple auth strategies
  const strategies = [
    { label: `${username}@pos.local`, email: emailFromUsername(username) },
  ];
  if (username.includes('@')) {
    strategies.push({ label: username, email: username });
  }

  for (const s of strategies) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, s.email, password);
      const fbUser = userCredential.user;
      const derivedUsername = username.includes('@') ? username.split('@')[0] : username;

      const newUser: User = {
        id: fbUser.uid,
        username: derivedUsername,
        email: s.email,
        fullName: fbUser.displayName || derivedUsername,
        role: 'ADMIN',
        branchId: 'br-01',
        is2FAEnabled: false,
        isActive: true,
      };

      await setDoc(firestoreDoc(db, 'users', fbUser.uid), stripUndefined({
        ...newUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      return newUser;
    } catch {
      continue;
    }
  }

  throw new Error('Credenciales inválidas. Por favor verifique el usuario y la contraseña.');
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
