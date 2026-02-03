// ============================================================================
// NotificationService
// ============================================================================
// Manages notifications for menu bar actions with auto-dismiss and queue management
// Implements Requirements 15.1-15.6
// ============================================================================

/**
 * Notification type
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Notification interface
 */
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // Auto-dismiss after ms (null/undefined = manual dismiss)
  action?: {
    label: string;
    callback: () => void;
  };
}

/**
 * Notification listener callback
 */
export type NotificationListener = (notification: Notification) => void;

/**
 * Notification dismiss listener callback
 */
export type NotificationDismissListener = (id: string) => void;

/**
 * NotificationService class
 * 
 * Manages notification display, auto-dismiss timers, and notification queue.
 * Provides methods to show, dismiss, and dismiss all notifications.
 */
export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Set<NotificationListener> = new Set();
  private dismissListeners: Set<NotificationDismissListener> = new Set();

  /**
   * Show a notification
   * 
   * @param notification - Notification to show (without id)
   * @returns The generated notification id
   */
  show(notification: Omit<Notification, 'id'>): string {
    const id = crypto.randomUUID();
    const fullNotification: Notification = {
      id,
      ...notification,
    };

    // Add to queue
    this.notifications.set(id, fullNotification);

    // Notify listeners
    this.listeners.forEach((listener) => listener(fullNotification));

    // Set up auto-dismiss timer if duration is specified
    if (notification.duration !== null && notification.duration !== undefined && notification.duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
      this.timers.set(id, timer);
    }

    // Log to console for debugging (Requirement 15.6)
    console.log(`[Notification] ${notification.type.toUpperCase()}: ${notification.message}`);

    return id;
  }

  /**
   * Dismiss a specific notification
   * 
   * @param id - Notification id to dismiss
   */
  dismiss(id: string): void {
    // Clear timer if exists
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    // Remove notification
    if (this.notifications.has(id)) {
      this.notifications.delete(id);

      // Notify dismiss listeners
      this.dismissListeners.forEach((listener) => listener(id));

      console.log(`[Notification] Dismissed: ${id}`);
    }
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Get all notification ids before clearing
    const ids = Array.from(this.notifications.keys());

    // Clear notifications
    this.notifications.clear();

    // Notify dismiss listeners for each notification
    ids.forEach((id) => {
      this.dismissListeners.forEach((listener) => listener(id));
    });

    console.log('[Notification] Dismissed all notifications');
  }

  /**
   * Get all active notifications
   * 
   * @returns Array of active notifications
   */
  getNotifications(): Notification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get a specific notification by id
   * 
   * @param id - Notification id
   * @returns The notification or undefined if not found
   */
  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  /**
   * Subscribe to notification events
   * 
   * @param listener - Callback to invoke when a notification is shown
   * @returns Unsubscribe function
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to notification dismiss events
   * 
   * @param listener - Callback to invoke when a notification is dismissed
   * @returns Unsubscribe function
   */
  onDismiss(listener: NotificationDismissListener): () => void {
    this.dismissListeners.add(listener);
    return () => this.dismissListeners.delete(listener);
  }

  /**
   * Check if a notification exists
   * 
   * @param id - Notification id
   * @returns True if notification exists
   */
  has(id: string): boolean {
    return this.notifications.has(id);
  }

  /**
   * Get the count of active notifications
   * 
   * @returns Number of active notifications
   */
  count(): number {
    return this.notifications.size;
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clearListeners(): void {
    this.listeners.clear();
    this.dismissListeners.clear();
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
