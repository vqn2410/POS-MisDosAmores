export interface MPLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  data?: any;
}

export class MercadoPagoLogger {
  private static logs: MPLogEntry[] = [];

  public static info(action: string, message: string, data?: any): void {
    this.log('info', action, message, data);
  }

  public static warn(action: string, message: string, data?: any): void {
    this.log('warn', action, message, data);
  }

  public static error(action: string, message: string, data?: any): void {
    this.log('error', action, message, data);
  }

  private static log(level: 'info' | 'warn' | 'error', action: string, message: string, data?: any): void {
    const entry: MPLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      action,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.shift();

    if (import.meta.env.DEV) {
      console.log(`[MERCADO PAGO ${level.toUpperCase()}] [${action}] ${message}`, data || '');
    }
  }

  public static getLogs(): MPLogEntry[] {
    return [...this.logs];
  }
}
