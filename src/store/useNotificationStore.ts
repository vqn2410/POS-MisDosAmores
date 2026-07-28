import { create } from 'zustand';
import type { NotificationItem } from '../types';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [
    {
      id: 'notif-1',
      title: 'Venta Registrada',
      message: 'Venta TICK-2026-00981 completada con éxito por $263.33',
      type: 'success',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Alerta de Stock Mínimo',
      message: 'El producto "Monitor UltraWide 34" ha alcanzado el nivel crítico de stock (4 pzas).',
      type: 'warning',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
    },
  ],
  unreadCount: 2,
  addNotification: (notif) =>
    set((state) => {
      const newItem: NotificationItem = {
        ...notif,
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      return {
        notifications: [newItem, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }),
  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      const unread = updated.filter((n) => !n.read).length;
      return { notifications: updated, unreadCount: unread };
    }),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
