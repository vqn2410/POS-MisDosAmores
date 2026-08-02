export interface PaymentLike {
  method: string;
  reference?: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'EFECTIVO',
  CARD: 'TARJETA',
  TRANSFER: 'TRANSFERENCIA',
  CREDIT: 'CRÉDITO CLIENTE',
  QR: 'MERCADO PAGO',
  MIXED: 'PAGO MIXTO',
};

export function paymentMethodKey(p: PaymentLike): string {
  if (p.method === 'QR') {
    return p.reference?.startsWith('CDNI-') ? 'CUENTA_DNI' : 'MERCADOPAGO';
  }
  return p.method;
}

export function paymentMethodLabel(p: PaymentLike): string {
  if (p.method === 'QR') {
    return p.reference?.startsWith('CDNI-') ? 'CUENTA DNI' : 'MERCADO PAGO';
  }
  return PAYMENT_LABELS[p.method] || p.method || 'OTRO';
}
