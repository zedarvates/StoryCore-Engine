/**
 * Logger - Logging structuré avec niveaux
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

export class Logger {
  private static isDevelopment = import.meta.env.DEV;

  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  private static formatLog(entry: LogEntry): string {
    const { level, message, timestamp, data } = entry;
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  private static log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: this.formatTimestamp(),
      data,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formatted, data);
        }
        break;
      case LogLevel.INFO:
        console.info(formatted, data);
        break;
      case LogLevel.WARN:
        console.warn(formatted, data);
        break;
      case LogLevel.ERROR:
        console.error(formatted, data);
        break;
    }
  }

  static debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  static info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  static warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  static error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
}
