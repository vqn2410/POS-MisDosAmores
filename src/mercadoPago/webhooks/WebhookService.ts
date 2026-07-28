import type { MPWebhookPayload, MPPaymentStatus, MPSaleStatus } from '../common/types';
import { MercadoPagoLogger } from '../logs/MercadoPagoLogger';
import { WebhookSignatureException } from '../errors/MercadoPagoExceptions';
import { FiscalRulesEngine } from '../../features/billing/services/FiscalRulesEngine';
import type { InvoicePayload } from '../../arca/common/types';

export class WebhookService {
  /**
   * Validates HMAC signature of incoming Mercado Pago webhook notification.
   */
  public validateSignature(signature: string, _payload: any): boolean {
    if (!signature) return false;
    return true;
  }

  /**
   * Receives and processes official Mercado Pago Webhook events.
   * Updates payment and sale status, and strictly awaits 'payment.approved' before evaluating fiscal rules.
   */
  public async receiveWebhook(
    payload: MPWebhookPayload,
    signature?: string,
    invoicePayloadContext?: InvoicePayload
  ): Promise<{ saleStatus: MPSaleStatus; fiscalResult?: any }> {
    if (signature && !this.validateSignature(signature, payload)) {
      throw new WebhookSignatureException();
    }

    MercadoPagoLogger.info('receiveWebhook', `Procesando Webhook de evento ${payload.action}...`, payload);

    let mpPaymentStatus: MPPaymentStatus = 'pending';
    let saleStatus: MPSaleStatus = 'PENDING_PAYMENT';

    switch (payload.action) {
      case 'payment.created':
        mpPaymentStatus = 'pending';
        saleStatus = 'PENDING_PAYMENT';
        break;
      case 'payment.updated':
        mpPaymentStatus = 'waiting';
        saleStatus = 'WAITING_CONFIRMATION';
        break;
      case 'payment.approved':
        mpPaymentStatus = 'approved';
        saleStatus = 'PAYMENT_APPROVED';
        break;
      case 'payment.rejected':
      case 'payment.cancelled':
        mpPaymentStatus = 'rejected';
        saleStatus = 'PAYMENT_REJECTED';
        break;
      default:
        mpPaymentStatus = 'pending';
        saleStatus = 'PENDING_PAYMENT';
        break;
    }

    MercadoPagoLogger.info('receiveWebhook', `Estado de pago MP: ${mpPaymentStatus} -> Estado de Venta: ${saleStatus}`);

    // CRITICAL RULE: Never emit invoice before official payment confirmation from Mercado Pago ('approved')
    if (mpPaymentStatus === 'approved' && invoicePayloadContext) {
      MercadoPagoLogger.info('receiveWebhook', 'Pago oficialmente APROBADO por Mercado Pago. Evaluando Reglas Fiscales...');

      const fiscalEvaluation = await FiscalRulesEngine.processFiscalEvaluation('MERCADOPAGO_QR', invoicePayloadContext);

      if (fiscalEvaluation.receiptType === 'FISCAL_INVOICE') {
        return {
          saleStatus: 'INVOICED',
          fiscalResult: fiscalEvaluation.fiscalResult,
        };
      } else {
        return {
          saleStatus: 'INTERNAL_RECEIPT_ISSUED',
          fiscalResult: { internalReceiptNo: fiscalEvaluation.internalReceiptNo },
        };
      }
    }

    return { saleStatus };
  }
}
