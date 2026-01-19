/**
 * Save Button Component
 * 
 * Smart save button that prevents saving invalid configurations
 */

import React from 'react';
import { Save, AlertCircle, Loader } from 'lucide-react';
import './SaveButton.css';

export interface SaveButtonProps {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  isValid?: boolean;
  isSaving?: boolean;
  validationErrors?: string[];
  label?: string;
  showValidationSummary?: boolean;
  className?: string;
}

export function SaveButton({
  onClick,
  disabled = false,
  isValid = true,
  isSaving = false,
  validationErrors = [],
  label = 'Save',
  showValidationSummary = true,
  className = '',
}: SaveButtonProps) {
  const hasErrors = validationErrors.length > 0;
  const isDisabled = disabled || !isValid || hasErrors || isSaving;

  const handleClick = async () => {
    if (isDisabled) return;
    await onClick();
  };

  return (
    <div className={`save-button-container ${className}`}>
      <button
        className={`save-button ${isDisabled ? 'save-button-disabled' : ''} ${
          isSaving ? 'save-button-saving' : ''
        }`}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={label}
      >
        {isSaving ? (
          <>
            <Loader className="save-button-icon save-button-icon-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="save-button-icon" />
            {label}
          </>
        )}
      </button>

      {showValidationSummary && hasErrors && (
        <div className="save-button-validation-summary" role="alert">
          <div className="validation-summary-header">
            <AlertCircle className="validation-summary-icon" />
            <span className="validation-summary-title">
              Cannot save: {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''}
            </span>
          </div>
          <ul className="validation-summary-list">
            {validationErrors.slice(0, 3).map((error, index) => (
              <li key={index} className="validation-summary-item">
                {error}
              </li>
            ))}
            {validationErrors.length > 3 && (
              <li className="validation-summary-item validation-summary-more">
                +{validationErrors.length - 3} more error{validationErrors.length - 3 > 1 ? 's' : ''}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Save Button
 * Minimal version without validation summary
 */
export interface CompactSaveButtonProps {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  isSaving?: boolean;
  label?: string;
  className?: string;
}

export function CompactSaveButton({
  onClick,
  disabled = false,
  isSaving = false,
  label = 'Save',
  className = '',
}: CompactSaveButtonProps) {
  const isDisabled = disabled || isSaving;

  const handleClick = async () => {
    if (isDisabled) return;
    await onClick();
  };

  return (
    <button
      className={`compact-save-button ${isDisabled ? 'compact-save-button-disabled' : ''} ${
        isSaving ? 'compact-save-button-saving' : ''
      } ${className}`}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={label}
    >
      {isSaving ? (
        <>
          <Loader className="compact-save-icon compact-save-icon-spin" />
          Saving...
        </>
      ) : (
        <>
          <Save className="compact-save-icon" />
          {label}
        </>
      )}
    </button>
  );
}
