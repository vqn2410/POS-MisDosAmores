import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../features/auth/services/firebaseConfig';
import { stripUndefined } from './firestoreService';
import type { CuentaDniPayment } from '../cuentadni/common/types';

const COLLECTION = 'cuentaDniPayments';

export async function saveCuentaDniPayment(payment: CuentaDniPayment): Promise<void> {
  await setDoc(doc(db, COLLECTION, payment.id), stripUndefined(payment));
}

export async function getCuentaDniPayment(id: string): Promise<CuentaDniPayment | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as CuentaDniPayment), id: snap.id };
}

export async function updateCuentaDniPayment(id: string, patch: Partial<CuentaDniPayment>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), stripUndefined({ ...patch, updatedAt: new Date().toISOString() }));
}
