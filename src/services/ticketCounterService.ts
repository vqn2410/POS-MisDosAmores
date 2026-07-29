import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../features/auth/services/firebaseConfig';

const COUNTER_DOC = 'counters';
const COUNTER_ID = 'tickets';

const getOfflineTicketNumber = () => {
  const key = 'nexus-pos-offline-ticket-sequence';
  const sequence = Number(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, String(sequence));
  return `OFF-${new Date().getFullYear()}-${Date.now()}-${sequence}`;
};

export async function getNextTicketNumber(): Promise<string> {
  if (!navigator.onLine) return getOfflineTicketNumber();

  const counterRef = doc(db, COUNTER_DOC, COUNTER_ID);

  try {
    const newValue = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists() ? (snap.data().value || 0) : 0;
      const next = current + 1;
      transaction.set(counterRef, { value: next }, { merge: true });
      return next;
    });

    const year = new Date().getFullYear();
    return `TICK-${year}-${String(newValue).padStart(5, '0')}`;
  } catch {
    return getOfflineTicketNumber();
  }
}
