import { describe, it, expect } from 'vitest';
import { CuentaDniPaymentProvider } from './CuentaDniPaymentProvider';

describe('CuentaDniPaymentProvider', () => {
  const provider = new CuentaDniPaymentProvider();

  it('creates payment in AWAITING_CONFIRMATION status', async () => {
    const payment = await provider.createPayment({
      amount: 4500,
      externalReference: 'TICK-9921',
      notes: 'Pago Cuenta DNI',
    });

    expect(payment.id).toBeDefined();
    expect(payment.amount).toBe(4500);
    expect(payment.status).toBe('AWAITING_CONFIRMATION');
  });

  it('manually confirms payment with valid reference number', async () => {
    const payment = await provider.createPayment({
      amount: 2500,
      externalReference: 'TICK-9922',
    });

    const confirmed = await provider.manuallyConfirmPayment(payment.id, {
      referenceNumber: 'CDNI-OP-882194',
      confirmedByUserId: 'usr-01',
      confirmedByUserName: 'Carlos Mendoza',
    });

    expect(confirmed.status).toBe('MANUALLY_CONFIRMED');
    expect(confirmed.referenceNumber).toBe('CDNI-OP-882194');
    expect(confirmed.confirmedByUserName).toBe('Carlos Mendoza');
  });

  it('throws error when confirming without reference number', async () => {
    const payment = await provider.createPayment({
      amount: 1000,
      externalReference: 'TICK-9923',
    });

    await expect(
      provider.manuallyConfirmPayment(payment.id, {
        referenceNumber: '   ',
        confirmedByUserId: 'usr-01',
        confirmedByUserName: 'Carlos Mendoza',
      })
    ).rejects.toThrow();
  });

  it('cancels payment successfully', async () => {
    const payment = await provider.createPayment({
      amount: 3000,
      externalReference: 'TICK-9924',
    });

    const cancelled = await provider.cancelPayment(payment.id);
    expect(cancelled.status).toBe('CANCELLED');
  });
});
