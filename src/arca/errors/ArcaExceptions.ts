export class ArcaException extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, code = 'ARCA_ERROR', details?: any) {
    super(message);
    this.name = 'ArcaException';
    this.code = code;
    this.details = details;
  }
}

export class WsaaException extends ArcaException {
  constructor(message: string, details?: any) {
    super(message, 'WSAA_AUTH_ERROR', details);
    this.name = 'WsaaException';
  }
}

export class WsfeException extends ArcaException {
  constructor(message: string, details?: any) {
    super(message, 'WSFE_INVOICE_ERROR', details);
    this.name = 'WsfeException';
  }
}

export class ExpiredTicketException extends WsaaException {
  constructor(message = 'El Ticket de Acceso (TA) de WSAA ha expirado.') {
    super(message);
    this.name = 'ExpiredTicketException';
  }
}
