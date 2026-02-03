/**
 * ConfirmationModal - Generic confirmation dialog
 * 
 * Provides a reusable confirmation dialog for:
 * - Unsaved changes warnings
 * - Destructive action confirmations
 * - User choice dialogs
 * 
 * Requirements: 1.8, 2.10, 15.3
 */

import React from 'react';
import { Modal } from '../Modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';

export type ConfirmationType = 'warning' | 'info' | 'question';

export interface ConfirmationButton {
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  action: () => void | Promise<void>;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: ConfirmationType;
  buttons?: ConfirmationButton[];
  showCancel?: boolean;
}

/**
 * ConfirmationModal component
 * 
 * Generic confirmation dialog with customizable buttons and styling.
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'question',
  buttons = [],
  showCancel = true,
}: ConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleButtonClick = async (button: ConfirmationButton) => {
    setIsProcessing(true);
    try {
      await button.action();
      onClose();
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      case 'question':
      default:
        return <HelpCircle className="w-6 h-6 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'question':
      default:
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onClose}
      title={title}
      size="sm"
    >
      <div className="space-y-6">
        {/* Message with Icon */}
        <div className={`flex gap-3 p-4 border rounded-lg ${getBackgroundColor()}`}>
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {showCancel && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          )}
          {buttons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant || 'default'}
              onClick={() => handleButtonClick(button)}
              disabled={isProcessing}
            >
              {button.label}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Preset confirmation dialogs for common scenarios
 */

export interface UnsavedChangesConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onDontSave: () => void | Promise<void>;
}

/**
 * Unsaved changes confirmation dialog
 */
export function UnsavedChangesConfirmation({
  isOpen,
  onClose,
  onSave,
  onDontSave,
}: UnsavedChangesConfirmationProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Unsaved Changes"
      message="You have unsaved changes. Do you want to save before closing?"
      type="warning"
      buttons={[
        {
          label: "Don't Save",
          variant: 'outline',
          action: onDontSave,
        },
        {
          label: 'Save',
          variant: 'default',
          action: onSave,
        },
      ]}
      showCancel={true}
    />
  );
}

export interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName: string;
}

/**
 * Delete confirmation dialog
 */
export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  itemName,
}: DeleteConfirmationProps) {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Deletion"
      message={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      type="warning"
      buttons={[
        {
          label: 'Delete',
          variant: 'destructive',
          action: onConfirm,
        },
      ]}
      showCancel={true}
    />
  );
}
