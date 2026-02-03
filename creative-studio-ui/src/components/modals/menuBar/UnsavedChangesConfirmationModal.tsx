/**
 * Unsaved Changes Confirmation Modal
 * 
 * Displays a confirmation dialog when the user attempts to close or open
 * another project with unsaved changes.
 * 
 * Requirements: 1.8
 */

import React from 'react';

export interface UnsavedChangesConfirmationModalProps {
  /** Callback when user chooses to save */
  onSave: () => void;
  /** Callback when user chooses not to save */
  onDontSave: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether the modal is open */
  isOpen?: boolean;
}

/**
 * UnsavedChangesConfirmationModal Component
 * 
 * Shows a confirmation dialog with three options:
 * - Save: Save changes and proceed
 * - Don't Save: Discard changes and proceed
 * - Cancel: Cancel the operation
 */
export const UnsavedChangesConfirmationModal: React.FC<UnsavedChangesConfirmationModalProps> = ({
  onSave,
  onDontSave,
  onCancel,
  isOpen = true,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Title */}
        <h2
          id="unsaved-changes-title"
          className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4"
        >
          Unsaved Changes
        </h2>

        {/* Message */}
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          You have unsaved changes. Do you want to save before continuing?
        </p>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="
              px-4 py-2 rounded
              text-gray-700 dark:text-gray-300
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              transition-colors duration-150
            "
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={onDontSave}
            className="
              px-4 py-2 rounded
              text-gray-700 dark:text-gray-300
              bg-gray-100 dark:bg-gray-700
              hover:bg-gray-200 dark:hover:bg-gray-600
              transition-colors duration-150
            "
          >
            Don't Save
          </button>
          
          <button
            type="button"
            onClick={onSave}
            className="
              px-4 py-2 rounded
              text-white
              bg-blue-600 hover:bg-blue-700
              transition-colors duration-150
            "
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesConfirmationModal;
