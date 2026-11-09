import {
  saveCuentaDniPayment,
  getCuentaDniPayment,
  updateCuentaDniPayment,
} from '../../../services/cuentaDniPaymentsService';
import { chargeClaveDni } from '../../../services/cuentaDniApi';
import type {
  CuentaDniPayment,
  CuentaDniPaymentPayload,
  CuentaDniConfirmationData,
  CuentaDniChargeInput,
  CuentaDniChargeResult,
} from '../../../cuentadni/common/types';

// Re-exportamos los tipos con los nombres históricos para no romper los consumidores actuales.
export type { CuentaDniPayment as CuentaDniPaymentResult } from '../../../cuentadni/common/types';
export type { CuentaDniPaymentStatus as CuentaDniStatus } from '../../../cuentadni/common/types';
export type { CuentaDniPaymentPayload, CuentaDniConfirmationData } from '../../../cuentadni/common/types';

interface CuentaDniPaymentDeps {
  persist: (payment: CuentaDniPayment) => Promise<void>;
  load: (id: string) => Promise<CuentaDniPayment | null>;
  update: (id: string, patch: Partial<CuentaDniPayment>) => Promise<void>;
  charge: (input: CuentaDniChargeInput & { amount: number; externalReference: string }) => Promise<CuentaDniChargeResult>;
}

/**
 * Orquestador del flujo de cobro nativo de Cuenta DNI.
 *
 * - `createPayment` / `manuallyConfirmPayment` / `cancelPayment`: flujo manual (fallback).
 * - `chargeWithClaveDni`: cobro automático vía Clave DNI (999 + DNI + clave) contra el
 *   adapter de RedLink/Link en el server.
 *
 * La UI responde al instante usando un cache en memoria; Firestore queda como respaldo
 * durable en segundo plano (best-effort, sin bloquear ni fallar si no está disponible).
 */
export class CuentaDniPaymentProvider {
  private readonly deps: CuentaDniPaymentDeps;
  private readonly memory = new Map<string, CuentaDniPayment>();

  constructor(deps?: Partial<CuentaDniPaymentDeps>) {
    this.deps = {
      persist: saveCuentaDniPayment,
      load: getCuentaDniPayment,
      update: updateCuentaDniPayment,
      charge: chargeClaveDni,
      ...deps,
    };
  }

  private generateId(): string {
    return `cdni-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private async load(paymentId: string): Promise<CuentaDniPayment | null> {
    const cached = this.memory.get(paymentId);
    if (cached) return cached;
    const persisted = await this.deps.load(paymentId).catch(() => null);
    if (persisted) this.memory.set(paymentId, persisted);
    return persisted;
  }

  private async patch(paymentId: string, changes: Partial<CuentaDniPayment>): Promise<CuentaDniPayment> {
    const current = await this.load(paymentId);
    if (!current) throw new Error(`Pago Cuenta DNI con ID ${paymentId} no encontrado.`);
    const updated: CuentaDniPayment = { ...current, ...changes, updatedAt: new Date().toISOString() };
    this.memory.set(paymentId, updated);
    this.deps.update(paymentId, changes).catch(() => undefined);
    return updated;
  }

  public async createPayment(payload: CuentaDniPaymentPayload): Promise<CuentaDniPayment> {
    const now = new Date().toISOString();
    const payment: CuentaDniPayment = {
      id: this.generateId(),
      saleId: payload.saleId,
      amount: payload.amount,
      externalReference: payload.externalReference,
      status: 'AWAITING_CONFIRMATION',
      createdAt: now,
      updatedAt: now,
      notes: payload.notes,
    };
    this.memory.set(payment.id, payment);
    this.deps.persist(payment).catch(() => undefined);
    return payment;
  }

  public async getPaymentStatus(paymentId: string): Promise<CuentaDniPayment | null> {
    return this.load(paymentId);
  }

  public async chargeWithClaveDni(paymentId: string, data: CuentaDniChargeInput): Promise<CuentaDniPayment> {
    const existing = await this.load(paymentId);
    if (!existing) {
      throw new Error(`Pago Cuenta DNI con ID ${paymentId} no encontrado.`);
    }
    if (!data.customerDni || !data.customerDni.trim()) {
      throw new Error('El DNI del cliente es obligatorio.');
    }
    if (!data.claveDni || !data.claveDni.trim()) {
      throw new Error('La Clave DNI es obligatoria.');
    }

    const customerDni = data.customerDni.trim();
    await this.patch(paymentId, { customerDni, status: 'AWAITING_CONFIRMATION' });

    const result = await this.deps.charge({
      amount: existing.amount,
      externalReference: existing.externalReference,
      customerDni,
      claveDni: data.claveDni.trim(),
    });

    return this.patch(paymentId, {
      customerDni,
      status: result.status,
      operationId: result.operationId,
      rejectionCode: result.rejectionCode,
      rejectionReason: result.rejectionReason,
    });
  }

  public async manuallyConfirmPayment(
    paymentId: string,
    data: CuentaDniConfirmationData
  ): Promise<CuentaDniPayment> {
    const existing = await this.load(paymentId);
    if (!existing) {
      throw new Error(`Pago Cuenta DNI con ID ${paymentId} no encontrado.`);
    }
    if (!data.referenceNumber || !data.referenceNumber.trim()) {
      throw new Error('El número o referencia de operación de Cuenta DNI es obligatorio.');
    }

    return this.patch(paymentId, {
      status: 'MANUALLY_CONFIRMED',
      referenceNumber: data.referenceNumber.trim(),
      confirmedByUserId: data.confirmedByUserId,
      confirmedByUserName: data.confirmedByUserName,
      confirmedAt: new Date().toISOString(),
      notes: data.notes || existing.notes,
    });
  }

  public async cancelPayment(paymentId: string): Promise<CuentaDniPayment> {
    const existing = await this.load(paymentId);
    if (!existing) {
      throw new Error(`Pago Cuenta DNI con ID ${paymentId} no encontrado.`);
    }

    return this.patch(paymentId, { status: 'CANCELLED' });
  }
}
