export interface ArcaLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  action: string;
  message: string;
  data?: any;
}

export class ArcaLogger {
  private static logs: ArcaLogEntry[] = [];

  public static info(service: string, action: string, message: string, data?: any): void {
    this.log('info', service, action, message, data);
  }

  public static warn(service: string, action: string, message: string, data?: any): void {
    this.log('warn', service, action, message, data);
  }

  public static error(service: string, action: string, message: string, data?: any): void {
    this.log('error', service, action, message, data);
  }

  private static log(
    level: 'info' | 'warn' | 'error',
    service: string,
    action: string,
    message: string,
    data?: any
  ): void {
    const entry: ArcaLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      action,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep log buffer manageable
    if (this.logs.length > 500) {
      this.logs.shift();
    }

    if (import.meta.env.DEV) {
      console.log(`[ARCA ${level.toUpperCase()}] [${service}::${action}] ${message}`, data || '');
    }
  }

  public static getLogs(): ArcaLogEntry[] {
    return [...this.logs];
  }
}
