import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../features/auth/services/firebaseConfig';

const COUNTER_DOC = 'counters';
const COUNTER_ID = 'tickets';
const SEQ_KEY = 'nexus-pos-ticket-sequence';

function getStoredSequence(): number {
  try {
    const val = localStorage.getItem(SEQ_KEY);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch {
    // ignore storage errors
  }
  return 0;
}

let localSequence = getStoredSequence();

// Sync with Firestore counter on startup in background
if (typeof navigator !== 'undefined' && navigator.onLine) {
  try {
    const counterRef = doc(db, COUNTER_DOC, COUNTER_ID);
    runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      return snap.exists() ? (snap.data().value || 0) : 0;
    }).then((val) => {
      if (typeof val === 'number' && val > localSequence) {
        localSequence = val;
        try {
          localStorage.setItem(SEQ_KEY, String(localSequence));
        } catch {
          // ignore
        }
      }
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export function getNextTicketNumber(): string {
  const year = new Date().getFullYear();

  if (localSequence === 0) {
    localSequence = Math.floor(Date.now() / 1000) % 100000;
  }

  localSequence += 1;
  try {
    localStorage.setItem(SEQ_KEY, String(localSequence));
  } catch {
    // ignore
  }

  // Sync with Firestore counter in background without blocking UI
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const counterRef = doc(db, COUNTER_DOC, COUNTER_ID);
      runTransaction(db, async (transaction) => {
        const snap = await transaction.get(counterRef);
        const current = snap.exists() ? (snap.data().value || 0) : 0;
        const next = Math.max(current + 1, localSequence);
        transaction.set(counterRef, { value: next }, { merge: true });
        return next;
      }).then((remoteVal) => {
        if (typeof remoteVal === 'number' && remoteVal > localSequence) {
          localSequence = remoteVal;
          try {
            localStorage.setItem(SEQ_KEY, String(localSequence));
          } catch {
            // ignore
          }
        }
      }).catch((err) => {
        console.warn('Background ticket counter sync failed:', err);
      });
    } catch {
      // ignore
    }
  }

  return `TICK-${year}-${String(localSequence).padStart(5, '0')}`;
}
