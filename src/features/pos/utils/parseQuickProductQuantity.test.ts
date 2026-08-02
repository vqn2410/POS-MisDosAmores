import { describe, it, expect } from 'vitest';
import { parseQuickProductQuantity } from './parseQuickProductQuantity';

describe('parseQuickProductQuantity', () => {
  it('parses basic 1.999999 expression correctly', () => {
    const res = parseQuickProductQuantity('1.999999');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(1);
    expect(res.code).toBe('999999');
  });

  it('parses 4.7790123456789 expression correctly', () => {
    const res = parseQuickProductQuantity('4.7790123456789');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(4);
    expect(res.code).toBe('7790123456789');
  });

  it('accepts spaces around separator (2 . SKU-123)', () => {
    const res = parseQuickProductQuantity('2 . SKU-123');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(2);
    expect(res.code).toBe('SKU-123');
  });

  it('accepts alphanumeric codes', () => {
    const res = parseQuickProductQuantity('10.abc123');
    expect(res.isValid).toBe(true);
    expect(res.quantity).toBe(10);
    expect(res.code).toBe('abc123');
  });

  it('rejects zero quantity (0.CODE)', () => {
    const res = parseQuickProductQuantity('0.CODE');
    expect(res.isValid).toBe(false);
  });

  it('rejects negative quantity', () => {
    const res = parseQuickProductQuantity('-3.CODE');
    expect(res.isValid).toBe(false);
  });

  it('rejects missing separator', () => {
    const res = parseQuickProductQuantity('7790123456789');
    expect(res.isValid).toBe(false);
  });

  it('rejects "*" separator (reserved for variable products)', () => {
    const res = parseQuickProductQuantity('4*7790123456789');
    expect(res.isValid).toBe(false);
  });

  it('rejects empty code', () => {
    const res = parseQuickProductQuantity('4.');
    expect(res.isValid).toBe(false);
  });

  it('rejects empty input', () => {
    const res = parseQuickProductQuantity('');
    expect(res.isValid).toBe(false);
  });
});
