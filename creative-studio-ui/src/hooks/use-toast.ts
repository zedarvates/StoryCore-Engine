/**
 * Toast Hook
 * Toast notification system integrated with Radix UI Toast
 */

import { useState, useCallback, useEffect } from 'react';

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

function notify() {
  listeners.forEach((listener) => listener(toastState));
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState);

  useEffect(() => {
    const listener = (newState: ToastState) => {
      setState({ ...newState });
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = 'default',
      duration = 5000,
      action,
    }: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, title, description, variant, duration, action };

      toastState.toasts = [...toastState.toasts, newToast];
      notify();

      // Auto-dismiss after duration
      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    toastState.toasts = toastState.toasts.filter((t) => t.id !== id);
    notify();
  }, []);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
}
