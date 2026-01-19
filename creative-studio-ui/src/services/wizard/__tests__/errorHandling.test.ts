/**
 * Error Handling Tests
 * 
 * Tests for error message generation, retry logic, session preservation,
 * and error logging functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WizardError } from '../types';
import {
  generateErrorMessage,
  formatErrorMessage,
  createUserFriendlyError,
  getRecoveryActions,
  isErrorActionable,
} from '../errorHandling';
import {
  RetryManager,
  executeWithRetry,
  getPreservedParameters,
} from '../retryLogic';
import {
  SessionPreservationManager,
  saveWizardSession,
  loadWizardSession,
  deleteWizardSession,
} from '../sessionPreservation';
import {
  ErrorLogger,
  logWizardError,
} from '../errorLogger';

describe('Error Message Generation', () => {
  it('should generate connection error message with recovery instructions', () => {
    const error = new WizardError(
      'Connection refused',
      'connection',
      true,
      true,
      { service: 'ollama', endpoint: 'http://localhost:11434' }
    );

    const message = generateErrorMessage(error, {
      service: 'ollama',
      endpoint: 'http://localhost:11434',
    });

    expect(message.title).toContain('Ollama');
    expect(message.description).toContain('Connection refused');
    expect(message.recoveryInstructions.length).toBeGreaterThan(0);
    expect(message.actionable).toBe(true);
  });

  it('should generate validation error message', () => {
    const error = new WizardError(
      'Invalid input',
      'validation',
      true,
      false,
      { errors: ['Name is required', 'Duration must be positive'] }
    );

    const message = generateErrorMessage(error);

    expect(message.title).toBe('Validation Error');
    expect(message.recoveryInstructions.length).toBeGreaterThan(0);
  });

  it('should format error message for display', () => {
    const error = new WizardError(
      'Test error',
      'generation',
      true,
      true
    );

    const message = generateErrorMessage(error);
    const formatted = formatErrorMessage(message);

    expect(formatted).toContain(message.title);
    expect(formatted).toContain(message.description);
    expect(formatted).toContain('How to resolve:');
  });

  it('should identify actionable errors', () => {
    const actionableError = new WizardError(
      'Connection failed',
      'connection',
      true,
      true
    );

    const nonActionableError = new WizardError(
      'Data format error',
      'datacontract',
      false,
      false
    );

    expect(isErrorActionable(actionableError)).toBe(true);
    expect(isErrorActionable(nonActionableError)).toBe(false);
  });

  it('should get recovery actions for error', () => {
    const error = new WizardError(
      'Timeout',
      'timeout',
      true,
      true,
      { timeoutMs: 30000 }
    );

    const actions = getRecoveryActions(error);

    expect(actions.length).toBeGreaterThan(0);
    expect(actions.some((action) => action.includes('network'))).toBe(true);
  });
});

describe('Retry Logic', () => {
  let retryManager: RetryManager;

  beforeEach(() => {
    retryManager = new RetryManager({
      maxAttempts: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
    });
  });

  it('should execute operation successfully on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const params = { test: 'data' };

    const result = await retryManager.executeWithRetry(
      'test-op',
      operation,
      params
    );

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(result.attemptCount).toBe(1);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(operation).toHaveBeenCalledWith(params);
  });

  it('should retry on failure and succeed', async () => {
    let attemptCount = 0;
    const operation = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new WizardError('Temporary failure', 'generation', true, true);
      }
      return Promise.resolve('success');
    });

    const params = { test: 'data' };

    const result = await retryManager.executeWithRetry(
      'test-op',
      operation,
      params
    );

    expect(result.success).toBe(true);
    expect(result.result).toBe('success');
    expect(result.attemptCount).toBe(3);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should fail after max attempts', async () => {
    const operation = vi.fn().mockRejectedValue(
      new WizardError('Persistent failure', 'generation', true, true)
    );

    const params = { test: 'data' };

    const result = await retryManager.executeWithRetry(
      'test-op',
      operation,
      params
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(WizardError);
    expect(result.attemptCount).toBe(3);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should preserve parameters for retry', async () => {
    const operation = vi.fn().mockRejectedValue(
      new WizardError('Failure', 'generation', true, true)
    );

    const params = { test: 'data', nested: { value: 123 } };

    await retryManager.executeWithRetry('test-op', operation, params);

    const preserved = retryManager.getPreservedParameters('test-op');
    expect(preserved).toEqual(params);
  });

  it('should not retry non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue(
      new WizardError('Fatal error', 'datacontract', false, false)
    );

    const result = await retryManager.executeWithRetry(
      'test-op',
      operation,
      { test: 'data' }
    );

    expect(result.success).toBe(false);
    expect(result.attemptCount).toBe(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('Session Preservation', () => {
  let sessionManager: SessionPreservationManager;

  beforeEach(() => {
    sessionManager = new SessionPreservationManager({
      expirationHours: 24,
      storageKey: 'test_wizard_sessions',
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save and load wizard session', () => {
    const wizardId = 'test-wizard-1';
    const formData = {
      name: 'Test Character',
      description: 'A test character',
      step1Data: { value: 123 },
    };

    sessionManager.saveSession(wizardId, 'character', 2, 5, formData);

    const loaded = sessionManager.loadSession(wizardId);

    expect(loaded).toBeDefined();
    expect(loaded?.wizardId).toBe(wizardId);
    expect(loaded?.wizardType).toBe('character');
    expect(loaded?.currentStep).toBe(2);
    expect(loaded?.totalSteps).toBe(5);
    expect(loaded?.formData).toEqual(formData);
  });

  it('should return undefined for non-existent session', () => {
    const loaded = sessionManager.loadSession('non-existent');
    expect(loaded).toBeUndefined();
  });

  it('should delete wizard session', () => {
    const wizardId = 'test-wizard-2';

    sessionManager.saveSession(wizardId, 'scene', 1, 3, { test: 'data' });
    expect(sessionManager.hasValidSession(wizardId)).toBe(true);

    sessionManager.deleteSession(wizardId);
    expect(sessionManager.hasValidSession(wizardId)).toBe(false);
  });

  it('should sanitize File objects in form data', () => {
    const wizardId = 'test-wizard-3';
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const formData = {
      name: 'Test',
      file: file,
    };

    sessionManager.saveSession(wizardId, 'character', 1, 3, formData);

    const loaded = sessionManager.loadSession(wizardId);

    expect(loaded?.formData.file).toEqual({
      _type: 'File',
      name: 'test.txt',
      size: 7,
      type: 'text/plain',
    });
  });

  it('should cleanup expired sessions', () => {
    // Create a session with short expiration
    const shortExpirationManager = new SessionPreservationManager({
      expirationHours: 0, // Expires immediately
      storageKey: 'test_wizard_sessions',
    });

    shortExpirationManager.saveSession('expired-wizard', 'character', 1, 3, {
      test: 'data',
    });

    // Wait a bit to ensure expiration
    const removed = shortExpirationManager.cleanupExpiredSessions();

    expect(removed).toBeGreaterThan(0);
    expect(shortExpirationManager.hasValidSession('expired-wizard')).toBe(false);
  });

  it('should get sessions by type', () => {
    sessionManager.saveSession('wizard-1', 'character', 1, 3, { test: '1' });
    sessionManager.saveSession('wizard-2', 'scene', 1, 3, { test: '2' });
    sessionManager.saveSession('wizard-3', 'character', 1, 3, { test: '3' });

    const characterSessions = sessionManager.getSessionsByType('character');

    expect(characterSessions.length).toBe(2);
    expect(characterSessions.every((s) => s.wizardType === 'character')).toBe(true);
  });
});

describe('Error Logger', () => {
  let errorLogger: ErrorLogger;

  beforeEach(() => {
    errorLogger = new ErrorLogger({
      projectPath: 'test-project',
      logDirectory: 'logs',
      logFilePrefix: 'test_editor',
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should log wizard error with context', () => {
    const error = new WizardError(
      'Test error',
      'generation',
      true,
      true,
      { detail: 'test detail' }
    );

    errorLogger.logError(error, {
      projectPath: 'test-project',
      wizardType: 'character',
      operation: 'generate',
    });

    const logs = errorLogger.getErrorLogs();

    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('Test error');
    expect(logs[0].category).toBe('generation');
    expect(logs[0].context?.wizardType).toBe('character');
  });

  it('should generate unique error IDs', () => {
    const error1 = new WizardError('Error 1', 'generation', true, true);
    const error2 = new WizardError('Error 2', 'generation', true, true);

    errorLogger.logError(error1);
    errorLogger.logError(error2);

    const logs = errorLogger.getErrorLogs();

    expect(logs[0].errorId).not.toBe(logs[1].errorId);
  });

  it('should filter error logs', () => {
    errorLogger.logError(
      new WizardError('Connection error', 'connection', true, true)
    );
    errorLogger.logError(
      new WizardError('Validation error', 'validation', true, false)
    );
    errorLogger.logError(
      new WizardError('Generation error', 'generation', true, true)
    );

    const connectionErrors = errorLogger.getErrorLogs({ category: 'connection' });
    const retryableErrors = errorLogger.getErrorLogs({ retryable: true });

    expect(connectionErrors.length).toBe(1);
    expect(retryableErrors.length).toBe(2);
  });

  it('should get error statistics', () => {
    errorLogger.logError(
      new WizardError('Error 1', 'connection', true, true)
    );
    errorLogger.logError(
      new WizardError('Error 2', 'connection', true, true)
    );
    errorLogger.logError(
      new WizardError('Error 3', 'validation', true, false)
    );

    const stats = errorLogger.getStatistics();

    expect(stats.total).toBe(3);
    expect(stats.byCategory.connection).toBe(2);
    expect(stats.byCategory.validation).toBe(1);
    expect(stats.recoverable).toBe(3);
    expect(stats.retryable).toBe(2);
  });

  it('should sanitize sensitive data', () => {
    const error = new WizardError(
      'Auth error',
      'connection',
      true,
      true,
      {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'key123',
        normalData: 'visible',
      }
    );

    errorLogger.logError(error);

    const logs = errorLogger.getErrorLogs();

    expect(logs[0].details?.password).toBe('[REDACTED]');
    expect(logs[0].details?.apiKey).toBe('[REDACTED]');
    expect(logs[0].details?.normalData).toBe('visible');
  });

  it('should export logs as JSON', () => {
    errorLogger.logError(
      new WizardError('Test error', 'generation', true, true)
    );

    const exported = errorLogger.exportLogs();
    const parsed = JSON.parse(exported);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].message).toBe('Test error');
  });
});

describe('Integration Tests', () => {
  it('should handle complete error workflow', async () => {
    const errorLogger = new ErrorLogger();
    const retryManager = new RetryManager();

    let attemptCount = 0;
    const operation = vi.fn().mockImplementation(() => {
      attemptCount++;
      if (attemptCount < 2) {
        const error = new WizardError(
          'Temporary failure',
          'generation',
          true,
          true
        );
        errorLogger.logError(error, { operation: 'test-operation' });
        throw error;
      }
      return Promise.resolve('success');
    });

    const result = await retryManager.executeWithRetry(
      'test-op',
      operation,
      { test: 'data' }
    );

    expect(result.success).toBe(true);
    expect(errorLogger.getErrorLogs().length).toBe(1);
  });

  it('should preserve session and retry with same parameters', async () => {
    const sessionManager = new SessionPreservationManager();
    const retryManager = new RetryManager();

    const wizardId = 'test-wizard';
    const formData = { name: 'Test', value: 123 };

    // Save session
    sessionManager.saveSession(wizardId, 'character', 2, 5, formData);

    // Simulate failed operation
    const operation = vi.fn().mockRejectedValue(
      new WizardError('Failure', 'generation', true, true)
    );

    await retryManager.executeWithRetry('test-op', operation, formData);

    // Load session and verify data preserved
    const loaded = sessionManager.loadSession(wizardId);
    const preserved = retryManager.getPreservedParameters('test-op');

    expect(loaded?.formData).toEqual(formData);
    expect(preserved).toEqual(formData);
  });
});
