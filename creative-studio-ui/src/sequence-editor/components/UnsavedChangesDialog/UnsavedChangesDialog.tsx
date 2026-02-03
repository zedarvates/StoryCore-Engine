/**
 * Unsaved Changes Dialog Component
 * 
 * Displays a confirmation dialog when the user attempts to close
 * the application with unsaved changes.
 * 
 * Requirements: 19.5
 */

import React from 'react';
import './unsavedChangesDialog.css';

export interface UnsavedChangesDialogProps {
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
  isSaving?: boolean;
}

/**
 * Unsaved Changes Dialog Component
 */
export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  onSave,
  onDiscard,
  onCancel,
  isSaving = false,
}) => {
  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };
  
  return (
    <div className="unsaved-changes-overlay">
      <div className="unsaved-changes-dialog">
        <div className="unsaved-changes-header">
          <h2>
            <span className="unsaved-changes-icon">⚠️</span>
            Unsaved Changes
          </h2>
        </div>
        
        <div className="unsaved-changes-content">
          <p>
            You have unsaved changes in your project. Do you want to save them before closing?
          </p>
        </div>
        
        <div className="unsaved-changes-footer">
          <button
            className="unsaved-changes-button unsaved-changes-button-secondary"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="unsaved-changes-button unsaved-changes-button-danger"
            onClick={onDiscard}
            disabled={isSaving}
          >
            Don't Save
          </button>
          <button
            className="unsaved-changes-button unsaved-changes-button-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
