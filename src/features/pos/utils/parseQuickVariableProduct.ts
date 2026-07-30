/**
 * Utility for parsing fast variable product expressions in the POS search input.
 * Format: CANTIDAD * PRECIO (e.g. 2*2000, 2 * 2000, 2.5*2000, 2,5*2000, 3*1500.50, 3*1500,50)
 */

export interface QuickVariableProductResult {
  isValid: boolean;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export function parseQuickVariableProduct(input: string): QuickVariableProductResult {
  const invalidResult: QuickVariableProductResult = {
    isValid: false,
    quantity: 0,
    unitPrice: 0,
    subtotal: 0,
  };

  if (!input || typeof input !== 'string') {
    return invalidResult;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return invalidResult;
  }

  // Regex pattern matching exact string: positive number, multiplier *, positive number
  // Accepts integer or decimal (with dot '.' or comma ',' as decimal separator)
  // Rejects leading minus signs, invalid characters, extra words, multiple multipliers
  const regex = /^\s*(\d+(?:[.,]\d+)?)\s*\*\s*(\d+(?:[.,]\d+)?)\s*$/;
  const match = trimmed.match(regex);

  if (!match) {
    return invalidResult;
  }

  const rawQty = match[1].replace(',', '.');
  const rawPrice = match[2].replace(',', '.');

  const quantity = parseFloat(rawQty);
  const unitPrice = parseFloat(rawPrice);

  // Validate Quantity: > 0, finite, not NaN, within safety bounds
  if (isNaN(quantity) || !isFinite(quantity) || quantity <= 0 || quantity > 99999) {
    return invalidResult;
  }

  // Validate Unit Price: > 0, finite, not NaN, within safety bounds
  if (isNaN(unitPrice) || !isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 999999999) {
    return invalidResult;
  }

  // Calculate Subtotal with exact monetary precision (2 decimal places rounding)
  const subtotal = Math.round(quantity * unitPrice * 100) / 100;

  return {
    isValid: true,
    quantity,
    unitPrice,
    subtotal,
  };
}
