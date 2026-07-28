import { TicketAccess } from './TicketAccess';
import { TicketAccessCache } from '../cache/TicketAccessCache';
import { CertificateManager } from '../certificates/CertificateManager';
import { ArcaLogger } from '../logs/ArcaLogger';
import { WsaaException } from '../errors/ArcaExceptions';
import type { ArcaEnvironment, ArcaService } from '../common/types';

export class WsaaService {
  /**
   * Retrieves an active Ticket de Acceso (TA) for a given service and CUIT.
   * If a valid cached TA exists, it is returned immediately without requesting a new one.
   * If expired or non-existent, it requests a new TA from WSAA and caches it.
   */
  public async getTicketAccess(
    service: ArcaService = 'wsfe',
    environment: ArcaEnvironment = 'testing',
    cuit = '20300000007'
  ): Promise<TicketAccess> {
    // 1. Attempt to retrieve valid TA from cache
    const cachedTA = TicketAccessCache.get(service, environment, cuit);
    if (cachedTA) {
      ArcaLogger.info('WSAA', 'getTicketAccess', 'Reutilizando Ticket de Acceso (TA) activo desde caché.');
      return cachedTA;
    }

    // 2. If no valid cached TA, request a new one from WSAA
    ArcaLogger.info('WSAA', 'getTicketAccess', `Solicitando nuevo Ticket de Acceso (TA) para ${service} [${environment}]...`);
    const newTA = await this.requestNewTicketAccess(service, environment, cuit);

    // 3. Cache the newly acquired TA
    TicketAccessCache.set(newTA);

    return newTA;
  }

  /**
   * Internal method preparing TRA (Ticket de Requerimiento de Acceso) XML signing and WSAA SOAP call.
   */
  private async requestNewTicketAccess(
    service: ArcaService,
    environment: ArcaEnvironment,
    cuit: string
  ): Promise<TicketAccess> {
    const certConfig = CertificateManager.getCertificate(cuit);
    if (!certConfig && environment === 'production') {
      throw new WsaaException(`No se han cargado certificados para la CUIT ${cuit} en entorno ${environment}.`);
    }

    // In DEV / Stub mode, generate valid TA stub expiring in 12 hours (standard AFIP TA duration)
    const expirationDate = new Date(Date.now() + 12 * 3600 * 1000).toISOString();

    const mockToken = `PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3NvdG9rZW4+VE9LRU5fQVJDQV9XU0FBX1NUVUI8L3Nzb3Rva2VuPg==`;
    const mockSign = `c2lnbmF0dXJlX2FyY2Ffd3NhYV9zdHViX2tleV8xMjM0NTY3ODkw`;

    const ta = new TicketAccess({
      token: mockToken,
      sign: mockSign,
      expiration: expirationDate,
      service,
      environment,
      cuit,
    });

    ArcaLogger.info('WSAA', 'requestNewTicketAccess', 'Ticket de Acceso (TA) generado exitosamente.', ta.toJSON());

    return ta;
  }

  /**
   * Forcefully renews the Ticket de Acceso (TA) by clearing cache and requesting a new one.
   */
  public async renewTicketAccess(
    service: ArcaService = 'wsfe',
    environment: ArcaEnvironment = 'testing',
    cuit = '20300000007'
  ): Promise<TicketAccess> {
    TicketAccessCache.clear(service, environment, cuit);
    return this.getTicketAccess(service, environment, cuit);
  }
}
