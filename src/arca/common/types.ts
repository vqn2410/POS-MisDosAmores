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
  salesPoint?: number; // El server usa el punto de venta configurado (.env ARCA_SALES_POINT).
  voucherType?: number; // 1: Factura A, 6: Factura B, 11: Factura C. Si no se envía, el server lo deriva según la condición fiscal del emisor.
  concept: number; // 1: Productos, 2: Servicios, 3: Productos y Servicios
  docType: number; // 80: CUIT, 96: DNI, 99: Consumidor Final
  docNumber: string;
  condicionIvaId?: number; // Condición frente al IVA del receptor (RG 5616). Default server: 5 (Consumidor Final).
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  date?: string; // YYYYMMDD
  associatedInvoice?: {
    voucherType: number;
    salesPoint: number;
    voucherNumber: number;
  };
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
  voucherType: 3 | 13; // 3: NC A, 13: NC C
}

export interface DebitNotePayload extends InvoicePayload {
  voucherType: 2 | 12; // 2: ND A, 12: ND C
}
