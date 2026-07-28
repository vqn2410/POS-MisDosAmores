export type ArcaEnvironment = 'testing' | 'production';
export type ArcaService = 'wsfe' | 'ws_sr_padron_a5';

export interface TicketAccessData {
  token: string;
  sign: string;
  expiration: string; // ISO string
  service: ArcaService;
  environment: ArcaEnvironment;
  cuit: string;
}

export interface InvoicePayload {
  salesPoint: number;
  voucherType: number; // 1: Factura A, 6: Factura B, 11: Factura C
  concept: number; // 1: Productos, 2: Servicios, 3: Productos y Servicios
  docType: number; // 80: CUIT, 96: DNI, 99: Consumidor Final
  docNumber: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  date?: string; // YYYYMMDD
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    subtotal: number;
  }>;
}

export interface InvoiceResult {
  cae: string;
  caeExpiration: string;
  voucherNumber: number;
  salesPoint: number;
  voucherType: number;
  result: 'A' | 'R'; // A: Aprobado, R: Rechazado
  observations?: string[];
  errors?: string[];
}

export interface VoucherDetails {
  voucherType: number;
  voucherNumber: number;
  salesPoint: number;
  cae: string;
  caeExpiration: string;
  docType: number;
  docNumber: string;
  grandTotal: number;
  date: string;
  status: string;
}

export interface TaxpayerDetails {
  cuit: string;
  name: string;
  type: string; // PERSONA FISICA / JURIDICA
  taxCategory: string; // RESPONSABLE INSCRIPTO / MONOTRIBUTO / EXENTO
  address?: string;
  active: boolean;
}

export interface CreditNotePayload extends InvoicePayload {
  associatedVoucherType: number;
  associatedVoucherNumber: number;
}

export interface DebitNotePayload extends InvoicePayload {
  associatedVoucherType: number;
  associatedVoucherNumber: number;
}
