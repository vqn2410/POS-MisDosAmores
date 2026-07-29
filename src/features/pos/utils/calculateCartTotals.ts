import type { CartItem } from '../../../types';

export const calculateCartTotals = (cart: CartItem[], globalDiscount = 0) => {
  const discountRate = Math.min(100, Math.max(0, globalDiscount)) / 100;

  return cart.reduce(
    (totals, item) => {
      const itemDiscount = item.subtotal * (item.discount / 100);
      const taxableAfterItemDiscount = item.subtotal - itemDiscount;
      const globalDiscountAmount = taxableAfterItemDiscount * discountRate;
      const taxableAmount = taxableAfterItemDiscount - globalDiscountAmount;
      const tax = taxableAmount * ((item.product.taxRate || 0) / 100);

      totals.subtotal += item.subtotal;
      totals.discountTotal += itemDiscount + globalDiscountAmount;
      totals.taxTotal += tax;
      totals.grandTotal += taxableAmount + tax;
      return totals;
    },
    { subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0 }
  );
};
