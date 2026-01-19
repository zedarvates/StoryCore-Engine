/**
 * StateRecoveryDialog Component
 * 
 * Dialog for handling state corruption and recovery options.
 * 
 * Requirements: 5.6
 */

import { useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Download, X } from 'lucide-react';
import type { ValidationResult } from '../../services/wizard/stateValidationService';
import { emergencyExportWizardState, clearWizardState } from '../../utils/wizardStorage';

export interface StateRecoveryDialogProps {
  /**
   * Wizard type
   */
  wizardType: 'world' | 'character';

  /**
   * Validation result
   */
  validationResult: ValidationResult;

  /**
   * Callback when user chooses to reset
   */
  onReset: () => void;

  /**
   * Callback when user chooses to recover
   */
  onRecover?: () => void;

  /**
   * Callback when user dismisses dialog
   */
  onDismiss?: () => void;

  /**
   * Show dialog
   */
  isOpen: boolean;
}

export function StateRecoveryDialog({
  wizardType,
  validationResult,
  onReset,
  onRecover,
  onDismiss,
  isOpen,
}: StateRecoveryDialogProps): React.ReactElement | null {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleExport = () => {
    setIsExporting(true);
    try {
      emergencyExportWizardState(wizardType);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    clearWizardState(wizardType);
    onReset();
  };

  const handleRecover = () => {
    if (onRecover) {
      onRecover();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-dialog-title"
    >
      <div className="max-w-lg w-full mx-4 bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex-1">
              <h2
                id="recovery-dialog-title"
                className="text-xl font-semibold text-gray-900 mb-1"
              >
                State Corruption Detected
              </h2>
              <p className="text-sm text-gray-500">
                Your wizard data may be corrupted or incompatible
              </p>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Errors:</h3>
              <ul className="space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Warnings:</h3>
              <ul className="space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-600 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recovery Strategy */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Recommended Action:
            </h3>
            <p className="text-sm text-blue-800">
              {validationResult.recoveryStrategy === 'reset' && (
                <>
                  The state is too corrupted to recover. We recommend exporting your data
                  for manual recovery, then resetting to a clean state.
                </>
              )}
              {validationResult.recoveryStrategy === 'partial' && (
                <>
                  Some data can be recovered. We'll attempt to preserve as much of your
                  work as possible.
                </>
              )}
              {validationResult.recoveryStrategy === 'migrate' && (
                <>
                  Your data is from a different version. We'll attempt to migrate it to
                  the current format.
                </>
              )}
              {!validationResult.recoveryStrategy && (
                <>
                  Your data appears to be valid but may have minor issues. You can
                  continue or reset to a clean state.
                </>
              )}
            </p>
          </div>

          {/* Data Preservation Notice */}
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> Before taking any action, we recommend exporting your
              data as a backup. This will allow you to manually recover your work if
              needed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-3">
          <div className="flex gap-3">
            {validationResult.canRecover && onRecover && (
              <button
                onClick={handleRecover}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Attempt Recovery
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Reset to Clean State
          </button>
        </div>
      </div>
    </div>
  );
}
