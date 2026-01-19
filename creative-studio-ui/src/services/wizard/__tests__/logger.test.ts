/**
 * Logger Tests
 * 
 * Tests for wizard logging service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WizardLogger, createLogger, getLogger } from '../logger';
import { WizardError } from '../types';

describe('WizardLogger', () => {
  let logger: WizardLogger;

  beforeEach(() => {
    logger = createLogger({ enableFile: false }); // Disable file logging for tests
    logger.clearLogs();
  });

  describe('logging methods', () => {
    it('should log debug messages', () => {
      logger.debug('test', 'Debug message', { data: 'test' });
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('debug');
      expect(logs[0].category).toBe('test');
      expect(logs[0].message).toBe('Debug message');
    });

    it('should log info messages', () => {
      logger.info('test', 'Info message');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('info');
    });

    it('should log warning messages', () => {
      logger.warn('test', 'Warning message');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warn');
    });

    it('should log error messages', () => {
      const error = new Error('Test error');
      logger.error('test', 'Error message', error);
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].error).toBe(error);
    });
  });

  describe('logWizardError', () => {
    it('should log wizard errors with context', () => {
      const wizardError = new WizardError('Test error', 'connection', true, true);
      logger.logWizardError(wizardError, { extra: 'context' });
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].category).toBe('connection');
      expect(logs[0].details?.recoverable).toBe(true);
      expect(logs[0].details?.retryable).toBe(true);
    });
  });

  describe('log filtering', () => {
    beforeEach(() => {
      logger.debug('cat1', 'Debug 1');
      logger.info('cat1', 'Info 1');
      logger.warn('cat2', 'Warn 1');
      logger.error('cat2', 'Error 1');
    });

    it('should filter by level', () => {
      const errorLogs = logger.getLogs({ level: 'error' });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
    });

    it('should filter by category', () => {
      const cat1Logs = logger.getLogs({ category: 'cat1' });
      expect(cat1Logs).toHaveLength(2);
      expect(cat1Logs.every(log => log.category === 'cat1')).toBe(true);
    });

    it('should get logs by category', () => {
      const cat2Logs = logger.getLogsByCategory('cat2');
      expect(cat2Logs).toHaveLength(2);
    });

    it('should get error logs only', () => {
      const errorLogs = logger.getErrorLogs();
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].level).toBe('error');
    });
  });

  describe('log level configuration', () => {
    it('should respect minimum log level', () => {
      const warnLogger = createLogger({ level: 'warn', enableFile: false });
      
      warnLogger.debug('test', 'Debug');
      warnLogger.info('test', 'Info');
      warnLogger.warn('test', 'Warn');
      warnLogger.error('test', 'Error');
      
      const logs = warnLogger.getLogs();
      expect(logs).toHaveLength(2); // Only warn and error
    });

    it('should allow changing log level', () => {
      logger.setLevel('error');
      
      logger.info('test', 'Info');
      logger.error('test', 'Error');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1); // Only error
    });

    it('should get current log level', () => {
      logger.setLevel('warn');
      expect(logger.getLevel()).toBe('warn');
    });
  });

  describe('log management', () => {
    it('should clear logs', () => {
      logger.info('test', 'Message 1');
      logger.info('test', 'Message 2');
      
      expect(logger.getLogs()).toHaveLength(2);
      
      logger.clearLogs();
      expect(logger.getLogs()).toHaveLength(0);
    });

    it('should limit log size', () => {
      const smallLogger = createLogger({ maxLogSize: 5, enableFile: false });
      
      for (let i = 0; i < 10; i++) {
        smallLogger.info('test', `Message ${i}`);
      }
      
      const logs = smallLogger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      logger.debug('cat1', 'Debug');
      logger.info('cat1', 'Info');
      logger.warn('cat2', 'Warn');
      logger.error('cat2', 'Error');
    });

    it('should calculate statistics', () => {
      const stats = logger.getStatistics();
      
      expect(stats.total).toBe(4);
      expect(stats.byLevel.debug).toBe(1);
      expect(stats.byLevel.info).toBe(1);
      expect(stats.byLevel.warn).toBe(1);
      expect(stats.byLevel.error).toBe(1);
      expect(stats.byCategory.cat1).toBe(2);
      expect(stats.byCategory.cat2).toBe(2);
    });
  });

  describe('export', () => {
    it('should export logs as JSON', () => {
      logger.info('test', 'Message 1');
      logger.warn('test', 'Message 2');
      
      const json = logger.exportLogs();
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should export filtered logs', () => {
      logger.info('test', 'Info');
      logger.error('test', 'Error');
      
      const json = logger.exportLogs({ level: 'error' });
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].level).toBe('error');
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      
      expect(logger1).toBe(logger2);
    });
  });

  describe('console logging', () => {
    it('should allow disabling console logging', () => {
      const consoleLogger = createLogger({ enableConsole: false });
      
      const consoleSpy = vi.spyOn(console, 'info');
      consoleLogger.info('test', 'Message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
