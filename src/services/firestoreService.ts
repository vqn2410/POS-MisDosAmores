import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../features/auth/services/firebaseConfig';

export async function getAll<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function getAllOrdered<T>(collectionName: string, orderField: string = 'createdAt'): Promise<T[]> {
  const q = query(collection(db, collectionName), orderBy(orderField, 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function getById<T>(collectionName: string, id: string): Promise<T | null> {
  const docSnap = await getDoc(doc(db, collectionName, id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as T;
}

export async function getWhere<T>(
  collectionName: string,
  field: string,
  op: '==' | '!=' | '<' | '>' | '<=' | '>=',
  value: string | number | boolean,
  orderField?: string,
  maxLimit?: number
): Promise<T[]> {
  let q = query(collection(db, collectionName), where(field, op, value));
  if (orderField) q = query(q, orderBy(orderField, 'desc'));
  if (maxLimit) q = query(q, limit(maxLimit));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export function stripUndefined(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) cleaned[k] = stripUndefined(v);
    }
    return cleaned;
  }
  return obj;
}

export async function create<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, collectionName), stripUndefined({
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return docRef.id;
}

export async function update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, stripUndefined({
    ...data,
    updatedAt: serverTimestamp(),
  }) as any);
}

export async function remove(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

export { serverTimestamp };
