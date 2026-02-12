// Logger centralisé pour StoryCore Creative Studio

export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LoggerConfig {
  level: LogLevel;
  enableColors: boolean;
  prefix?: string;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private prefix: string = '';
  private colors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: '#6c757d',  // gray
    [LogLevel.INFO]: '#0d6efd',   // blue
    [LogLevel.WARN]: '#ffc107',   // yellow
    [LogLevel.ERROR]: '#dc3545',  // red
    [LogLevel.NONE]: '',
  };

  configure(config: Partial<LoggerConfig>): void {
    if (config.level !== undefined) this.level = config.level;
    if (config.prefix !== undefined) this.prefix = config.prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(message: string, level: LogLevel): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    return `${timestamp} ${prefix}${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    console.debug(this.formatMessage(message, LogLevel.DEBUG), ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    console.info(this.formatMessage(message, LogLevel.INFO), ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    console.warn(this.formatMessage(message, LogLevel.WARN), ...args);
  }

  error(message: string | Error, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    console.error(this.formatMessage(message.toString(), LogLevel.ERROR), ...args);
  }

  // Méthodes de commodité
  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
  }

  group(label: string): void {
    console.group(label);
  }

  groupEnd(): void {
    console.groupEnd();
  }
}

// Instance globale
export const logger = new Logger();

// Configuration selon l'environnement
const isDevelopment = (): boolean => {
  return import.meta.env?.DEV || process.env?.NODE_ENV === 'development';
};

if (isDevelopment()) {
  logger.configure({ level: LogLevel.DEBUG });
} else {
  logger.configure({ level: LogLevel.WARN }); // WARN en prod
}

export default logger;
