/**
 * useNotifications Hook
 * 
 * Custom hook for managing toast notifications
 * Based on existing src/ui/ErrorNotification.tsx implementation
 */

import { useState } from 'react';
import type { Notification } from '../components/ui/ErrorNotification';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      autoClose: notification.autoClose !== false,
      duration: notification.duration || 5000
    };

    setNotifications(prev => [...prev, newNotification]);

    if (newNotification.autoClose) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, newNotification.duration);
    }

    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Convenience methods
  const showError = (title: string, message: string, duration?: number) => {
    return addNotification({ type: 'error', title, message, duration });
  };

  const showSuccess = (title: string, message: string, duration?: number) => {
    return addNotification({ type: 'success', title, message, duration });
  };

  const showWarning = (title: string, message: string, duration?: number) => {
    return addNotification({ type: 'warning', title, message, duration });
  };

  const showInfo = (title: string, message: string, duration?: number) => {
    return addNotification({ type: 'info', title, message, duration });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    clearAll: clearNotifications, // Alias
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}
