const REJECTION_SIMULATIONS = {
  // Claves "especiales" para simular rechazos deterministas del banco en modo stub.
  '111111': { code: 'INSUFFICIENT_FUNDS', reason: 'Saldo insuficiente en la cuenta del cliente.' },
  '222222': { code: 'EXPIRED_CLAVE', reason: 'La Clave DNI venció o ya fue utilizada.' },
  '333333': { code: 'CUSTOMER_NOT_FOUND', reason: 'No se encontró el DNI del cliente en Cuenta DNI.' },
};

export class CuentaDniClient {
  constructor(config) {
    this.config = config;
  }

  isStub() {
    return this.config.stub;
  }

  /**
   * Cursa un cobro con Clave DNI contra RedLink/Link.
   * Mientras no haya credenciales reales (stub = true), responde de forma determinista
   * para poder ejercitar la máquina de estados del POS.
   */
  async chargeClaveDni({ amount, externalReference, customerDni, claveDni }) {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      throw new Error('El monto del cobro debe ser mayor a cero.');
    }
    if (!externalReference) {
      throw new Error('Falta la referencia externa del cobro.');
    }

    const dni = String(customerDni || '').replace(/\D/g, '');
    if (dni.length < 7 || dni.length > 8) {
      throw new Error('El DNI del cliente debe tener 7 u 8 dígitos.');
    }

    const clave = String(claveDni || '').trim();
    if (!clave) {
      throw new Error('La Clave DNI es obligatoria.');
    }

    if (!this.config.stub) {
      throw new Error(
        'Integración RedLink no configurada. Definí CDNI_REDLINK_BASE_URL, CDNI_REDLINK_CLIENT_ID, CDNI_REDLINK_CLIENT_SECRET y CDNI_REDLINK_MERCHANT_ID.'
      );
    }

    const simulation = REJECTION_SIMULATIONS[clave];
    if (simulation) {
      return {
        status: 'REJECTED',
        rejectionCode: simulation.code,
        rejectionReason: simulation.reason,
      };
    }

    return {
      status: 'APPROVED',
      operationId: `CDNI-OP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
  }
}
