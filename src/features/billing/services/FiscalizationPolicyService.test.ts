import { describe, it, expect } from 'vitest';
import { FiscalizationPolicyService } from './FiscalizationPolicyService';

describe('FiscalizationPolicyService', () => {
  it('returns false for unconfirmed or pending payments', () => {
    expect(FiscalizationPolicyService.shouldFiscalize('MERCADOPAGO_QR', 'PENDING')).toBe(false);
    expect(FiscalizationPolicyService.shouldFiscalize('MERCADOPAGO_QR', 'AWAITING_CONFIRMATION')).toBe(false);
    expect(FiscalizationPolicyService.shouldFiscalize('CUENTA_DNI', 'AWAITING_CONFIRMATION')).toBe(false);
    expect(FiscalizationPolicyService.shouldFiscalize('CARD', 'REJECTED')).toBe(false);
    expect(FiscalizationPolicyService.shouldFiscalize('CARD', 'CANCELLED')).toBe(false);
  });

  it('returns true for approved or manually confirmed fiscal payments', () => {
    expect(FiscalizationPolicyService.shouldFiscalize('MERCADOPAGO_QR', 'APPROVED')).toBe(true);
    expect(FiscalizationPolicyService.shouldFiscalize('MERCADOPAGO_CARD', 'APPROVED')).toBe(true);
  });

  it('returns false for cash payments when configured for internal receipt', () => {
    expect(FiscalizationPolicyService.shouldFiscalize('CASH', 'APPROVED')).toBe(false);
  });
});
