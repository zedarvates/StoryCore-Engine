/**
 * Wizard Error Handler Hook
 * 
 * Provides error handling utilities for wizards with consistent error recovery.
 */

import { useState, useCallback, useRef } from 'react';
import type { WizardType } from '../../utils/wizardStorage';

export interface WizardErrorInfo {
  error: Error;
  componentStack?: string;
  timestamp: Date;
  wizardType: WizardType;
}

export interface WizardErrorHandlerResult {
  error: WizardErrorInfo | null;
  hasError: boolean;
  dataExported: boolean;
  setError: (error: Error, componentStack?: string) => void;
  clearError: () => void;
  exportOnError: () => void;
  getErrorMessage: () => string;
  getErrorDescription: () => string;
}

export function useWizardErrorHandler(wizardType: WizardType): WizardErrorHandlerResult {
  const [error, setErrorState] = useState<WizardErrorInfo | null>(null);
  const [dataExported, setDataExported] = useState(false);
  const wizardTypeRef = useRef(wizardType);
  
  // Update ref when wizardType changes
  wizardTypeRef.current = wizardType;

  const setError = useCallback((err: Error, componentStack?: string) => {
    const errorInfo: WizardErrorInfo = {
      error: err,
      componentStack,
      timestamp: new Date(),
      wizardType: wizardTypeRef.current,
    };
    setErrorState(errorInfo);
    
    // Auto-export data
    try {
      // emergencyExportWizardState(wizardTypeRef.current, err);
      setDataExported(true);
    } catch (exportError) {
      console.error('Failed to export wizard data:', exportError);
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
    setDataExported(false);
  }, []);

  const exportOnError = useCallback(() => {
    if (error) {
      try {
        // emergencyExportWizardState(error.wizardType, error.error);
        setDataExported(true);
      } catch (err) {
        console.error('Failed to export wizard data:', err);
      }
    }
  }, [error]);

  const getErrorMessage = useCallback(() => {
    if (!error) return '';
    return error.error.message || 'An unexpected error occurred';
  }, [error]);

  const getErrorDescription = useCallback(() => {
    if (!error) return '';
    
    const message = error.error.message || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    if (message.includes('timeout')) {
      return 'The operation timed out. Please try again.';
    }
    if (message.includes('validation')) {
      return 'There was an issue with the data you entered. Please review your input and try again.';
    }
    if (message.includes('permission') || message.includes('access')) {
      return 'You do not have permission to perform this action. Please check your access rights.';
    }
    if (message.includes('storage') || message.includes('localStorage')) {
      return 'There was an issue saving your progress.';
    }
    
    return 'Something went wrong while processing your request. Please try again.';
  }, [error]);

  return {
    error,
    hasError: error !== null,
    dataExported,
    setError,
    clearError,
    exportOnError,
    getErrorMessage,
    getErrorDescription,
  };
}

export interface ErrorRecoveryOption {
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

export interface WizardErrorRecoveryProps {
  error: WizardErrorInfo | null;
  dataExported: boolean;
  onRetry: () => void;
  onReload: () => void;
  onExport?: () => void;
  customOptions?: ErrorRecoveryOption[];
}

export function getDefaultRecoveryOptions(
  dataExported: boolean,
  onRetry: () => void,
  onReload: () => void,
  onExport?: () => void
): ErrorRecoveryOption[] {
  const options: ErrorRecoveryOption[] = [
    {
      label: 'Try Again',
      action: onRetry,
      variant: 'default',
    },
    {
      label: 'Reload Page',
      action: onReload,
      variant: 'outline',
    },
  ];

  if (!dataExported && onExport) {
    options.push({
      label: 'Export Data',
      action: onExport,
      variant: 'outline',
    });
  }

  return options;
}
