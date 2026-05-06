/**
 * Audit Trail Service
 * 
 * Requirements: 109-120
 * Level: 🟡 HAUTE
 * 
 * Comprehensive audit logging for security and compliance
 */

import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  status: 'success' | 'failure' | 'error';
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  details?: Record<string, any>;
  metadata?: {
    browser?: string;
    os?: string;
    device?: string;
    country?: string;
    city?: string;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  responseTime?: number;
}

export interface AuditQueryOptions {
  startDate?: number;
  endDate?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  status?: 'success' | 'failure' | 'error';
  ipAddress?: string;
  limit?: number;
  offset?: number;
}

export interface AuditConfig {
  enabled: boolean;
  logLevel: 'all' | 'important' | 'critical';
  retentionDays: number;
  storage: 'database' | 'file' | 'both';
  includeRequestBody: boolean;
  includeResponseBody: boolean;
  maskSensitiveData: boolean;
}

export class AuditTrailService {
  private logs: AuditLogEntry[] = [];
  private config: AuditConfig;
  private sensitiveFields: Set<string>;

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = {
      enabled: true,
      logLevel: 'all',
      retentionDays: 90,
      storage: 'database',
      includeRequestBody: false,
      includeResponseBody: false,
      maskSensitiveData: true,
      ...config,
    };

    this.sensitiveFields = new Set([
      'password',
      'token',
      'apiKey',
      'secret',
      'privateKey',
      'creditCard',
      'ssn',
      'authorization',
    ]);

    this.startCleanupJob();
  }

  /**
   * Log an action
   */
  public async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }

    const logEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...entry,
    };

    // Mask sensitive data if configured
    if (this.config.maskSensitiveData) {
      this.maskSensitiveData(logEntry);
    }

    // Check log level
    if (!this.shouldLog(logEntry)) {
      return logEntry.id;
    }

    // Store log
    this.logs.push(logEntry);

    // Persist to storage
    await this.persistLog(logEntry);

    return logEntry.id;
  }

  /**
   * Log successful action
   */
  public async logSuccess(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'status'>
  ): Promise<string> {
    return this.log({ ...entry, status: 'success' });
  }

  /**
   * Log failed action
   */
  public async logFailure(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'status'>,
    error?: Error
  ): Promise<string> {
    return this.log({
      ...entry,
      status: 'failure',
      error: error
        ? {
            code: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  /**
   * Log security-related event
   */
  public async logSecurity(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'status'>,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<string> {
    const logId = await this.log({
      ...entry,
      status: 'error',
      metadata: {
        ...entry.metadata,
        securitySeverity: severity,
      },
    });

    // Alert on critical security events
    if (severity === 'critical' || severity === 'high') {
      this.alertSecurityTeam(entry, severity);
    }

    return logId;
  }

  /**
   * Query audit logs
   */
  public async query(options: AuditQueryOptions): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    let filtered = this.logs;

    // Apply filters
    if (options.startDate) {
      filtered = filtered.filter((log) => log.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filtered = filtered.filter((log) => log.timestamp <= options.endDate!);
    }

    if (options.userId) {
      filtered = filtered.filter((log) => log.userId === options.userId);
    }

    if (options.action) {
      filtered = filtered.filter((log) => log.action === options.action);
    }

    if (options.resourceType) {
      filtered = filtered.filter(
        (log) => log.resourceType === options.resourceType
      );
    }

    if (options.status) {
      filtered = filtered.filter((log) => log.status === options.status);
    }

    if (options.ipAddress) {
      filtered = filtered.filter((log) => log.ipAddress === options.ipAddress);
    }

    const total = filtered.length;

    // Apply pagination
    const page = options.offset || 0;
    const limit = options.limit || 100;
    const start = page * limit;
    const end = start + limit;

    const paginated = filtered.slice(start, end);

    return {
      logs: paginated,
      total,
      page,
      limit,
    };
  }

  /**
   * Get audit statistics
   */
  public async getStatistics(): Promise<{
    totalLogs: number;
    successRate: number;
    failureRate: number;
    errorRate: number;
    actionsByUser: Record<string, number>;
    actionsByType: Record<string, number>;
    recentActivity: number;
  }> {
    const totalLogs = this.logs.length;

    if (totalLogs === 0) {
      return {
        totalLogs: 0,
        successRate: 0,
        failureRate: 0,
        errorRate: 0,
        actionsByUser: {},
        actionsByType: {},
        recentActivity: 0,
      };
    }

    const successCount = this.logs.filter((log) => log.status === 'success').length;
    const failureCount = this.logs.filter((log) => log.status === 'failure').length;
    const errorCount = this.logs.filter((log) => log.status === 'error').length;

    const actionsByUser: Record<string, number> = {};
    const actionsByType: Record<string, number> = {};

    this.logs.forEach((log) => {
      actionsByUser[log.userId] = (actionsByUser[log.userId] || 0) + 1;
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
    });

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentActivity = this.logs.filter((log) => log.timestamp >= oneDayAgo).length;

    return {
      totalLogs,
      successRate: (successCount / totalLogs) * 100,
      failureRate: (failureCount / totalLogs) * 100,
      errorRate: (errorCount / totalLogs) * 100,
      actionsByUser,
      actionsByType,
      recentActivity,
    };
  }

  /**
   * Export audit logs
   */
  public async exportLogs(
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear old logs
   */
  public async clearOldLogs(): Promise<number> {
    const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;
    const initialCount = this.logs.length;

    this.logs = this.logs.filter((log) => log.timestamp >= cutoff);

    const removedCount = initialCount - this.logs.length;
    return removedCount;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): AuditConfig {
    return { ...this.config };
  }

  /**
   * Check if action should be logged based on log level
   */
  private shouldLog(entry: AuditLogEntry): boolean {
    if (this.config.logLevel === 'all') {
      return true;
    }

    if (this.config.logLevel === 'critical') {
      return entry.status === 'error' || this.isCriticalAction(entry.action);
    }

    if (this.config.logLevel === 'important') {
      return (
        entry.status !== 'success' ||
        this.isImportantAction(entry.action)
      );
    }

    return true;
  }

  /**
   * Check if action is critical
   */
  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'login',
      'logout',
      'password_change',
      'permission_change',
      'data_export',
      'data_delete',
      'security_breach',
    ];
    return criticalActions.includes(action.toLowerCase());
  }

  /**
   * Check if action is important
   */
  private isImportantAction(action: string): boolean {
    const importantActions = [
      'create',
      'update',
      'delete',
      'export',
      'import',
      'configure',
    ];
    return importantActions.some((act) =>
      action.toLowerCase().includes(act)
    );
  }

  /**
   * Mask sensitive data in log entry
   */
  private maskSensitiveData(entry: AuditLogEntry): void {
    if (entry.details) {
      entry.details = this.maskObject(entry.details);
    }

    if (entry.metadata) {
      entry.metadata = this.maskObject(entry.metadata);
    }
  }

  /**
   * Recursively mask sensitive fields in object
   */
  private maskObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskObject(item));
    }

    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.sensitiveFields.has(key.toLowerCase())) {
        result[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.maskObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Alert security team
   */
  private alertSecurityTeam(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
    severity: string
  ): void {
    console.error(
      `[SECURITY ALERT] ${severity.toUpperCase()}: ${entry.action} ` +
        `by user ${entry.userId} on ${entry.resourceType}`
    );

    // In production, integrate with alerting system (email, Slack, etc.)
    if (process.env.NODE_ENV === 'production') {
      // Send to alerting service
    }
  }

  /**
   * Persist log to configured storage
   */
  private async persistLog(log: AuditLogEntry): Promise<void> {
    if (this.config.storage === 'database') {
      await this.persistToDatabase(log);
    } else if (this.config.storage === 'file') {
      await this.persistToFile(log);
    } else if (this.config.storage === 'both') {
      await Promise.all([
        this.persistToDatabase(log),
        this.persistToFile(log),
      ]);
    }
  }

  /**
   * Persist log to database (placeholder)
   */
  private async persistToDatabase(log: AuditLogEntry): Promise<void> {
    // Implementation depends on database type
    // This is a placeholder for database persistence logic
    console.log('[Audit] Persisting to database:', log.id);
  }

  /**
   * Persist log to file (placeholder)
   */
  private async persistToFile(log: AuditLogEntry): Promise<void> {
    // Implementation for file-based logging
    console.log('[Audit] Persisting to file:', log.id);
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(): string {
    if (this.logs.length === 0) {
      return '';
    }

    const headers = [
      'id',
      'timestamp',
      'userId',
      'userEmail',
      'action',
      'resourceType',
      'resourceId',
      'status',
      'ipAddress',
      'userAgent',
      'sessionId',
      'requestId',
      'details',
      'error',
      'responseTime',
    ];

    const rows = this.logs.map((log) =>
      headers.map((header) => {
        const value = (log as any)[header];
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        return String(value).replace(/"/g, '""');
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Start periodic cleanup job
   */
  private startCleanupJob(): void {
    // Run cleanup every 24 hours
    setInterval(() => {
      this.clearOldLogs().then((removed) => {
        if (removed > 0) {
          console.log(`[Audit] Cleaned up ${removed} old log entries`);
        }
      });
    }, 24 * 60 * 60 * 1000);
  }
}

// Global audit trail instance
export const auditTrail = new AuditTrailService({
  enabled: process.env.NODE_ENV === 'production',
  logLevel: process.env.NODE_ENV === 'production' ? 'important' : 'all',
  retentionDays: 90,
  storage: 'database',
  maskSensitiveData: true,
});

/**
 * Audit decorator for methods
 */
export function audited(
  options: {
    action: string;
    resourceType: string;
    logLevel?: 'all' | 'important' | 'critical';
  } = { action: 'unknown', resourceType: 'unknown' }
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const userId = (this as any).userId || 'anonymous';
      const sessionId = (this as any).sessionId || crypto.randomUUID();

      try {
        const result = await originalMethod.apply(this, args);
        const responseTime = Date.now() - startTime;

        if (options.logLevel !== 'critical') {
          await auditTrail.logSuccess({
            userId,
            sessionId,
            action: options.action,
            resourceType: options.resourceType,
            resourceId: args[0]?.id || args[0]?.taskId,
            details: { method: String(propertyKey), args },
            responseTime,
          });
        }

        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;

        await auditTrail.logFailure(
          {
            userId,
            sessionId,
            action: options.action,
            resourceType: options.resourceType,
            resourceId: args[0]?.id || args[0]?.taskId,
            details: { method: String(propertyKey), args },
            responseTime,
          },
          error instanceof Error ? error : new Error(String(error))
        );

        throw error;
      }
    };

    return descriptor;
  };
}
