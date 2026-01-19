/**
 * Error Handling Module Index
 * 
 * Central export point for all error handling functionality including
 * error message generation, retry logic, session preservation, and error logging.
 * 
 * Requirements: 1.3, 1.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */

// Error message generation
export {
  generateErrorMessage,
  formatErrorMessage,
  createUserFriendlyError,
  getRecoveryActions,
  isErrorActionable,
  type ErrorMessageTemplate,
  type ErrorContext,
} from './errorHandling';

// Retry logic
export {
  RetryManager,
  getRetryManager,
  createRetryManager,
  setRetryManager,
  executeWithRetry,
  getPreservedParameters,
  canRetry,
  clearRetryState,
  type RetryConfig,
  type RetryState,
  type RetryResult,
} from './retryLogic';

// Session preservation
export {
  SessionPreservationManager,
  getSessionManager,
  createSessionManager,
  setSessionManager,
  saveWizardSession,
  loadWizardSession,
  deleteWizardSession,
  hasValidWizardSession,
  cleanupExpiredSessions,
  type PreservedSession,
  type SessionPreservationConfig,
} from './sessionPreservation';

// Error logging
export {
  ErrorLogger,
  getErrorLogger,
  createErrorLogger,
  setErrorLogger,
  logWizardError,
  type ErrorLogEntry,
  type LogRotationConfig,
  type ErrorLoggerConfig,
} from './errorLogger';

// Re-export core types
export { WizardError, type WizardErrorCategory } from './types';
