import type { MPOrderPayload, MPOrderResult, MPOrderDetails } from '../common/types';
import { MercadoPagoLogger } from '../logs/MercadoPagoLogger';

export class OrderService {
  /**
   * Stub for creating a Mercado Pago payment order (In-Store Instore API / Point API).
   */
  public async createOrder(order: MPOrderPayload): Promise<MPOrderResult> {
    MercadoPagoLogger.info('createOrder', 'Creando orden de pago en Mercado Pago...', order);

    const mockOrderId = `mp-ord-${Date.now()}`;
    return {
      orderId: mockOrderId,
      externalReference: order.externalReference,
      status: 'pending',
      qrData: `00020101021243650016com.mercadopago${mockOrderId}`,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Stub for getting order details and payment status.
   */
  public async getOrder(orderId: string): Promise<MPOrderDetails> {
    MercadoPagoLogger.info('getOrder', `Consultando orden ${orderId}...`);
    return {
      orderId,
      externalReference: 'TICK-2026-00101',
      status: 'approved',
      totalAmount: 150.0,
      paidAmount: 150.0,
      paymentId: `mp-pay-${Date.now()}`,
    };
  }

  /**
   * Stub for canceling an open order.
   */
  public async cancelOrder(orderId: string): Promise<boolean> {
    MercadoPagoLogger.info('cancelOrder', `Cancelando orden ${orderId}...`);
    return true;
  }
}
