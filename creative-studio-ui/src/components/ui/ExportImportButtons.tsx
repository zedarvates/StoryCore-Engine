/**
 * Export/Import Buttons Component
 * 
 * UI components for exporting and importing configurations
 */

import React, { useRef, useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import {
  exportConfiguration,
  importConfiguration,
} from '../../services/configurationExportImport';
import type { ImportResult } from '../../services/configurationExportImport';
import type { ProjectConfiguration, GlobalConfiguration } from '../../types/configuration';
import './ExportImportButtons.css';

export interface ExportButtonProps {
  configuration: ProjectConfiguration | GlobalConfiguration;
  type: 'project' | 'global';
  filename?: string;
  label?: string;
  className?: string;
  onExport?: () => void;
}

export function ExportButton({
  configuration,
  type,
  filename,
  label = 'Export Configuration',
  className = '',
  onExport,
}: ExportButtonProps) {
  const handleExport = () => {
    exportConfiguration(configuration, type, filename);
    onExport?.();
  };

  return (
    <button
      className={`export-button ${className}`}
      onClick={handleExport}
      aria-label={label}
    >
      <Download className="export-button-icon" />
      {label}
    </button>
  );
}

export interface ImportButtonProps {
  onImport: (configuration: ProjectConfiguration | GlobalConfiguration) => void;
  onError?: (errors: string[]) => void;
  onWarning?: (warnings: string[]) => void;
  label?: string;
  className?: string;
}

export function ImportButton({
  onImport,
  onError,
  onWarning,
  label = 'Import Configuration',
  className = '',
}: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const result = await importConfiguration(file);

      if (result.success && result.configuration) {
        onImport(result.configuration);
        
        if (result.warnings && result.warnings.length > 0) {
          onWarning?.(result.warnings);
        }
      } else if (result.errors) {
        onError?.(result.errors);
      }
    } catch (error) {
      onError?.([error instanceof Error ? error.message : 'Import failed']);
    } finally {
      setIsImporting(false);
      // Reset input to allow importing the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <button
        className={`import-button ${isImporting ? 'import-button-loading' : ''} ${className}`}
        onClick={handleClick}
        disabled={isImporting}
        aria-label={label}
      >
        <Upload className="import-button-icon" />
        {isImporting ? 'Importing...' : label}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </>
  );
}

export interface ExportImportPanelProps {
  configuration: ProjectConfiguration | GlobalConfiguration;
  type: 'project' | 'global';
  filename?: string;
  onImport: (configuration: ProjectConfiguration | GlobalConfiguration) => void;
  onExport?: () => void;
  className?: string;
}

export function ExportImportPanel({
  configuration,
  type,
  filename,
  onImport,
  onExport,
  className = '',
}: ExportImportPanelProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleImport = (config: ProjectConfiguration | GlobalConfiguration) => {
    onImport(config);
    setImportResult({
      success: true,
      configuration: config,
    });
    setShowResult(true);
    setTimeout(() => setShowResult(false), 5000);
  };

  const handleError = (errors: string[]) => {
    setImportResult({
      success: false,
      errors,
    });
    setShowResult(true);
  };

  const handleWarning = (warnings: string[]) => {
    setImportResult({
      success: true,
      warnings,
    });
    setShowResult(true);
    setTimeout(() => setShowResult(false), 5000);
  };

  const handleExport = () => {
    onExport?.();
    setImportResult({
      success: true,
    });
    setShowResult(true);
    setTimeout(() => setShowResult(false), 3000);
  };

  return (
    <div className={`export-import-panel ${className}`}>
      <div className="export-import-buttons">
        <ExportButton
          configuration={configuration}
          type={type}
          filename={filename}
          onExport={handleExport}
        />
        <ImportButton
          onImport={handleImport}
          onError={handleError}
          onWarning={handleWarning}
        />
      </div>

      {showResult && importResult && (
        <div
          className={`export-import-result ${
            importResult.success ? 'export-import-result-success' : 'export-import-result-error'
          }`}
        >
          {importResult.success ? (
            <>
              <CheckCircle className="export-import-result-icon" />
              <div className="export-import-result-content">
                <div className="export-import-result-title">
                  {importResult.configuration ? 'Import Successful' : 'Export Successful'}
                </div>
                {importResult.warnings && importResult.warnings.length > 0 && (
                  <ul className="export-import-result-list">
                    {importResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="export-import-result-icon" />
              <div className="export-import-result-content">
                <div className="export-import-result-title">Import Failed</div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <ul className="export-import-result-list">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
