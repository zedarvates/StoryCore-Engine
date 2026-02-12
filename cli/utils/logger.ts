/**
 * Logger Utility for StoryCore CLI
 * Provides colored console logging with configurable log levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

type LogHandler = (message: LogMessage) => void;

/**
 * Logger class for CLI output with color support
 */
export class Logger {
  private static _instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private handlers: LogHandler[] = [];
  private colors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: '\x1b[90m',  // Gray
    [LogLevel.INFO]: '\x1b[36m',   // Cyan
    [LogLevel.WARN]: '\x1b[33m',   // Yellow
    [LogLevel.ERROR]: '\x1b[31m',  // Red
    [LogLevel.SILENT]: '\x1b[0m'   // Reset
  };

  private constructor() {
    // Add default console handler
    this.addHandler(this.consoleHandler.bind(this));
  }

  /**
   * Get singleton instance
   */
  static get instance(): Logger {
    if (!Logger._instance) {
      Logger._instance = new Logger();
    }
    return Logger._instance;
  }

  /**
   * Get logger instance (exported convenience)
   */
  static getLogger(): Logger {
    return Logger.instance;
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Get current log level
   */
  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  /**
   * Add custom log handler
   */
  addHandler(handler: LogHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Remove custom log handler
   */
  removeHandler(handler: LogHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * Console handler for default output
   */
  private consoleHandler(msg: LogMessage): void {
    const reset = '\x1b[0m';
    const color = this.colors[msg.level];
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    
    let output = `[${timestamp}] ${color}${LogLevel[msg.level].padEnd(5)}${reset} ${msg.message}`;
    
    if (msg.data) {
      const dataStr = JSON.stringify(msg.data, null, 2);
      output += `\n${dataStr}`;
    }

    switch (msg.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.log(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (level < this.logLevel) return;

    const logMessage: LogMessage = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data
    };

    for (const handler of this.handlers) {
      handler(logMessage);
    }
  }

  /**
   * Create a child logger with prefix
   */
  child(prefix: string): Logger {
    const child = new Logger();
    child.setLogLevel(this.logLevel);
    
    const originalHandlers = [...this.handlers];
    child.handlers = originalHandlers.map(handler => 
      (msg: LogMessage) => handler({ ...msg, message: `[${prefix}] ${msg.message}` })
    );
    
    return child;
  }

  /**
   * Clear all handlers except console
   */
  resetHandlers(): void {
    this.handlers = [this.consoleHandler.bind(this)];
  }

  /**
   * Format success message with checkmark
   */
  success(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, `✓ ${message}`, data);
  }

  /**
   * Format failure message with X mark
   */
  failure(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, `✗ ${message}`, data);
  }

  /**
   * Format info message with arrow
   */
  step(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, `→ ${message}`, data);
  }

  /**
   * Format progress message
   */
  progress(current: number, total: number, message: string): void {
    const percent = Math.round((current / total) * 100);
    const bar = this.createProgressBar(percent);
    this.log(LogLevel.INFO, `${bar} ${percent}% ${message}`);
  }

  /**
   * Create ASCII progress bar
   */
  private createProgressBar(percent: number, width: number = 30): string {
    const filled = Math.round((width * percent) / 100);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }
}

// Export singleton instance
export const logger = Logger.getLogger();
