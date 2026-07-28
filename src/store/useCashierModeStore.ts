import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CashierModeState {
  isCashierMode: boolean;
  toggleCashierMode: () => void;
  setCashierMode: (enabled: boolean) => void;
}

export const useCashierModeStore = create<CashierModeState>()(
  persist(
    (set) => ({
      isCashierMode: false,
      toggleCashierMode: () => set((state) => ({ isCashierMode: !state.isCashierMode })),
      setCashierMode: (isCashierMode) => set({ isCashierMode }),
    }),
    {
      name: 'nexus_cashier_mode_pref',
    }
  )
);
