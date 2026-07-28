import { describe, it, expect, beforeEach } from 'vitest';
import { usePOSStore } from './usePOSStore';
import type { Product } from '../../../types';

const mockProducts: Product[] = [
  { id: 'p1', sku: 'SKU-001', barcode: '123', name: 'Producto A', categoryId: 'cat-01', costPrice: 10, salePrice: 20, taxRate: 0, stock: 100, minStock: 5, unit: 'pza', saleType: 'UNIT', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'p2', sku: 'SKU-002', barcode: '456', name: 'Producto B', categoryId: 'cat-01', costPrice: 15, salePrice: 30, taxRate: 0, stock: 50, minStock: 5, unit: 'pza', saleType: 'UNIT', isActive: true, createdAt: '', updatedAt: '' },
  { id: 'p3', sku: 'SKU-003', barcode: '789', name: 'Producto C', categoryId: 'cat-01', costPrice: 8, salePrice: 16, taxRate: 0, stock: 200, minStock: 10, unit: 'pza', saleType: 'UNIT', isActive: true, createdAt: '', updatedAt: '' },
];

describe('usePOSStore quantity, deletion & arrow key navigation shortcuts', () => {
  beforeEach(() => {
    usePOSStore.getState().clearCart();
  });

  it('navigates through items with selectNextItem and selectPreviousItem', () => {
    usePOSStore.getState().addProductToCart(mockProducts[0], 1);
    usePOSStore.getState().addProductToCart(mockProducts[1], 1);
    usePOSStore.getState().addProductToCart(mockProducts[2], 1);

    // Newly added item becomes selected (index 2)
    expect(usePOSStore.getState().selectedItemIndex).toBe(2);

    // Navigates up -> index 1
    usePOSStore.getState().selectPreviousItem();
    expect(usePOSStore.getState().selectedItemIndex).toBe(1);

    // Navigates up -> index 0 (top boundary)
    usePOSStore.getState().selectPreviousItem();
    expect(usePOSStore.getState().selectedItemIndex).toBe(0);

    usePOSStore.getState().selectPreviousItem();
    expect(usePOSStore.getState().selectedItemIndex).toBe(0);

    // Navigates down -> index 1
    usePOSStore.getState().selectNextItem();
    expect(usePOSStore.getState().selectedItemIndex).toBe(1);
  });

  it('modifies the currently selected item when calling incrementSelectedItemQuantity and decrementSelectedItemQuantity', () => {
    usePOSStore.getState().addProductToCart(mockProducts[0], 1);
    usePOSStore.getState().addProductToCart(mockProducts[1], 1);

    // Select item 0
    usePOSStore.getState().setSelectedItemIndex(0);

    // Increment selected item 0
    usePOSStore.getState().incrementSelectedItemQuantity();
    expect(usePOSStore.getState().cart[0].quantity).toBe(2);
    expect(usePOSStore.getState().cart[1].quantity).toBe(1);

    // Decrement selected item 0 (min 1)
    usePOSStore.getState().decrementSelectedItemQuantity();
    expect(usePOSStore.getState().cart[0].quantity).toBe(1);

    usePOSStore.getState().decrementSelectedItemQuantity();
    expect(usePOSStore.getState().cart[0].quantity).toBe(1);
  });

  it('removes selected item when calling removeSelectedItemFromCart', () => {
    usePOSStore.getState().addProductToCart(mockProducts[0], 1);
    usePOSStore.getState().addProductToCart(mockProducts[1], 1);
    expect(usePOSStore.getState().cart.length).toBe(2);

    usePOSStore.getState().setSelectedItemIndex(0);
    usePOSStore.getState().removeSelectedItemFromCart();

    expect(usePOSStore.getState().cart.length).toBe(1);
    expect(usePOSStore.getState().cart[0].product.id).toBe(mockProducts[1].id);
  });
});
