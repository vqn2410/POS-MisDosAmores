import { create } from 'zustand';
import type { WorkspaceTab } from '../types';

export const INITIAL_TABS: WorkspaceTab[] = [
  { id: 'dashboard', title: 'Dashboard', iconName: 'LayoutDashboard', route: '/dashboard', closable: false },
  { id: 'pos', title: 'Ventas (POS)', iconName: 'ShoppingCart', route: '/pos', closable: true },
];

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string;
  openTab: (tab: WorkspaceTab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  isSidebarVisible: boolean;
  showSidebar: () => void;
  hideSidebar: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: INITIAL_TABS,
  activeTabId: 'pos',
  isSidebarVisible: false,
  openTab: (newTab) => {
    const existing = get().tabs.find((t) => t.id === newTab.id);
    if (existing) {
      set({ activeTabId: existing.id });
    } else {
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      }));
    }
  },
  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const targetTab = tabs.find((t) => t.id === tabId);
    if (targetTab && !targetTab.closable) return;

    const newTabs = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;
    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      nextActiveId = newTabs[Math.max(0, idx - 1)]?.id || 'dashboard';
    }
    set({ tabs: newTabs, activeTabId: nextActiveId });
  },
  setActiveTab: (tabId) => set({ activeTabId: tabId }),
  showSidebar: () => set({ isSidebarVisible: true }),
  hideSidebar: () => set({ isSidebarVisible: false }),
}));
