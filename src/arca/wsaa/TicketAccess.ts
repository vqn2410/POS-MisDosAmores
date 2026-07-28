import type { TicketAccessData, ArcaEnvironment, ArcaService } from '../common/types';

export class TicketAccess {
  public readonly token: string;
  public readonly sign: string;
  public readonly expiration: Date;
  public readonly service: ArcaService;
  public readonly environment: ArcaEnvironment;
  public readonly cuit: string;

  constructor(data: TicketAccessData) {
    this.token = data.token;
    this.sign = data.sign;
    this.expiration = new Date(data.expiration);
    this.service = data.service;
    this.environment = data.environment;
    this.cuit = data.cuit;
  }

  /**
   * Checks if the Ticket de Acceso (TA) has expired or is about to expire within the safety margin.
   * @param marginMinutes Safety margin in minutes before actual expiration (default 10 mins).
   */
  public isExpired(marginMinutes = 10): boolean {
    const now = new Date();
    const expirationWithMargin = new Date(this.expiration.getTime() - marginMinutes * 60 * 1000);
    return now >= expirationWithMargin;
  }

  /**
   * Serializes the TA data to plain object.
   */
  public toJSON(): TicketAccessData {
    return {
      token: this.token,
      sign: this.sign,
      expiration: this.expiration.toISOString(),
      service: this.service,
      environment: this.environment,
      cuit: this.cuit,
    };
  }
}
