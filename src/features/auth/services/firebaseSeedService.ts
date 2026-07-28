import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  mockCompany,
  mockBranches,
  mockUsers,
  mockCategories,
  mockProducts,
  mockCustomers,
  mockSuppliers,
  mockSales,
  mockKardexMovements,
  mockElectronicInvoices,
  mockAuditLogs,
} from '../../../constants/mockData';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebaseConfig';

export interface SeedProgressResult {
  success: boolean;
  totalRecords: number;
  collections: { name: string; count: number }[];
  error?: string;
}

const SEED_PASSWORD = '123456';

function emailFromUsername(username: string): string {
  return `${username.trim()}@pos.local`;
}

export async function seedFirebaseData(): Promise<SeedProgressResult> {
  try {
    const summary: { name: string; count: number }[] = [];

    // 1. Company
    await setDoc(doc(db, 'companies', mockCompany.id), mockCompany);
    summary.push({ name: 'companies', count: 1 });

    // 2. Branches
    for (const b of mockBranches) {
      await setDoc(doc(db, 'branches', b.id), b);
    }
    summary.push({ name: 'branches', count: mockBranches.length });

    // 3. Users (Firestore + Firebase Auth)
    for (const u of mockUsers) {
      await setDoc(doc(db, 'users', u.id), u);
      const email = emailFromUsername(u.username);
      try {
        await createUserWithEmailAndPassword(auth, email, SEED_PASSWORD);
      } catch {
        // User may already exist in Firebase Auth, that's ok
      }
    }
    summary.push({ name: 'users', count: mockUsers.length });

    // 4. Categories
    for (const cat of mockCategories) {
      await setDoc(doc(db, 'categories', cat.id), cat);
    }
    summary.push({ name: 'categories', count: mockCategories.length });

    // 5. Products
    for (const p of mockProducts) {
      await setDoc(doc(db, 'products', p.id), p);
    }
    summary.push({ name: 'products', count: mockProducts.length });

    // 6. Customers
    for (const c of mockCustomers) {
      await setDoc(doc(db, 'customers', c.id), c);
    }
    summary.push({ name: 'customers', count: mockCustomers.length });

    // 7. Suppliers
    for (const sup of mockSuppliers) {
      await setDoc(doc(db, 'suppliers', sup.id), sup);
    }
    summary.push({ name: 'suppliers', count: mockSuppliers.length });

    // 8. Sales
    for (const s of mockSales) {
      await setDoc(doc(db, 'sales', s.id), s);
    }
    summary.push({ name: 'sales', count: mockSales.length });

    // 9. Kardex Movements
    for (const k of mockKardexMovements) {
      await setDoc(doc(db, 'kardex_movements', k.id), k);
    }
    summary.push({ name: 'kardex_movements', count: mockKardexMovements.length });

    // 10. Electronic Invoices
    for (const inv of mockElectronicInvoices) {
      await setDoc(doc(db, 'electronic_invoices', inv.id), inv);
    }
    summary.push({ name: 'electronic_invoices', count: mockElectronicInvoices.length });

    // 11. Audit Logs
    for (const log of mockAuditLogs) {
      await setDoc(doc(db, 'audit_logs', log.id), log);
    }
    summary.push({ name: 'audit_logs', count: mockAuditLogs.length });

    const totalRecords = summary.reduce((acc, curr) => acc + curr.count, 0);

    return {
      success: true,
      totalRecords,
      collections: summary,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      totalRecords: 0,
      collections: [],
      error: message,
    };
  }
}
