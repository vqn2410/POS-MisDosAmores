import type { MPPaymentDetails, MPRefundResult } from '../common/types';
import { MercadoPagoLogger } from '../logs/MercadoPagoLogger';

export class PaymentService {
  /**
   * Stub for retrieving payment details by payment ID.
   */
  public async getPayment(paymentId: string): Promise<MPPaymentDetails> {
    MercadoPagoLogger.info('getPayment', `Obteniendo información del pago ${paymentId}...`);
    return {
      paymentId,
      status: 'approved',
      statusDetail: 'accredited',
      amount: 150.0,
      paymentMethodId: 'account_money',
      payerEmail: 'cliente@ejemplo.com',
      approvedAt: new Date().toISOString(),
    };
  }

  /**
   * Stub for refunding a payment (partial or full).
   */
  public async refundPayment(paymentId: string, amount?: number): Promise<MPRefundResult> {
    MercadoPagoLogger.info('refundPayment', `Procesando reembolso para el pago ${paymentId}...`, { amount });
    return {
      refundId: `ref-${Date.now()}`,
      paymentId,
      amount: amount || 150.0,
      status: 'approved',
      createdAt: new Date().toISOString(),
    };
  }
}
