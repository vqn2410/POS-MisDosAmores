import { create } from 'zustand';
import type { Product, CartItem, Customer, SalePayment, Sale } from '../../../types';
import { useAuthStore } from '../../../store/useAuthStore';
import { calculateCartTotals } from '../utils/calculateCartTotals';

const defaultCustomer: Customer = {
  id: 'cust-01',
  name: 'Consumidor Final',
  creditLimit: 0,
  currentCredit: 0,
  createdAt: new Date().toISOString(),
  totalPurchases: 0,
};

export interface SuspendedSale {
  id: string;
  items: CartItem[];
  customer: Customer;
  notes: string;
  discountGlobal: number;
  savedAt: string;
}

interface POSState {
  cart: CartItem[];
  customer: Customer;
  discountGlobal: number;
  notes: string;
  suspendedSales: SuspendedSale[];
  isPaymentModalOpen: boolean;
  isSuspendedModalOpen: boolean;
  payments: SalePayment[];
  selectedItemIndex: number;

  setSelectedItemIndex: (index: number) => void;
  selectNextItem: () => void;
  selectPreviousItem: () => void;

  addProductToCart: (product: Product, quantity?: number) => void;
  addWeightProductToCart: (product: Product, weightKg: number) => void;
  addVariableProductToCart: (quantity: number, unitPrice: number) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  removeItemFromCart: (productId: string) => void;
  removeLastItemFromCart: () => void;
  removeSelectedItemFromCart: () => void;
  incrementLastItemQuantity: () => void;
  decrementLastItemQuantity: () => void;
  incrementSelectedItemQuantity: () => void;
  decrementSelectedItemQuantity: () => void;
  clearCart: () => void;
  setCustomer: (customer: Customer) => void;
  setDiscountGlobal: (discount: number) => void;
  setNotes: (notes: string) => void;

  suspendSale: () => void;
  restoreSale: (suspendedId: string) => void;
  removeSuspendedSale: (suspendedId: string) => void;

  openPaymentModal: () => void;
  closePaymentModal: () => void;
  addPayment: (payment: Omit<SalePayment, 'id'>) => void;
  removePayment: (paymentId: string) => void;
  clearPayments: () => void;
  completeSale: (ticketNumber: string) => Sale | null;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  customer: defaultCustomer,
  discountGlobal: 0,
  notes: '',
  suspendedSales: [],
  isPaymentModalOpen: false,
  isSuspendedModalOpen: false,
  payments: [],
  selectedItemIndex: 0,

  setSelectedItemIndex: (index) => {
    set((state) => {
      if (state.cart.length === 0) return { selectedItemIndex: 0 };
      const safeIndex = Math.max(0, Math.min(state.cart.length - 1, index));
      return { selectedItemIndex: safeIndex };
    });
  },

  selectNextItem: () => {
    set((state) => {
      if (state.cart.length === 0) return { selectedItemIndex: 0 };
      const nextIndex = Math.min(state.cart.length - 1, state.selectedItemIndex + 1);
      return { selectedItemIndex: nextIndex };
    });
  },

  selectPreviousItem: () => {
    set((state) => {
      if (state.cart.length === 0) return { selectedItemIndex: 0 };
      const prevIndex = Math.max(0, state.selectedItemIndex - 1);
      return { selectedItemIndex: prevIndex };
    });
  },

  addProductToCart: (product, quantity = 1) => {
    if (product.saleType === 'WEIGHT') return;

    set((state) => {
      const taxRate = product.taxRate || 0;
      const existingIndex = state.cart.findIndex((item) => item.product.id === product.id && !item.isVariableProduct);
      if (existingIndex > -1) {
        const updatedCart = [...state.cart];
        const existingItem = updatedCart[existingIndex];
        const newQty = existingItem.quantity + quantity;
        const subtotal = newQty * existingItem.unitPrice;
        const discountAmount = subtotal * (existingItem.discount / 100);
        const taxableAmount = subtotal - discountAmount;
        const tax = taxableAmount * (taxRate / 100);

        updatedCart[existingIndex] = {
          ...existingItem,
          quantity: newQty,
          subtotal,
          tax,
          total: taxableAmount + tax,
        };
        return { cart: updatedCart, selectedItemIndex: existingIndex };
      } else {
        const subtotal = quantity * product.salePrice;
        const tax = subtotal * (taxRate / 100);
        const newItem: CartItem = {
          product,
          quantity,
          unitPrice: product.salePrice,
          discount: 0,
          taxRate,
          subtotal,
          tax,
          total: subtotal + tax,
          saleType: 'UNIT',
        };
        const newCart = [...state.cart, newItem];
        return { cart: newCart, selectedItemIndex: newCart.length - 1 };
      }
    });
  },

  addWeightProductToCart: (product, weightKg) => {
    set((state) => {
      const taxRate = product.taxRate || 0;
      const subtotal = weightKg * product.salePrice;
      const tax = subtotal * (taxRate / 100);

      const newItem: CartItem = {
        product,
        quantity: 1,
        weightKg,
        unitPrice: product.salePrice,
        discount: 0,
        taxRate,
        subtotal,
        tax,
        total: subtotal + tax,
        saleType: 'WEIGHT',
      };

      const newCart = [...state.cart, newItem];
      return { cart: newCart, selectedItemIndex: newCart.length - 1 };
    });
  },

  addVariableProductToCart: (quantity, unitPrice) => {
    set((state) => {
      const subtotal = Math.round(quantity * unitPrice * 100) / 100;

      const variableProduct: Product = {
        id: `var-prod-${Date.now()}`,
        sku: 'VARIO',
        barcode: '0',
        name: 'Producto Vario',
        description: 'Venta de Producto Vario Ocasional',
        categoryId: 'cat-01',
        costPrice: unitPrice * 0.7,
        salePrice: unitPrice,
        taxRate: 0,
        stock: 9999,
        minStock: 0,
        unit: 'pza',
        saleType: 'VARIABLE',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newItem: CartItem = {
        product: variableProduct,
        quantity,
        unitPrice,
        discount: 0,
        taxRate: 0,
        subtotal,
        tax: 0,
        total: subtotal,
        saleType: 'VARIABLE',
        isVariableProduct: true,
      };

      const newCart = [...state.cart, newItem];
      return { cart: newCart, selectedItemIndex: newCart.length - 1 };
    });
  },

  updateItemQuantity: (productId, quantity) => {
    const safeQty = Math.max(1, quantity);
    set((state) => {
      const updatedCart = state.cart.map((item) => {
        if (item.product.id === productId) {
          const mult = item.saleType === 'WEIGHT' && item.weightKg ? item.weightKg : safeQty;
          const subtotal = mult * item.unitPrice;
          const discountAmount = subtotal * (item.discount / 100);
          const taxableAmount = subtotal - discountAmount;
          const taxRate = item.product.taxRate || 0;
          const tax = taxableAmount * (taxRate / 100);
          return {
            ...item,
            quantity: safeQty,
            subtotal,
            tax,
            total: taxableAmount + tax,
          };
        }
        return item;
      });
      return { cart: updatedCart };
    });
  },

  updateItemDiscount: (productId, discount) => {
    set((state) => {
      const updatedCart = state.cart.map((item) => {
        if (item.product.id === productId) {
          const mult = item.saleType === 'WEIGHT' && item.weightKg ? item.weightKg : item.quantity;
          const subtotal = mult * item.unitPrice;
          const discountAmount = subtotal * (discount / 100);
          const taxableAmount = subtotal - discountAmount;
          const taxRate = item.product.taxRate || 0;
          const tax = taxableAmount * (taxRate / 100);
          return {
            ...item,
            discount,
            tax,
            total: taxableAmount + tax,
          };
        }
        return item;
      });
      return { cart: updatedCart };
    });
  },

  removeItemFromCart: (productId) => {
    set((state) => {
      const newCart = state.cart.filter((item) => item.product.id !== productId);
      const safeIndex = Math.max(0, Math.min(newCart.length - 1, state.selectedItemIndex));
      return { cart: newCart, selectedItemIndex: safeIndex };
    });
  },

  removeLastItemFromCart: () => {
    set((state) => {
      if (state.cart.length === 0) return state;
      const newCart = [...state.cart];
      newCart.pop();
      const safeIndex = Math.max(0, Math.min(newCart.length - 1, state.selectedItemIndex));
      return { cart: newCart, selectedItemIndex: safeIndex };
    });
  },

  removeSelectedItemFromCart: () => {
    set((state) => {
      if (state.cart.length === 0) return state;
      const targetIndex = Math.max(0, Math.min(state.cart.length - 1, state.selectedItemIndex));
      const newCart = state.cart.filter((_, idx) => idx !== targetIndex);
      const safeIndex = Math.max(0, Math.min(newCart.length - 1, targetIndex));
      return { cart: newCart, selectedItemIndex: safeIndex };
    });
  },

  incrementLastItemQuantity: () => {
    get().incrementSelectedItemQuantity();
  },

  decrementLastItemQuantity: () => {
    get().decrementSelectedItemQuantity();
  },

  incrementSelectedItemQuantity: () => {
    set((state) => {
      if (state.cart.length === 0) return state;
      const targetIndex = Math.max(0, Math.min(state.cart.length - 1, state.selectedItemIndex));
      const targetItem = state.cart[targetIndex];
      const newQty = targetItem.quantity + 1;
      const mult = targetItem.saleType === 'WEIGHT' && targetItem.weightKg ? targetItem.weightKg : newQty;
      const subtotal = mult * targetItem.unitPrice;
      const discountAmount = subtotal * (targetItem.discount / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxRate = targetItem.product.taxRate || 0;
      const tax = taxableAmount * (taxRate / 100);

      const updatedCart = [...state.cart];
      updatedCart[targetIndex] = {
        ...targetItem,
        quantity: newQty,
        subtotal,
        tax,
        total: taxableAmount + tax,
      };
      return { cart: updatedCart };
    });
  },

  decrementSelectedItemQuantity: () => {
    set((state) => {
      if (state.cart.length === 0) return state;
      const targetIndex = Math.max(0, Math.min(state.cart.length - 1, state.selectedItemIndex));
      const targetItem = state.cart[targetIndex];
      const newQty = Math.max(1, targetItem.quantity - 1); // Minimum is 1
      const mult = targetItem.saleType === 'WEIGHT' && targetItem.weightKg ? targetItem.weightKg : newQty;
      const subtotal = mult * targetItem.unitPrice;
      const discountAmount = subtotal * (targetItem.discount / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxRate = targetItem.product.taxRate || 0;
      const tax = taxableAmount * (taxRate / 100);

      const updatedCart = [...state.cart];
      updatedCart[targetIndex] = {
        ...targetItem,
        quantity: newQty,
        subtotal,
        tax,
        total: taxableAmount + tax,
      };
      return { cart: updatedCart };
    });
  },

  clearCart: () => {
    set({ cart: [], discountGlobal: 0, notes: '', payments: [], customer: defaultCustomer, selectedItemIndex: 0 });
  },

  setCustomer: (customer) => set({ customer }),
  setDiscountGlobal: (discountGlobal) => set({ discountGlobal }),
  setNotes: (notes) => set({ notes }),

  suspendSale: () => {
    const { cart, customer, notes, discountGlobal } = get();
    if (cart.length === 0) return;

    const newSuspended: SuspendedSale = {
      id: crypto.randomUUID(),
      items: [...cart],
      customer,
      notes,
      discountGlobal,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      suspendedSales: [...state.suspendedSales, newSuspended],
      cart: [],
      notes: '',
      discountGlobal: 0,
      customer: defaultCustomer,
      selectedItemIndex: 0,
    }));
  },

  restoreSale: (suspendedId) => {
    const target = get().suspendedSales.find((s) => s.id === suspendedId);
    if (!target) return;

    set((state) => ({
      cart: target.items,
      customer: target.customer,
      notes: target.notes,
      discountGlobal: target.discountGlobal,
      suspendedSales: state.suspendedSales.filter((s) => s.id !== suspendedId),
      selectedItemIndex: target.items.length > 0 ? target.items.length - 1 : 0,
    }));
  },

  removeSuspendedSale: (suspendedId) => {
    set((state) => ({
      suspendedSales: state.suspendedSales.filter((s) => s.id !== suspendedId),
    }));
  },

  openPaymentModal: () => set({ isPaymentModalOpen: true }),
  closePaymentModal: () => set({ isPaymentModalOpen: false, payments: [] }),

  addPayment: (payment) => {
    set((state) => ({
      payments: [...state.payments, { ...payment, id: crypto.randomUUID() }],
    }));
  },

  removePayment: (paymentId) => {
    set((state) => ({
      payments: state.payments.filter((p) => p.id !== paymentId),
    }));
  },

  clearPayments: () => set({ payments: [] }),

  completeSale: (ticketNumber: string) => {
    const { cart, customer, payments, notes, discountGlobal } = get();
    if (cart.length === 0) return null;

    const authState = useAuthStore.getState();

    const { subtotal, taxTotal, discountTotal, grandTotal } = calculateCartTotals(cart, discountGlobal);

    const newSale: Sale = {
      id: '',
      ticketNumber,
      branchId: authState.activeBranch?.id || 'br-01',
      branchName: authState.activeBranch?.name || 'Sucursal Principal',
      cashSessionId: authState.cashSession?.id || '',
      userId: authState.user?.id || '',
      userName: authState.user?.fullName || 'Sistema',
      customerId: customer.id,
      customerName: customer.name,
      items: [...cart],
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      status: 'COMPLETED',
      payments: [...payments],
      notes,
      createdAt: new Date().toISOString(),
    };

    get().clearCart();
    set({ isPaymentModalOpen: false });

    return newSale;
  },
}));
