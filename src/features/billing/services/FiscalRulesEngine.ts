import { createArcaInvoice } from '../../../services/arcaApi';
import type { InvoicePayload, InvoiceResult } from '../../../arca/common/types';

export type ReceiptType = 'INTERNAL_RECEIPT' | 'FISCAL_INVOICE';

export interface FacturationRuleConfig {
  [paymentMethod: string]: ReceiptType;
}

// Only Mercado Pago, Cuenta DNI and card payments generate a Fiscal Invoice (ARCA).
// Cash, transfer and client credit only generate an Internal Receipt.
export const defaultFacturationRules: FacturationRuleConfig = {
  CASH: 'INTERNAL_RECEIPT',
  TRANSFER: 'INTERNAL_RECEIPT',
  CREDIT: 'INTERNAL_RECEIPT',
  MERCADOPAGO_QR: 'FISCAL_INVOICE',
  MERCADOPAGO_CARD: 'FISCAL_INVOICE',
  CUENTA_DNI: 'FISCAL_INVOICE',
  CARD: 'FISCAL_INVOICE',
};

export class FiscalRulesEngine {
  private static rules: FacturationRuleConfig = { ...defaultFacturationRules };

  /**
   * Retrieves current facturation rules configuration.
   */
  public static getRules(): FacturationRuleConfig {
    return { ...this.rules };
  }

  /**
   * Updates a facturation rule for a specific payment method.
   */
  public static setRule(paymentMethod: string, receiptType: ReceiptType): void {
    this.rules[paymentMethod] = receiptType;
  }

  /**
   * Evaluates if a given payment method requires a Fiscal Invoice (ARCA) or Internal Receipt.
   */
  public static evaluateReceiptType(paymentMethod: string): ReceiptType {
    return this.rules[paymentMethod] || 'INTERNAL_RECEIPT';
  }

  /**
   * Processes post-payment fiscal rules evaluation.
   * If rule is FISCAL_INVOICE, requests the server to issue the invoice via ARCA and obtain CAE.
   * If INTERNAL_RECEIPT, generates internal ticket receipt.
   */
  public static async processFiscalEvaluation(
    paymentMethod: string,
    invoicePayload: InvoicePayload
  ): Promise<{ receiptType: ReceiptType; fiscalResult?: InvoiceResult; internalReceiptNo?: string }> {
    const receiptType = this.evaluateReceiptType(paymentMethod);

    if (receiptType === 'FISCAL_INVOICE') {
      const { fiscalResult } = await createArcaInvoice(invoicePayload);
      return {
        receiptType: 'FISCAL_INVOICE',
        fiscalResult,
      };
    } else {
      // Generate internal receipt
      const internalReceiptNo = `REC-INT-${Date.now().toString().slice(-6)}`;
      return {
        receiptType: 'INTERNAL_RECEIPT',
        internalReceiptNo,
      };
    }
  }
}
