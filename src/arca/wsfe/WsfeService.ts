import type {
  InvoicePayload,
  InvoiceResult,
  VoucherDetails,
  TaxpayerDetails,
  CreditNotePayload,
  DebitNotePayload,
} from '../common/types';
import { TicketAccess } from '../wsaa/TicketAccess';
import { ArcaLogger } from '../logs/ArcaLogger';

export class WsfeService {
  /**
   * Stubs for WSFEv1 electronic invoice creation (FECAESolicitar).
   */
  public async createInvoice(payload: InvoicePayload, ta: TicketAccess): Promise<InvoiceResult> {
    ArcaLogger.info('WSFE', 'createInvoice', 'Creando comprobante electrónico (FECAESolicitar)...', { payload, taToken: ta.token.slice(0, 15) });

    const mockVoucherNumber = Math.floor(1000 + Math.random() * 9000);
    const mockCae = `7402910${Math.floor(10000000 + Math.random() * 90000000)}`;

    return {
      cae: mockCae,
      caeExpiration: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, ''),
      voucherNumber: mockVoucherNumber,
      salesPoint: payload.salesPoint,
      voucherType: payload.voucherType,
      result: 'A',
      observations: [],
    };
  }

  /**
   * Stubs for WSFEv1 invoice consultation (FECompConsultar).
   */
  public async consultInvoice(voucherType: number, voucherNumber: number, salesPoint: number, ta: TicketAccess): Promise<VoucherDetails> {
    ArcaLogger.info('WSFE', 'consultInvoice', `Consultando comprobante ${voucherType}-${salesPoint}-${voucherNumber}...`, { taToken: ta.token.slice(0, 15) });

    return {
      voucherType,
      voucherNumber,
      salesPoint,
      cae: '740291088219451',
      caeExpiration: '20260810',
      docType: 80,
      docNumber: '30112233445',
      grandTotal: 1250.0,
      date: '20260728',
      status: 'A',
    };
  }

  /**
   * Stubs for WSFEv1 last authorized voucher number (FECompUltimoAutorizado).
   */
  public async lastVoucher(salesPoint: number, voucherType: number, ta: TicketAccess): Promise<number> {
    ArcaLogger.info('WSFE', 'lastVoucher', `Obteniendo último comprobante autorizado para PtoVta ${salesPoint} Tipo ${voucherType}...`, { taToken: ta.token.slice(0, 15) });
    return 1042;
  }

  /**
   * Stubs for Padron A5 taxpayer details (getTaxpayer).
   */
  public async getTaxpayer(cuit: string, ta: TicketAccess): Promise<TaxpayerDetails> {
    ArcaLogger.info('WSFE', 'getTaxpayer', `Consultando Padrón A5 para CUIT ${cuit}...`, { taToken: ta.token.slice(0, 15) });

    return {
      cuit,
      name: 'Empresa Ejemplo Argentina S.A.',
      type: 'PERSONA JURIDICA',
      taxCategory: 'RESPONSABLE INSCRIPTO',
      address: 'Av. Corrientes 1234, CABA',
      active: true,
    };
  }

  /**
   * Stubs for Credit Note creation.
   */
  public async createCreditNote(payload: CreditNotePayload, ta: TicketAccess): Promise<InvoiceResult> {
    ArcaLogger.info('WSFE', 'createCreditNote', 'Creando Nota de Crédito...', { payload, taToken: ta.token.slice(0, 15) });
    return this.createInvoice(payload, ta);
  }

  /**
   * Stubs for Debit Note creation.
   */
  public async createDebitNote(payload: DebitNotePayload, ta: TicketAccess): Promise<InvoiceResult> {
    ArcaLogger.info('WSFE', 'createDebitNote', 'Creando Nota de Débito...', { payload, taToken: ta.token.slice(0, 15) });
    return this.createInvoice(payload, ta);
  }
}
