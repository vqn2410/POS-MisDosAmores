export type MercadoPagoQrStatus = 'waiting' | 'approved' | 'rejected' | 'cancelled';

interface CreateMercadoPagoQrInput {
  externalReference: string;
  title: string;
  totalAmount: number;
  items: Array<{ title: string; quantity: number; unitPrice: number }>;
}

interface MercadoPagoQrOrder {
  externalReference: string;
  orderId: string | null;
  qrData: string | null;
}

interface MercadoPagoQrPaymentStatus {
  status: MercadoPagoQrStatus;
  paymentId?: string;
  detail?: string;
}

interface MercadoPagoStaticPaymentMatch {
  found: boolean;
  payment?: {
    id: string;
    amount: number;
    approvedAt: string;
    paymentMethod: string;
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo comunicar con Mercado Pago local.');
  return data as T;
}

export function createMercadoPagoQr(input: CreateMercadoPagoQrInput) {
  return request<MercadoPagoQrOrder>('/api/mercadopago/qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function cancelMercadoPagoQr() {
  return request<{ cancelled: boolean }>('/api/mercadopago/qr', { method: 'DELETE' });
}

export function getMercadoPagoQrStatus(externalReference: string) {
  return request<MercadoPagoQrPaymentStatus>(`/api/mercadopago/status/${encodeURIComponent(externalReference)}`);
}

export function findMercadoPagoStaticQrPayment(amount: number, since: string) {
  return request<MercadoPagoStaticPaymentMatch>(`/api/mercadopago/static-qr/payment?amount=${encodeURIComponent(amount)}&since=${encodeURIComponent(since)}`);
}

export function getMercadoPagoStaticQr() {
  return request<{ qrData: string }>('/api/mercadopago/static-qr');
}
