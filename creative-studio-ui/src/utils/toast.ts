// ============================================================================
// Toast Notification System
// ============================================================================
// Simple toast notification system for displaying user-friendly messages
// Supports success, error, warning, and info message types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

type ToastListener = (toast: ToastMessage) => void;

class ToastManager {
  private listeners: Set<ToastListener> = new Set();
  private toasts: ToastMessage[] = [];

  /**
   * Subscribe to toast notifications
   */
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Show a toast notification
   */
  private show(type: ToastType, title: string, message: string, duration = 5000): string {
    const toast: ToastMessage = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      duration,
      timestamp: new Date(),
    };

    this.toasts.push(toast);
    this.listeners.forEach((listener) => listener(toast));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, duration);
    }

    return toast.id;
  }

  /**
   * Dismiss a toast notification
   */
  dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  /**
   * Show success toast
   */
  success(title: string, message: string, duration?: number): string {
    return this.show('success', title, message, duration);
  }

  /**
   * Show error toast
   */
  error(title: string, message: string, duration?: number): string {
    return this.show('error', title, message, duration || 7000); // Errors stay longer
  }

  /**
   * Show warning toast
   */
  warning(title: string, message: string, duration?: number): string {
    return this.show('warning', title, message, duration);
  }

  /**
   * Show info toast
   */
  info(title: string, message: string, duration?: number): string {
    return this.show('info', title, message, duration);
  }

  /**
   * Get all active toasts
   */
  getToasts(): ToastMessage[] {
    return [...this.toasts];
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.toasts = [];
  }
}

// Export singleton instance
export const toast = new ToastManager();
