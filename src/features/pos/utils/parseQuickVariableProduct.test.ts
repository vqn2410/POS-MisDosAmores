import { describe, it, expect } from 'vitest';
import { parseQuickVariableProduct } from './parseQuickVariableProduct';

describe('parseQuickVariableProduct', () => {
  it('parses basic 2x2000 expression correctly', () => {
    const res = parseQuickVariableProduct('2x2000');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(2);
    expect(res.unitPrice).toBe(2000);
    expect(res.subtotal).toBe(4000);
  });

  it('accepts uppercase X (2X2000)', () => {
    const res = parseQuickVariableProduct('2X2000');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(2);
    expect(res.unitPrice).toBe(2000);
    expect(res.subtotal).toBe(4000);
  });

  it('accepts spaces around multiplier (2 x 2000)', () => {
    const res = parseQuickVariableProduct('2 x 2000');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(2);
    expect(res.unitPrice).toBe(2000);
    expect(res.subtotal).toBe(4000);
  });

  it('parses comma decimal quantity (2,5x2000)', () => {
    const res = parseQuickVariableProduct('2,5x2000');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(2.5);
    expect(res.unitPrice).toBe(2000);
    expect(res.subtotal).toBe(5000);
  });

  it('parses comma decimal price with exact rounding (3x1500,50)', () => {
    const res = parseQuickVariableProduct('3x1500,50');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(3);
    expect(res.unitPrice).toBe(1500.5);
    expect(res.subtotal).toBe(4501.5);
  });

  it('rejects zero quantity (0x2000)', () => {
    const res = parseQuickVariableProduct('0x2000');
    expect(res.isValid).toBe(false);
  });

  it('rejects zero price (2x0)', () => {
    const res = parseQuickVariableProduct('2x0');
    expect(res.isValid).toBe(false);
  });

  it('rejects negative quantity (-2x2000)', () => {
    const res = parseQuickVariableProduct('-2x2000');
    expect(res.isValid).toBe(false);
  });

  it('rejects multiple multipliers (2xx2000)', () => {
    const res = parseQuickVariableProduct('2xx2000');
    expect(res.isValid).toBe(false);
  });

  it('rejects invalid quantity letters (abcx2000)', () => {
    const res = parseQuickVariableProduct('abcx2000');
    expect(res.isValid).toBe(false);
  });

  it('rejects invalid price letters (2xabc)', () => {
    const res = parseQuickVariableProduct('2xabc');
    expect(res.isValid).toBe(false);
  });

  it('rejects extra text (2x2000 texto)', () => {
    const res = parseQuickVariableProduct('2x2000 texto');
    expect(res.isValid).toBe(false);
  });

  it('rejects special code "0"', () => {
    const res = parseQuickVariableProduct('0');
    expect(res.isValid).toBe(false);
  });

  it('rejects standard product names or barcodes like "77903201001234"', () => {
    const res = parseQuickVariableProduct('77903201001234');
    expect(res.isValid).toBe(false);
  });
});
