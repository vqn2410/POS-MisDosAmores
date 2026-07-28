import { WsaaService } from './wsaa/WsaaService';
import { WsfeService } from './wsfe/WsfeService';
import { TicketAccess } from './wsaa/TicketAccess';
import { TicketRenewalWorker } from './workers/TicketRenewalWorker';
import type {
  ArcaEnvironment,
  ArcaService,
  InvoicePayload,
  InvoiceResult,
  VoucherDetails,
  TaxpayerDetails,
  CreditNotePayload,
  DebitNotePayload,
} from './common/types';

export interface ArcaClientOptions {
  environment?: ArcaEnvironment;
  cuit?: string;
  autoRenewWorker?: boolean;
}

export class ArcaClient {
  private readonly wsaaService: WsaaService;
  private readonly wsfeService: WsfeService;
  private readonly environment: ArcaEnvironment;
  private readonly cuit: string;

  constructor(options: ArcaClientOptions = {}) {
    this.wsaaService = new WsaaService();
    this.wsfeService = new WsfeService();
    this.environment = options.environment || 'testing';
    this.cuit = options.cuit || '20300000007';

    if (options.autoRenewWorker !== false) {
      TicketRenewalWorker.startAutoRenewal('wsfe', this.environment, this.cuit);
    }
  }

  /**
   * Obtains an active Ticket de Acceso (TA) from WSAA (reuses cached TA if valid).
   */
  public async authenticate(service: ArcaService = 'wsfe'): Promise<TicketAccess> {
    return this.wsaaService.getTicketAccess(service, this.environment, this.cuit);
  }

  /**
   * Emits an electronic invoice via WSFEv1.
   */
  public async createInvoice(payload: InvoicePayload): Promise<InvoiceResult> {
    const ta = await this.authenticate('wsfe');
    return this.wsfeService.createInvoice(payload, ta);
  }

  /**
   * Consults details of an existing invoice in WSFEv1.
   */
  public async consultInvoice(voucherType: number, voucherNumber: number, salesPoint = 1): Promise<VoucherDetails> {
    const ta = await this.authenticate('wsfe');
    return this.wsfeService.consultInvoice(voucherType, voucherNumber, salesPoint, ta);
  }

  /**
   * Retrieves the last authorized voucher number for a sales point and voucher type.
   */
  public async lastVoucher(salesPoint: number, voucherType: number): Promise<number> {
    const ta = await this.authenticate('wsfe');
    return this.wsfeService.lastVoucher(salesPoint, voucherType, ta);
  }

  /**
   * Retrieves taxpayer details from Padron A5 AFIP/ARCA.
   */
  public async getTaxpayer(cuit: string): Promise<TaxpayerDetails> {
    const ta = await this.authenticate('ws_sr_padron_a5');
    return this.wsfeService.getTaxpayer(cuit, ta);
  }

  /**
   * Emits a credit note.
   */
  public async createCreditNote(payload: CreditNotePayload): Promise<InvoiceResult> {
    const ta = await this.authenticate('wsfe');
    return this.wsfeService.createCreditNote(payload, ta);
  }

  /**
   * Emits a debit note.
   */
  public async createDebitNote(payload: DebitNotePayload): Promise<InvoiceResult> {
    const ta = await this.authenticate('wsfe');
    return this.wsfeService.createDebitNote(payload, ta);
  }
}
