/**
 * Utility for parsing fast "quantity.code" product expressions in the POS search input.
 * Format: CANTIDAD . CODIGO (e.g. 1.999999, 4.7790123456789, 2 . SKU-123)
 * Adds N units of the product whose barcode/sku follows the separator.
 * NOTE: The "*" separator is reserved exclusively for "Productos Vario" (see parseQuickVariableProduct).
 */

export interface QuickProductQuantityResult {
  isValid: boolean;
  quantity: number;
  code: string;
}

export function parseQuickProductQuantity(input: string): QuickProductQuantityResult {
  const invalidResult: QuickProductQuantityResult = {
    isValid: false,
    quantity: 0,
    code: '',
  };

  if (!input || typeof input !== 'string') {
    return invalidResult;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return invalidResult;
  }

  // Integer quantity followed by "." and a non-empty code
  const regex = /^\s*(\d+)\s*\.\s*(.+?)\s*$/;
  const match = trimmed.match(regex);

  if (!match) {
    return invalidResult;
  }

  const quantity = parseInt(match[1], 10);
  const code = match[2].trim();

  if (isNaN(quantity) || !isFinite(quantity) || quantity <= 0 || quantity > 99999 || !code) {
    return invalidResult;
  }

  return {
    isValid: true,
    quantity,
    code,
  };
}
