/**
 * NotificationCenter - Centre de notifications intelligentes
 *
 * Interface utilisateur pour afficher et gérer les notifications contextuelles
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  Zap,
  Clock,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationService, type Notification, type NotificationType } from '@/services/NotificationService';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // S'abonner aux changements de notifications
    const unsubscribe = notificationService.subscribe((activeNotifications) => {
      setNotifications(activeNotifications);
      setUnreadCount(notificationService.getUnreadCount());
    });

    // Charger les notifications initiales
    setNotifications(notificationService.getActiveNotifications());
    setUnreadCount(notificationService.getUnreadCount());

    return unsubscribe;
  }, []);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'update':
        return <Zap className="w-5 h-5 text-purple-500" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'achievement':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'system':
        return <Settings className="w-5 h-5 text-gray-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'info':
        return 'border-blue-500 bg-blue-50';
      case 'update':
        return 'border-purple-500 bg-purple-50';
      case 'reminder':
        return 'border-orange-500 bg-orange-50';
      case 'achievement':
        return 'border-yellow-400 bg-yellow-50';
      case 'system':
        return 'border-gray-500 bg-gray-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'À l\'instant';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Il y a ${minutes} min`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Il y a ${hours} h`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Il y a ${days} j`;
    }
  };

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleDismiss = (id: string) => {
    notificationService.dismiss(id);
  };

  const handleClearAll = () => {
    notificationService.clearAll();
  };

  const handleNotificationAction = (action: () => void) => {
    action();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bouton du centre de notifications */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-400 hover:text-white hover:bg-gray-700"
        title="Centre de notifications"
        aria-label={`Notifications (${unreadCount} non lues)`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Panneau des notifications */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 max-h-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Tout effacer
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 ${getNotificationColor(notification.type)} ${!notification.read ? 'bg-opacity-20' : 'bg-opacity-10'}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icône */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          <button
                            onClick={() => handleDismiss(notification.id)}
                            className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
                            title="Fermer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-sm text-gray-700 mt-1">
                          {notification.message}
                        </p>

                        {/* Actions */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {notification.actions.map((action, index) => (
                              <Button
                                key={index}
                                variant={action.primary ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleNotificationAction(action.action)}
                                className="text-xs h-7"
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Métadonnées */}
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>{formatTimeAgo(notification.timestamp)}</span>
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Marquer comme lu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer avec paramètres */}
          <div className="p-3 border-t border-gray-700 bg-gray-900">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-400 hover:text-white justify-start"
              onClick={() => {
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Paramètres des notifications
            </Button>
          </div>
        </div>
      )}

      {/* Overlay pour fermer en cliquant ailleurs */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
