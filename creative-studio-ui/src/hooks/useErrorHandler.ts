// ============================================================================
// Error Handler Hook - Centralized Error Management for UI
// ============================================================================
// Provides centralized error handling for React components
// Supports error tracking, display, and recovery
//
// Features:
// - Centralized error state management
// - Error logging with context
// - Error recovery actions
// - User-friendly error messages
//
// Requirements: 7.1, 7.2, 7.3
// ============================================================================

import { useCallback, useState, useRef, useEffect } from 'react';
import { logger as Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface ErrorInfo {
  id: string;
  message: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
  timestamp: Date;
  handled: boolean;
}

export interface ErrorHandlerState {
  errors: ErrorInfo[];
  currentError: ErrorInfo | null;
  hasErrors: boolean;
  errorCount: number;
}

export interface ErrorHandlerActions {
  addError: (error: Omit<ErrorInfo, 'id' | 'timestamp' | 'handled'>) => string;
  removeError: (id: string) => void;
  clearErrors: () => void;
  handleError: (error: unknown, context?: Record<string, unknown>) => string;
  dismissCurrentError: () => void;
  retryAction: (action: () => void) => void;
}

// ============================================================================
// Error Handler Hook
// ============================================================================

/**
 * Hook that provides centralized error management
 * 
 * Features:
 * - Track multiple errors with unique IDs
 * - Automatic error logging
 * - Error severity levels
 * - Recovery actions
 *
 * Requirements: 7.1, 7.2, 7.3
 */
export function useErrorHandler() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [currentError, setCurrentError] = useState<ErrorInfo | null>(null);
  const errorIdCounter = useRef(0);

  const generateErrorId = useCallback(() => {
    errorIdCounter.current += 1;
    return `error_${Date.now()}_${errorIdCounter.current}`;
  }, []);

  const addError = useCallback((error: Omit<ErrorInfo, 'id' | 'timestamp' | 'handled'>): string => {
    const id = generateErrorId();
    const newError: ErrorInfo = {
      ...error,
      id,
      timestamp: new Date(),
      handled: false,
    };

    Logger.error(`[ErrorHandler] ${error.severity.toUpperCase()} Error:`, {
      id,
      message: error.message,
      code: error.code,
      context: error.context,
    });

    setErrors((prev) => [...prev, newError]);
    
    if (error.severity === 'high' || error.severity === 'critical') {
      setCurrentError(newError);
    }

    return id;
  }, [generateErrorId]);

  const removeError = useCallback((id: string) => {
    setErrors((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      if (currentError?.id === id) {
        setCurrentError(filtered.length > 0 ? filtered[filtered.length - 1] : null);
      }
      return filtered;
    });
  }, [currentError]);

  const clearErrors = useCallback(() => {
    Logger.info('[ErrorHandler] Clearing all errors');
    setErrors([]);
    setCurrentError(null);
  }, []);

  const handleError = useCallback((error: unknown, context?: Record<string, unknown>): string => {
    let message: string;
    let severity: ErrorInfo['severity'] = 'medium';
    let code: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      if (message.includes('network') || message.includes('fetch')) {
        severity = 'high';
        code = 'NETWORK_ERROR';
      } else if (message.includes('permission') || message.includes('access')) {
        severity = 'high';
        code = 'PERMISSION_DENIED';
      } else if (message.includes('validation') || message.includes('invalid')) {
        severity = 'low';
        code = 'VALIDATION_ERROR';
      } else if (message.includes('critical') || message.includes('fatal')) {
        severity = 'critical';
        code = 'CRITICAL_ERROR';
      }
    } else {
      message = String(error);
    }

    return addError({ message, code, severity, context });
  }, [addError]);

  const dismissCurrentError = useCallback(() => {
    if (currentError) {
      removeError(currentError.id);
    }
  }, [currentError, removeError]);

  const retryAction = useCallback((action: () => void) => {
    try {
      action();
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  useEffect(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    setErrors((prev) => {
      const filtered = prev.filter((e) => !e.handled || e.timestamp >= fiveMinutesAgo);
      if (currentError && !filtered.find((e) => e.id === currentError.id)) {
        setCurrentError(filtered.length > 0 ? filtered[filtered.length - 1] : null);
      }
      return filtered;
    });
  }, [currentError]);

  return {
    errors,
    currentError,
    hasErrors: errors.length > 0,
    errorCount: errors.length,
    addError,
    removeError,
    clearErrors,
    handleError,
    dismissCurrentError,
    retryAction,
  };
}

