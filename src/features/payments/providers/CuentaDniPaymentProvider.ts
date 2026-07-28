export type CuentaDniStatus =
  | 'PENDING'
  | 'AWAITING_CONFIRMATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'MANUALLY_CONFIRMED';

export interface CuentaDniPaymentPayload {
  amount: number;
  externalReference: string;
  notes?: string;
}

export interface CuentaDniConfirmationData {
  referenceNumber: string;
  confirmedByUserId: string;
  confirmedByUserName: string;
  notes?: string;
}

export interface CuentaDniPaymentResult {
  id: string;
  amount: number;
  externalReference: string;
  status: CuentaDniStatus;
  referenceNumber?: string;
  confirmedByUserId?: string;
  confirmedByUserName?: string;
  confirmedAt?: string;
  createdAt: string;
  notes?: string;
}

export class CuentaDniPaymentProvider {
  private static readonly paymentsMap = new Map<string, CuentaDniPaymentResult>();

  public async createPayment(payload: CuentaDniPaymentPayload): Promise<CuentaDniPaymentResult> {
    const id = `cdni-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const result: CuentaDniPaymentResult = {
      id,
      amount: payload.amount,
      externalReference: payload.externalReference,
      status: 'AWAITING_CONFIRMATION',
      createdAt: new Date().toISOString(),
      notes: payload.notes || 'Pago Cuenta DNI registrado en espera de referencia manual.',
    };

    CuentaDniPaymentProvider.paymentsMap.set(id, result);
    return result;
  }

  public async getPaymentStatus(paymentId: string): Promise<CuentaDniPaymentResult | null> {
    return CuentaDniPaymentProvider.paymentsMap.get(paymentId) || null;
  }

  public async manuallyConfirmPayment(
    paymentId: string,
    data: CuentaDniConfirmationData
  ): Promise<CuentaDniPaymentResult> {
    const existing = await this.getPaymentStatus(paymentId);
    if (!existing) {
      throw new Error(`Pago Cuenta DNI con ID ${paymentId} no encontrado.`);
    }

    if (!data.referenceNumber || !data.referenceNumber.trim()) {
      throw new Error('El número o referencia de operación de Cuenta DNI es obligatorio.');
    }

    const updated: CuentaDniPaymentResult = {
      ...existing,
      status: 'MANUALLY_CONFIRMED',
      referenceNumber: data.referenceNumber.trim(),
      confirmedByUserId: data.confirmedByUserId,
      confirmedByUserName: data.confirmedByUserName,
      confirmedAt: new Date().toISOString(),
      notes: data.notes || existing.notes,
    };

    CuentaDniPaymentProvider.paymentsMap.set(paymentId, updated);
    return updated;
  }

  public async cancelPayment(paymentId: string): Promise<CuentaDniPaymentResult> {
    const existing = await this.getPaymentStatus(paymentId);
    if (!existing) {
      throw new Error(`Pago Cuenta DNI con ID ${paymentId} no encontrado.`);
    }

    const updated: CuentaDniPaymentResult = {
      ...existing,
      status: 'CANCELLED',
    };

    CuentaDniPaymentProvider.paymentsMap.set(paymentId, updated);
    return updated;
  }
}
