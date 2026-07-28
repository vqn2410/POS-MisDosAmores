import React from 'react';
import { useCommandPaletteStore } from '../../store/useCommandPaletteStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { usePOSStore } from '../../features/pos/store/usePOSStore';

export const HotkeysListener: React.FC = () => {
  const { togglePalette, closePalette, isOpen } = useCommandPaletteStore();
  const { openTab } = useWorkspaceStore();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      const activeInputVal = (e.target as HTMLInputElement)?.value || '';

      // ArrowUp / ArrowDown -> Navigate between ticket items
      if (e.key === 'ArrowUp') {
        if (!isEditing || activeInputVal.trim() === '') {
          e.preventDefault();
          usePOSStore.getState().selectPreviousItem();
          return;
        }
      }

      if (e.key === 'ArrowDown') {
        if (!isEditing || activeInputVal.trim() === '') {
          e.preventDefault();
          usePOSStore.getState().selectNextItem();
          return;
        }
      }

      // Delete / Supr key -> Remove selected item from cart
      if (e.key === 'Delete' || e.key === 'Supr') {
        if (!isEditing || activeInputVal.trim() === '') {
          e.preventDefault();
          usePOSStore.getState().removeSelectedItemFromCart();
          return;
        }
      }

      // + key / NumpadAdd -> Increment quantity of selected item by 1
      if ((e.key === '+' || e.code === 'NumpadAdd') && !e.shiftKey) {
        if (!isEditing || activeInputVal.trim() === '') {
          e.preventDefault();
          usePOSStore.getState().incrementSelectedItemQuantity();
          return;
        }
      }

      // - key / NumpadSubtract -> Decrement quantity of selected item by 1 (minimum is 1)
      if (e.key === '-' || e.code === 'NumpadSubtract') {
        if (!isEditing || activeInputVal.trim() === '') {
          e.preventDefault();
          usePOSStore.getState().decrementSelectedItemQuantity();
          return;
        }
      }

      // CTRL + K -> Toggle Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
        return;
      }

      // ESC -> Close Modal
      if (e.key === 'Escape' && isOpen) {
        closePalette();
        return;
      }

      // CTRL + ALT + Key Shortcuts
      if (e.ctrlKey && e.altKey) {
        const key = e.key.toLowerCase();
        switch (key) {
          case 'n':
            e.preventDefault();
            openTab({ id: 'pos', title: 'Ventas (POS)', iconName: 'pos', route: '/pos', closable: true });
            break;
          case 'p':
            e.preventDefault();
            openTab({ id: 'products', title: 'Productos', iconName: 'products', route: '/products', closable: true });
            break;
          case 'i':
            e.preventDefault();
            openTab({ id: 'inventory', title: 'Inventario (Kardex)', iconName: 'inventory', route: '/inventory', closable: true });
            break;
          case 'c':
            e.preventDefault();
            openTab({ id: 'customers', title: 'Clientes', iconName: 'customers', route: '/customers', closable: true });
            break;
          case 'r':
            e.preventDefault();
            openTab({ id: 'reports', title: 'Reportes', iconName: 'reports', route: '/reports', closable: true });
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette, closePalette, isOpen, openTab]);

  return null;
};
