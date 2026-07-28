import type { MPOrderPayload, MPQRResult } from '../common/types';
import { MercadoPagoLogger } from '../logs/MercadoPagoLogger';

export class QRService {
  /**
   * Stub for generating a Static QR code for a specific POS cash register.
   */
  public async createStaticQR(posId: string): Promise<string> {
    MercadoPagoLogger.info('createStaticQR', `Generando QR Estático para POS ID ${posId}...`);
    return `https://www.mercadopago.com.ar/qr/pos-${posId}-static-code`;
  }

  /**
   * Stub for generating a Dynamic QR code associated with a specific sale order.
   */
  public async createDynamicQR(order: MPOrderPayload): Promise<MPQRResult> {
    MercadoPagoLogger.info('createDynamicQR', 'Generando QR Dinámico para orden...', order);
    const mockOrderId = `mp-dyn-${Date.now()}`;
    return {
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MP_DYNAMIC_ORDER_${mockOrderId}`,
      qrCodeData: `00020101021243650016com.mercadopago.qr.${mockOrderId}`,
      orderId: mockOrderId,
    };
  }
}
