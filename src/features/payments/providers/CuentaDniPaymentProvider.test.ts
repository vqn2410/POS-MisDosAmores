import { describe, it, expect } from 'vitest';
import { CuentaDniPaymentProvider } from './CuentaDniPaymentProvider';
import type { CuentaDniPayment, CuentaDniChargeResult } from '../../../cuentadni/common/types';

function makeProvider(chargeResult: CuentaDniChargeResult = { status: 'APPROVED', operationId: 'CDNI-OP-test' }) {
  const store = new Map<string, CuentaDniPayment>();

  const provider = new CuentaDniPaymentProvider({
    persist: async (payment) => {
      store.set(payment.id, { ...payment });
    },
    load: async (id) => store.get(id) ?? null,
    update: async (id, patch) => {
      const current = store.get(id);
      if (!current) throw new Error(`Pago ${id} no encontrado.`);
      store.set(id, { ...current, ...patch, updatedAt: new Date().toISOString() });
    },
    charge: async () => chargeResult,
  });

  return { provider, store };
}

describe('CuentaDniPaymentProvider', () => {
  it('crea el pago en AWAITING_CONFIRMATION y lo persiste', async () => {
    const { provider, store } = makeProvider();
    const payment = await provider.createPayment({ amount: 4500, externalReference: 'TICK-9921' });

    expect(payment.status).toBe('AWAITING_CONFIRMATION');
    expect(payment.amount).toBe(4500);
    expect(store.get(payment.id)?.status).toBe('AWAITING_CONFIRMATION');
  });

  it('cobra con Clave DNI y aprueba la operación', async () => {
    const { provider, store } = makeProvider({ status: 'APPROVED', operationId: 'CDNI-OP-123' });
    const payment = await provider.createPayment({ amount: 2500, externalReference: 'TICK-9922' });

    const charged = await provider.chargeWithClaveDni(payment.id, {
      customerDni: '30123456',
      claveDni: '654321',
    });

    expect(charged.status).toBe('APPROVED');
    expect(charged.operationId).toBe('CDNI-OP-123');
    expect(charged.customerDni).toBe('30123456');
    expect(store.get(payment.id)?.status).toBe('APPROVED');
  });

  it('marca REJECTED cuando el banco rechaza la Clave DNI', async () => {
    const { provider } = makeProvider({
      status: 'REJECTED',
      rejectionCode: 'INSUFFICIENT_FUNDS',
      rejectionReason: 'Saldo insuficiente en la cuenta del cliente.',
    });
    const payment = await provider.createPayment({ amount: 1000, externalReference: 'TICK-9923' });

    const charged = await provider.chargeWithClaveDni(payment.id, {
      customerDni: '30123456',
      claveDni: '111111',
    });

    expect(charged.status).toBe('REJECTED');
    expect(charged.rejectionCode).toBe('INSUFFICIENT_FUNDS');
  });

  it('lanza error al cobrar sin DNI o sin Clave DNI', async () => {
    const { provider } = makeProvider();
    const payment = await provider.createPayment({ amount: 1000, externalReference: 'TICK-9924' });

    await expect(
      provider.chargeWithClaveDni(payment.id, { customerDni: '', claveDni: '123456' })
    ).rejects.toThrow();

    await expect(
      provider.chargeWithClaveDni(payment.id, { customerDni: '30123456', claveDni: '   ' })
    ).rejects.toThrow();
  });

  it('confirma manualmente con un número de referencia válido', async () => {
    const { provider } = makeProvider();
    const payment = await provider.createPayment({ amount: 2500, externalReference: 'TICK-9925' });

    const confirmed = await provider.manuallyConfirmPayment(payment.id, {
      referenceNumber: 'CDNI-OP-882194',
      confirmedByUserId: 'usr-01',
      confirmedByUserName: 'Carlos Mendoza',
    });

    expect(confirmed.status).toBe('MANUALLY_CONFIRMED');
    expect(confirmed.referenceNumber).toBe('CDNI-OP-882194');
    expect(confirmed.confirmedByUserName).toBe('Carlos Mendoza');
  });

  it('lanza error al confirmar sin número de referencia', async () => {
    const { provider } = makeProvider();
    const payment = await provider.createPayment({ amount: 1000, externalReference: 'TICK-9926' });

    await expect(
      provider.manuallyConfirmPayment(payment.id, {
        referenceNumber: '   ',
        confirmedByUserId: 'usr-01',
        confirmedByUserName: 'Carlos Mendoza',
      })
    ).rejects.toThrow();
  });

  it('cancela el pago correctamente', async () => {
    const { provider, store } = makeProvider();
    const payment = await provider.createPayment({ amount: 3000, externalReference: 'TICK-9927' });

    const cancelled = await provider.cancelPayment(payment.id);

    expect(cancelled.status).toBe('CANCELLED');
    expect(store.get(payment.id)?.status).toBe('CANCELLED');
  });

  it('recupera el estado persistido de un pago', async () => {
    const { provider } = makeProvider();
    const payment = await provider.createPayment({ amount: 100, externalReference: 'TICK-9928' });

    const loaded = await provider.getPaymentStatus(payment.id);

    expect(loaded?.amount).toBe(100);
    expect(loaded?.externalReference).toBe('TICK-9928');
  });
});
