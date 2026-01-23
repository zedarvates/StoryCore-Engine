/**
 * useModalState Hook
 *
 * Manages comprehensive modal state including form data, validation errors,
 * loading states, and connection testing status.
 */

import { useState, useCallback, useEffect } from 'react';
import type { ModalState, ModalSchema, ValidationResult } from '@/types/modal';

/**
 * Hook for managing modal state
 */
export function useModalState(schema: ModalSchema, initialData?: Record<string, unknown>) {
  // Initialize form data with defaults from schema
  const initializeFormData = useCallback(() => {
    const data: Record<string, unknown> = {};

    for (const field of schema.fields) {
      data[field.id] = initialData?.[field.id] ?? field.defaultValue ?? '';
    }

    return data;
  }, [schema.fields, initialData]);

  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<Record<string, unknown>>(initializeFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState({ submit: false, connectionTest: false });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Reset state when modal opens/closes or schema changes
  useEffect(() => {
    if (isOpen) {
      setData(initializeFormData());
      setErrors({});
      setLoading({ submit: false, connectionTest: false });
      setConnectionStatus('idle');
    }
  }, [isOpen, initializeFormData]);

  // Update field value
  const updateField = useCallback((fieldId: string, value: unknown) => {
    setData(prev => ({ ...prev, [fieldId]: value }));

    // Clear error for this field when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  }, [errors]);

  // Update multiple fields
  const updateFields = useCallback((updates: Record<string, unknown>) => {
    setData(prev => ({ ...prev, ...updates }));

    // Clear errors for updated fields
    setErrors(prev => {
      const newErrors = { ...prev };
      for (const fieldId of Object.keys(updates)) {
        delete newErrors[fieldId];
      }
      return newErrors;
    });
  }, []);

  // Set validation errors
  const setValidationErrors = useCallback((validationErrors: Record<string, string>) => {
    setErrors(validationErrors);
  }, []);

  // Set loading state
  const setLoadingState = useCallback((key: keyof ModalState['loading'], value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  // Open modal
  const open = useCallback((data?: Record<string, unknown>) => {
    if (data) {
      setData(prev => ({ ...initializeFormData(), ...data }));
    }
    setIsOpen(true);
  }, [initializeFormData]);

  // Close modal
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Reset form
  const reset = useCallback(() => {
    setData(initializeFormData());
    setErrors({});
    setLoading({ submit: false, connectionTest: false });
    setConnectionStatus('idle');
  }, [initializeFormData]);

  return {
    // State
    isOpen,
    data,
    errors,
    loading,
    connectionStatus,

    // Actions
    open,
    close,
    updateField,
    updateFields,
    setValidationErrors,
    setLoadingState,
    setConnectionStatus,
    reset,
  };
}
