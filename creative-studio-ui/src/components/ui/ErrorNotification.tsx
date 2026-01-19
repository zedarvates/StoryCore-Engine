/**
 * Error Notification Component
 * 
 * Toast-style notification for displaying errors and success messages
 * Based on existing src/ui/ErrorNotification.tsx with enhancements
 */

import React, { useState, useEffect } from 'react';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actions?: NotificationAction[];
  autoClose?: boolean;
  duration?: number;
}

interface ErrorNotificationProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function ErrorNotification({
  notifications,
  onDismiss
}: ErrorNotificationProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setVisibleNotifications(notifications);
  }, [notifications]);

  const handleDismiss = (id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
    onDismiss(id);
  };

  if (notifications.length === 0) return null;

  const getNotificationStyle = (type: NotificationType): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      padding: '12px 16px',
      marginBottom: '10px',
      borderRadius: '4px',
      border: '1px solid',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      position: 'relative',
      animation: 'slideIn 0.3s ease-out'
    };

    switch (type) {
      case 'error':
        return { ...baseStyle, backgroundColor: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24' };
      case 'warning':
        return { ...baseStyle, backgroundColor: '#fff3cd', borderColor: '#ffeaa7', color: '#856404' };
      case 'info':
        return { ...baseStyle, backgroundColor: '#d1ecf1', borderColor: '#bee5eb', color: '#0c5460' };
      case 'success':
        return { ...baseStyle, backgroundColor: '#d4edda', borderColor: '#c3e6cb', color: '#155724' };
      default:
        return baseStyle;
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
    maxWidth: '400px',
    minWidth: '300px'
  };

  return (
    <div style={containerStyle}>
      {notifications.map(notification => (
        <div key={notification.id} style={getNotificationStyle(notification.type)}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{notification.title}</div>
            <div style={{ fontSize: '14px' }}>{notification.message}</div>
            {notification.actions && notification.actions.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    style={{
                      marginRight: '8px',
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      backgroundColor: action.primary ? '#007bff' : '#6c757d',
                      color: 'white',
                      fontSize: '12px'
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => handleDismiss(notification.id)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              marginLeft: '8px',
              color: 'inherit',
              opacity: 0.7
            }}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Notification Container Component
 * Alias for ErrorNotification for compatibility
 */
export interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationContainer({
  notifications,
  onRemove,
  position = 'top-right',
}: NotificationContainerProps) {
  return <ErrorNotification notifications={notifications} onDismiss={onRemove} />;
}
