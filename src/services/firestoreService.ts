import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../features/auth/services/firebaseConfig';

export async function getAll<T>(collectionName: string): Promise<T[]> {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function getAllOrdered<T>(collectionName: string, orderField: string = 'createdAt'): Promise<T[]> {
  const q = query(collection(db, collectionName), orderBy(orderField, 'desc'));
  // Firestore returns cached data when offline, but uses the server when available so every user sees current products.
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
    // Return early for Date, Timestamp, FieldValue or any non-plain object
    if (obj.constructor !== Object) return obj;

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

export async function adjustStock(productId: string, delta: number): Promise<void> {
  const docRef = doc(db, 'products', productId);
  await updateDoc(docRef, {
    stock: increment(delta),
    updatedAt: serverTimestamp(),
  });
}

export async function remove(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

export async function updateMany<T>(collectionName: string, updates: Array<{ id: string; data: Partial<T> }>): Promise<void> {
  const batch = writeBatch(db);
  updates.forEach(({ id, data }) => {
    batch.update(doc(db, collectionName, id), stripUndefined({ ...data, updatedAt: serverTimestamp() }) as any);
  });
  await batch.commit();
}

export { serverTimestamp };
