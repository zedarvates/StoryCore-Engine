// ============================================================================
// Toast Container Component
// ============================================================================
// Displays toast notifications in the UI
// Automatically positions and animates toast messages
// ============================================================================

import React, { useEffect, useState } from 'react';
import { toast, type ToastMessage } from '../../utils/toast';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    // Subscribe to toast notifications
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    toast.dismiss(id);
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            rounded-lg shadow-lg p-4 flex items-start gap-3
            animate-slide-in-right
            ${t.type === 'success' ? 'bg-green-50 border border-green-200' : ''}
            ${t.type === 'error' ? 'bg-red-50 border border-red-200' : ''}
            ${t.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' : ''}
            ${t.type === 'info' ? 'bg-blue-50 border border-blue-200' : ''}
          `}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {t.type === 'success' && (
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {t.type === 'error' && (
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {t.type === 'warning' && (
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {t.type === 'info' && (
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className={`
                text-sm font-medium
                ${t.type === 'success' ? 'text-green-800' : ''}
                ${t.type === 'error' ? 'text-red-800' : ''}
                ${t.type === 'warning' ? 'text-yellow-800' : ''}
                ${t.type === 'info' ? 'text-blue-800' : ''}
              `}
            >
              {t.title}
            </p>
            <p
              className={`
                text-sm mt-1 whitespace-pre-line
                ${t.type === 'success' ? 'text-green-700' : ''}
                ${t.type === 'error' ? 'text-red-700' : ''}
                ${t.type === 'warning' ? 'text-yellow-700' : ''}
                ${t.type === 'info' ? 'text-blue-700' : ''}
              `}
            >
              {t.message}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => handleDismiss(t.id)}
            className={`
              flex-shrink-0 rounded-md p-1 hover:bg-opacity-20
              ${t.type === 'success' ? 'text-green-600 hover:bg-green-600' : ''}
              ${t.type === 'error' ? 'text-red-600 hover:bg-red-600' : ''}
              ${t.type === 'warning' ? 'text-yellow-600 hover:bg-yellow-600' : ''}
              ${t.type === 'info' ? 'text-blue-600 hover:bg-blue-600' : ''}
            `}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
