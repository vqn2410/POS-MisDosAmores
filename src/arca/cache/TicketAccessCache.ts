import { TicketAccess } from '../wsaa/TicketAccess';
import type { ArcaEnvironment, ArcaService, TicketAccessData } from '../common/types';

export class TicketAccessCache {
  private static readonly STORAGE_PREFIX = 'arca_ta_cache_';
  private static inMemoryStore: Map<string, TicketAccess> = new Map();

  private static getCacheKey(service: ArcaService, environment: ArcaEnvironment, cuit: string): string {
    return `${this.STORAGE_PREFIX}${environment}_${service}_${cuit}`;
  }

  /**
   * Retrieves a cached Ticket de Acceso (TA) if valid and not expired.
   */
  public static get(service: ArcaService, environment: ArcaEnvironment, cuit: string): TicketAccess | null {
    const key = this.getCacheKey(service, environment, cuit);

    // 1. Check in-memory store
    let ta = this.inMemoryStore.get(key) || null;

    // 2. Fallback to localStorage if in-memory is empty
    if (!ta && typeof localStorage !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem(key);
        if (cachedRaw) {
          const parsed: TicketAccessData = JSON.parse(cachedRaw);
          ta = new TicketAccess(parsed);
          this.inMemoryStore.set(key, ta);
        }
      } catch (err) {
        console.warn('Error al leer TA cache de localStorage:', err);
      }
    }

    // 3. Verify if TA exists and is NOT expired (with 10-minute margin)
    if (ta && !ta.isExpired(10)) {
      return ta;
    }

    // If expired, clear it
    if (ta) {
      this.clear(service, environment, cuit);
    }

    return null;
  }

  /**
   * Stores a Ticket de Acceso (TA) in memory and localStorage.
   */
  public static set(ta: TicketAccess): void {
    const key = this.getCacheKey(ta.service, ta.environment, ta.cuit);
    this.inMemoryStore.set(key, ta);

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(ta.toJSON()));
      } catch (err) {
        console.warn('Error al guardar TA cache en localStorage:', err);
      }
    }
  }

  /**
   * Clears the cached Ticket de Acceso (TA).
   */
  public static clear(service: ArcaService, environment: ArcaEnvironment, cuit: string): void {
    const key = this.getCacheKey(service, environment, cuit);
    this.inMemoryStore.delete(key);

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch {
        // silent
      }
    }
  }
}
