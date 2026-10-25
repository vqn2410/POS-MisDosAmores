import type { InvoicePayload, InvoiceResult } from '../arca/common/types';

const ARCA_BASE = '/api/arca';

interface ArcaTaInfo {
  service: string;
  expiration: string;
  stub: boolean;
  cached?: boolean;
}

export interface ArcaConfig {
  cuit: string | null;
  environment: 'testing' | 'production';
  salesPoint: number;
  emitter: {
    name: string | null;
    address: string | null;
    taxCondition: string;
  };
  stub: boolean;
}

export interface ArcaStatus extends ArcaConfig {
  ta: ArcaTaInfo;
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${ARCA_BASE}${path}`, {
      ...init,
      signal: init?.signal || controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error en el servicio ARCA.');
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado con el servicio ARCA.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const getArcaConfig = () => request<ArcaConfig>('/config');

export const getArcaStatus = () => request<ArcaStatus>('/status');

export const createArcaInvoice = (payload: InvoicePayload) =>
  request<{ fiscalResult: InvoiceResult }>('/invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const getArcaLastVoucher = (salesPoint: number, voucherType: number) =>
  request<{ salesPoint: number; voucherType: number; lastVoucher: number }>(
    `/last-voucher?voucherType=${voucherType}&salesPoint=${salesPoint}`
  );

export interface ArcaComprobante {
  voucherType: number;
  salesPoint: number;
  voucherNumber: number;
  date: string;
  amount: number;
  result: string;
  cae: string;
}

export interface ArcaInvoiceDetails extends ArcaComprobante {
  caeExpiration: string;
  docType: number;
  docNumber: string;
  grandTotal: number;
  status: string;
}

export const getArcaInvoice = (voucherType: number, voucherNumber: number, salesPoint: number) =>
  request<ArcaInvoiceDetails>(`/consult?voucherType=${voucherType}&voucherNumber=${voucherNumber}&salesPoint=${salesPoint}`);
