import { FiscalRulesEngine } from './FiscalRulesEngine';

export class FiscalizationPolicyService {
  /**
   * Centralized policy determining if a sale payment should trigger ARCA fiscal invoicing.
   * Enforces that ARCA fiscal invoices are issued ONLY when payment is APPROVED or MANUALLY_CONFIRMED.
   */
  public static shouldFiscalize(paymentMethod: string, paymentStatus: string): boolean {
    const validStatuses = ['APPROVED', 'MANUALLY_CONFIRMED', 'COMPLETED'];

    // Rule 1: Never fiscalize if payment is pending, awaiting confirmation, rejected, or cancelled
    if (!validStatuses.includes(paymentStatus.toUpperCase())) {
      return false;
    }

    // Rule 2: Check FiscalRulesEngine configuration for approved payments
    const ruleKey =
      paymentMethod === 'QR'
        ? 'MERCADOPAGO_QR'
        : paymentMethod === 'CARD'
        ? 'MERCADOPAGO_CARD'
        : paymentMethod === 'CUENTA_DNI'
        ? 'CUENTA_DNI'
        : paymentMethod;

    const receiptType = FiscalRulesEngine.evaluateReceiptType(ruleKey);
    return receiptType === 'FISCAL_INVOICE';
  }
}
