/**
 * Toast Hook
 * Toast notification system integrated with Radix UI Toast
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
}

const toastState: ToastState = {
  toasts: [],
};

const listeners = new Set<(state: ToastState) => void>();

// Counter for generating unique toast IDs (more reliable than Math.random)
let toastIdCounter = 0;

function notify() {
  listeners.forEach((listener) => listener(toastState));
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);
  const pendingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const listener = (newState: ToastState) => {
      setState({ ...newState });
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    // Clear any pending timeout for this toast
    const timeout = pendingTimeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      pendingTimeouts.current.delete(id);
    }
    toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = 'default',
      duration = 5000,
      action,
    }: Omit<Toast, 'id'>) => {
      // Use counter for unique ID generation (avoids Math.random collisions)
      toastIdCounter++;
      const id = `toast-${toastIdCounter}-${Date.now()}`;

      const newToast: Toast = { id, title, description, variant, duration, action };

      toastState.toasts = [...toastState.toasts, newToast];
      notify();

      // Auto-dismiss after duration
      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          dismiss(id);
        }, duration);
        pendingTimeouts.current.set(id, timeoutId);
      }

      return id;
    },
    [dismiss]
  );

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      pendingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      pendingTimeouts.current.clear();
    };
  }, []);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
}

// Standalone toast function for use outside React components
export function toast({
  title,
  description,
  variant = 'default',
  duration = 5000,
  action,
}: Omit<Toast, 'id'>) {
  // Use counter for unique ID generation (avoids Math.random collisions)
  toastIdCounter++;
  const id = `toast-${toastIdCounter}-${Date.now()}`;

  const newToast: Toast = { id, title, description, variant, duration, action };

  toastState.toasts = [...toastState.toasts, newToast];
  notify();

  // Auto-dismiss after duration
  if (duration > 0) {
    setTimeout(() => {
      toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
      notify();
    }, duration);
  }

  return id;
}
