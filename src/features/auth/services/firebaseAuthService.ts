import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  doc,
  doc as firestoreDoc,
  getDoc,
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
 * Authenticates a POS user by username + password without reading the "users"
 * collection before login (that collection is protected and only readable by
 * authenticated users). The internal email is derived from the username.
 */
export async function loginWithUsername(username: string, password: string): Promise<User> {
  const trimmed = username.trim();
  const email = emailFromUsername(trimmed);

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  let userDoc: User | null = null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      userDoc = { id: snap.id, ...snap.data() } as User;
    }
  } catch (err) {
    console.warn('No se pudo leer el perfil del usuario:', err);
  }

  if (userDoc && userDoc.isActive === false) {
    await firebaseSignOut(auth);
    throw new Error('El usuario se encuentra inactivo. Acceso denegado.');
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('No se pudo actualizar lastLogin en Firestore:', err);
  }

  const profile: User = userDoc ?? {
    id: uid,
    username: trimmed,
    email,
    fullName: credential.user.displayName || trimmed,
    role: 'CASHIER',
    branchId: 'br-01',
    is2FAEnabled: false,
    isActive: true,
  };

  return { ...profile, id: uid };
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
