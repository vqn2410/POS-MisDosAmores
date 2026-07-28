import { create } from 'zustand';
import type { User, Company, Branch, CashSession } from '../types';

interface AuthState {
  user: User | null;
  company: Company | null;
  branches: Branch[];
  activeBranch: Branch | null;
  cashSession: CashSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setCompany: (company: Company | null) => void;
  setBranches: (branches: Branch[]) => void;
  setActiveBranch: (branchId: string) => void;
  setCashSession: (session: CashSession | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasPermission: (action: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  company: null,
  branches: [],
  activeBranch: null,
  cashSession: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setCompany: (company) => set({ company }),
  setBranches: (branches) => set({ branches }),
  setActiveBranch: (branchId) => {
    const branch = get().branches.find((b) => b.id === branchId);
    if (branch) set({ activeBranch: branch });
  },
  setCashSession: (session) => set({ cashSession: session }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ user: null, isAuthenticated: false, cashSession: null, company: null, branches: [], activeBranch: null }),
  hasPermission: (action: string) => {
    const user = get().user;
    if (!user || !user.isActive) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'MANAGER') {
      return ['view_reports', 'manage_inventory', 'manage_customers', 'manage_suppliers', 'view_cash'].includes(action);
    }
    if (user.role === 'CASHIER') {
      return ['process_sales', 'view_products', 'open_cash_session', 'close_cash_session'].includes(action);
    }
    if (user.role === 'INVENTORY_CLERK') {
      return ['manage_inventory', 'view_products', 'manage_purchases'].includes(action);
    }
    return false;
  },
}));
