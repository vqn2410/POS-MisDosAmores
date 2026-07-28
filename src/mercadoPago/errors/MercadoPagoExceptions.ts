export class MercadoPagoException extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code = 'MERCADOPAGO_ERROR', details?: any) {
    super(message);
    this.name = 'MercadoPagoException';
    this.code = code;
    this.details = details;
  }
}

export class WebhookSignatureException extends MercadoPagoException {
  constructor(message = 'La firma HMAC del Webhook de Mercado Pago es inválida.') {
    super(message, 'INVALID_WEBHOOK_SIGNATURE');
    this.name = 'WebhookSignatureException';
  }
}
