import { ArcaClient } from '../../../arca/ArcaClient';
import type { InvoicePayload, InvoiceResult } from '../../../arca/common/types';

export type ReceiptType = 'INTERNAL_RECEIPT' | 'FISCAL_INVOICE';

export interface FacturationRuleConfig {
  [paymentMethod: string]: ReceiptType;
}

// Configurable default rules: QR and Card via Mercado Pago generate Fiscal Invoice (ARCA), others generate Internal Receipt
export const defaultFacturationRules: FacturationRuleConfig = {
  CASH: 'INTERNAL_RECEIPT',
  TRANSFER: 'INTERNAL_RECEIPT',
  CREDIT: 'INTERNAL_RECEIPT',
  MERCADOPAGO_QR: 'FISCAL_INVOICE',
  MERCADOPAGO_CARD: 'FISCAL_INVOICE',
  CARD: 'INTERNAL_RECEIPT',
};

export class FiscalRulesEngine {
  private static rules: FacturationRuleConfig = { ...defaultFacturationRules };
  private static arcaClient = new ArcaClient();

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
   * If rule is FISCAL_INVOICE, invokes ArcaClient to issue invoice and obtain CAE.
   * If INTERNAL_RECEIPT, generates internal ticket receipt.
   */
  public static async processFiscalEvaluation(
    paymentMethod: string,
    invoicePayload: InvoicePayload
  ): Promise<{ receiptType: ReceiptType; fiscalResult?: InvoiceResult; internalReceiptNo?: string }> {
    const receiptType = this.evaluateReceiptType(paymentMethod);

    if (receiptType === 'FISCAL_INVOICE') {
      // Send to ARCA module for official electronic invoicing & CAE
      const fiscalResult = await this.arcaClient.createInvoice(invoicePayload);
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
