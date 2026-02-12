/**
 * DataExportImport Component
 * 
 * UI components for exporting and importing wizard data for recovery.
 * 
 * Requirements: 8.8
 */

import React, { useRef, useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, FileJson } from 'lucide-react';
import { exportWizardState, importWizardState } from '../../utils/wizardStorage';

export interface DataExportProps {
  /**
   * Wizard type
   */
  wizardType: 'world' | 'character';

  /**
   * Callback when export is successful
   */
  onExportSuccess?: () => void;

  /**
   * Callback when export fails
   */
  onExportError?: (error: Error) => void;

  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'ghost';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show label
   */
  showLabel?: boolean;
}

export function DataExport({
  wizardType,
  onExportSuccess,
  onExportError,
  variant = 'secondary',
  size = 'md',
  showLabel = true,
}: DataExportProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    try {
      const exportedData = exportWizardState(wizardType);

      if (!exportedData) {
        throw new Error('No wizard data to export');
      }

      // Create download link
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${wizardType}-wizard-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (onExportSuccess) {
        onExportSuccess();
      }
    } catch (error) {
      console.error('Export failed:', error);
      if (onExportError && error instanceof Error) {
        onExportError(error);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center gap-2 rounded font-medium transition-colors';
    
    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-2.5 text-base',
    };

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
      ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`;
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={getButtonClasses()}
      aria-label="Export wizard data"
    >
      <Download className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {showLabel && (isExporting ? 'Exporting...' : 'Export Data')}
    </button>
  );
}

export interface DataImportProps {
  /**
   * Wizard type
   */
  wizardType: 'world' | 'character';

  /**
   * Callback when import is successful
   */
  onImportSuccess?: (data: unknown) => void;

  /**
   * Callback when import fails
   */
  onImportError?: (error: Error) => void;

  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'ghost';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show label
   */
  showLabel?: boolean;
}

export function DataImport({
  wizardType,
  onImportSuccess,
  onImportError,
  variant = 'secondary',
  size = 'md',
  showLabel = true,
}: DataImportProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const success = importWizardState(wizardType, text);

      if (!success) {
        throw new Error('Failed to import wizard data');
      }

      const data = JSON.parse(text);

      if (onImportSuccess) {
        onImportSuccess(data);
      }
    } catch (error) {
      console.error('Import failed:', error);
      if (onImportError && error instanceof Error) {
        onImportError(error);
      }
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center gap-2 rounded font-medium transition-colors';
    
    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-2 text-sm',
      lg: 'px-4 py-2.5 text-base',
    };

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
      ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`;
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Import wizard data file"
      />
      <button
        onClick={handleImport}
        disabled={isImporting}
        className={getButtonClasses()}
        aria-label="Import wizard data"
      >
        <Upload className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        {showLabel && (isImporting ? 'Importing...' : 'Import Data')}
      </button>
    </>
  );
}

export interface DataExportImportPanelProps {
  /**
   * Wizard type
   */
  wizardType: 'world' | 'character';

  /**
   * Show as compact inline buttons
   */
  compact?: boolean;
}

export function DataExportImportPanel({
  wizardType,
  compact = false,
}: DataExportImportPanelProps): JSX.Element {
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleExportSuccess = () => {
    setMessage({
      type: 'success',
      text: 'Data exported successfully',
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportError = (error: Error) => {
    setMessage({
      type: 'error',
      text: `Export failed: ${error.message}`,
    });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleImportSuccess = () => {
    setMessage({
      type: 'success',
      text: 'Data imported successfully. Reload the wizard to see changes.',
    });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleImportError = (error: Error) => {
    setMessage({
      type: 'error',
      text: `Import failed: ${error.message}`,
    });
    setTimeout(() => setMessage(null), 5000);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <DataExport
            wizardType={wizardType}
            onExportSuccess={handleExportSuccess}
            onExportError={handleExportError}
            variant="secondary"
            size="sm"
          />
          <DataImport
            wizardType={wizardType}
            onImportSuccess={handleImportSuccess}
            onImportError={handleImportError}
            variant="secondary"
            size="sm"
          />
        </div>
        {message && (
          <div
            className={`flex items-center gap-2 p-2 rounded text-xs ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {message.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <FileJson className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            Data Backup & Recovery
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Export your wizard progress to save a backup, or import previously saved data
            to restore your work.
          </p>
          <div className="flex gap-2">
            <DataExport
              wizardType={wizardType}
              onExportSuccess={handleExportSuccess}
              onExportError={handleExportError}
              variant="secondary"
              size="md"
            />
            <DataImport
              wizardType={wizardType}
              onImportSuccess={handleImportSuccess}
              onImportError={handleImportError}
              variant="secondary"
              size="md"
            />
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
          role="alert"
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}
    </div>
  );
}

