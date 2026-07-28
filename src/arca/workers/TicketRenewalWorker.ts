import { WsaaService } from '../wsaa/WsaaService';
import { ArcaLogger } from '../logs/ArcaLogger';
import type { ArcaEnvironment, ArcaService } from '../common/types';

export class TicketRenewalWorker {
  private static timer: any = null;
  private static wsaaService = new WsaaService();

  /**
   * Starts background monitoring to auto-renew Ticket de Acceso (TA) prior to expiration.
   * @param checkIntervalMinutes Frequency to check TA expiration status (default 5 mins).
   */
  public static startAutoRenewal(
    service: ArcaService = 'wsfe',
    environment: ArcaEnvironment = 'testing',
    cuit = '20300000007',
    checkIntervalMinutes = 5
  ): void {
    if (this.timer) return; // Already running

    ArcaLogger.info('Worker', 'startAutoRenewal', `Worker de auto-renovación de TA iniciado (check cada ${checkIntervalMinutes} min).`);

    this.timer = setInterval(async () => {
      try {
        const ta = await this.wsaaService.getTicketAccess(service, environment, cuit);
        if (ta.isExpired(15)) {
          ArcaLogger.info('Worker', 'autoRenew', 'Ticket próximo a expirar (15 min). Renovando...');
          await this.wsaaService.renewTicketAccess(service, environment, cuit);
        }
      } catch (err) {
        ArcaLogger.error('Worker', 'autoRenew', 'Error en el worker de auto-renovación de TA:', err);
      }
    }, checkIntervalMinutes * 60 * 1000);
  }

  /**
   * Stops the auto-renewal background worker.
   */
  public static stopAutoRenewal(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      ArcaLogger.info('Worker', 'stopAutoRenewal', 'Worker de auto-renovación detenido.');
    }
  }
}
