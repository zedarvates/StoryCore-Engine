/**
 * Configuration Export/Import Component
 * 
 * UI for exporting and importing grid editor configurations.
 * Supports JSON, YAML, and URL formats with conflict resolution.
 * 
 * Exigences: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  exportGridConfiguration,
  exportAsTemplate,
  importGridConfiguration,
  importFromURL,
  detectConflicts,
  resolveConflicts,
  type GridEditorConfiguration,
  type GridEditorTemplate,
  type ExportFormat,
  type ImportResult,
  type ConfigurationConflict
} from '../../services/gridEditor/ConfigurationExportImport';

export interface ConfigurationExportImportProps {
  currentConfiguration: GridEditorConfiguration;
  onImport: (configuration: GridEditorConfiguration) => void;
  onClose?: () => void;
}

export const ConfigurationExportImport: React.FC<ConfigurationExportImportProps> = ({
  currentConfiguration,
  onImport,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportType, setExportType] = useState<'full' | 'template'>('full');
  const [templateInfo, setTemplateInfo] = useState({
    name: '',
    description: '',
    author: '',
    tags: [] as string[]
  });
  
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [conflicts, setConflicts] = useState<ConfigurationConflict[]>([]);
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle export
   * Exigences: 15.1, 15.3, 15.6, 15.7
   */
  const handleExport = useCallback(() => {
    if (exportType === 'template') {
      if (!templateInfo.name.trim()) {
        alert('Please enter a template name');
        return;
      }
      
      exportAsTemplate(
        currentConfiguration,
        templateInfo,
        exportFormat
      );
    } else {
      exportGridConfiguration(
        currentConfiguration,
        exportFormat
      );
    }
    
    // Show success message
    showNotification('Configuration exported successfully!', 'success');
  }, [currentConfiguration, exportFormat, exportType, templateInfo]);

  /**
   * Handle file import
   * Exigences: 15.2, 15.5, 15.8
   */
  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const result = await importGridConfiguration(file);
    setImportResult(result);
    
    if (result.success && result.configuration) {
      // Check for conflicts
      const detectedConflicts = detectConflicts(
        currentConfiguration,
        result.configuration as GridEditorConfiguration
      );
      
      if (detectedConflicts.length > 0) {
        setConflicts(detectedConflicts);
        setShowConflictResolution(true);
      } else {
        // No conflicts, apply directly
        applyImportedConfiguration(result.configuration as GridEditorConfiguration);
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentConfiguration]);

  /**
   * Handle URL import
   * Exigence: 15.4
   */
  const handleURLImport = useCallback(() => {
    if (!urlInput.trim()) {
      alert('Please enter a configuration URL');
      return;
    }
    
    const result = importFromURL(urlInput);
    setImportResult(result);
    
    if (result.success && result.configuration) {
      // Check for conflicts
      const detectedConflicts = detectConflicts(
        currentConfiguration,
        result.configuration as GridEditorConfiguration
      );
      
      if (detectedConflicts.length > 0) {
        setConflicts(detectedConflicts);
        setShowConflictResolution(true);
      } else {
        // No conflicts, apply directly
        applyImportedConfiguration(result.configuration as GridEditorConfiguration);
      }
    }
  }, [urlInput, currentConfiguration]);

  /**
   * Apply imported configuration
   */
  const applyImportedConfiguration = useCallback((config: GridEditorConfiguration) => {
    onImport(config);
    showNotification('Configuration imported successfully!', 'success');
    setImportResult(null);
    setConflicts([]);
    setShowConflictResolution(false);
  }, [onImport]);

  /**
   * Resolve conflicts and apply
   * Exigence: 15.5
   */
  const handleConflictResolution = useCallback((strategy: 'keep_current' | 'use_imported' | 'merge') => {
    if (!importResult?.configuration) return;
    
    const resolved = resolveConflicts(
      currentConfiguration,
      importResult.configuration as GridEditorConfiguration,
      conflicts,
      strategy
    );
    
    applyImportedConfiguration(resolved);
  }, [currentConfiguration, importResult, conflicts, applyImportedConfiguration]);

  return (
    <motion.div
      className="configuration-export-import"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        maxHeight: '80vh',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden',
        zIndex: 10000
      }}
    >
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
          Configuration Management
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('export')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            background: activeTab === 'export' ? '#f5f5f5' : 'transparent',
            borderBottom: activeTab === 'export' ? '2px solid #2196F3' : 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'export' ? 600 : 400
          }}
        >
          📤 Export
        </button>
        <button
          onClick={() => setActiveTab('import')}
          style={{
            flex: 1,
            padding: '16px',
            border: 'none',
            background: activeTab === 'import' ? '#f5f5f5' : 'transparent',
            borderBottom: activeTab === 'import' ? '2px solid #2196F3' : 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'import' ? 600 : 400
          }}
        >
          📥 Import
        </button>
      </div>

      {/* Content */}
      <div style={{
        padding: '20px',
        maxHeight: 'calc(80vh - 140px)',
        overflowY: 'auto'
      }}>
        <AnimatePresence mode="wait">
          {activeTab === 'export' ? (
            <ExportTab
              exportFormat={exportFormat}
              exportType={exportType}
              templateInfo={templateInfo}
              onFormatChange={setExportFormat}
              onTypeChange={setExportType}
              onTemplateInfoChange={setTemplateInfo}
              onExport={handleExport}
            />
          ) : (
            <ImportTab
              urlInput={urlInput}
              importResult={importResult}
              conflicts={conflicts}
              showConflictResolution={showConflictResolution}
              onUrlInputChange={setUrlInput}
              onFileImport={handleFileImport}
              onURLImport={handleURLImport}
              onConflictResolution={handleConflictResolution}
              onCancelConflictResolution={() => {
                setShowConflictResolution(false);
                setImportResult(null);
                setConflicts([]);
              }}
              fileInputRef={fileInputRef}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/**
 * Export Tab Component
 */
interface ExportTabProps {
  exportFormat: ExportFormat;
  exportType: 'full' | 'template';
  templateInfo: {
    name: string;
    description: string;
    author: string;
    tags: string[];
  };
  onFormatChange: (format: ExportFormat) => void;
  onTypeChange: (type: 'full' | 'template') => void;
  onTemplateInfoChange: (info: any) => void;
  onExport: () => void;
}

const ExportTab: React.FC<ExportTabProps> = ({
  exportFormat,
  exportType,
  templateInfo,
  onFormatChange,
  onTypeChange,
  onTemplateInfoChange,
  onExport
}) => {
  return (
    <motion.div
      key="export"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      {/* Export Type */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Export Type
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={exportType === 'full'}
              onChange={() => onTypeChange('full')}
              style={{ marginRight: '8px' }}
            />
            Full Configuration
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={exportType === 'template'}
              onChange={() => onTypeChange('template')}
              style={{ marginRight: '8px' }}
            />
            Template (Reusable)
          </label>
        </div>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
          {exportType === 'full' 
            ? 'Includes all settings and panel positions'
            : 'Includes only reusable settings (no panel positions)'}
        </p>
      </div>

      {/* Template Info (if template type) */}
      {exportType === 'template' && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
              Template Name *
            </label>
            <input
              type="text"
              value={templateInfo.name}
              onChange={(e) => onTemplateInfoChange({ ...templateInfo, name: e.target.value })}
              placeholder="e.g., 3-Column Layout"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
              Description
            </label>
            <textarea
              value={templateInfo.description}
              onChange={(e) => onTemplateInfoChange({ ...templateInfo, description: e.target.value })}
              placeholder="Describe this template..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>
              Author
            </label>
            <input
              type="text"
              value={templateInfo.author}
              onChange={(e) => onTemplateInfoChange({ ...templateInfo, author: e.target.value })}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      )}

      {/* Export Format */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
          Export Format
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={exportFormat === 'json'}
              onChange={() => onFormatChange('json')}
              style={{ marginRight: '8px' }}
            />
            JSON
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={exportFormat === 'yaml'}
              onChange={() => onFormatChange('yaml')}
              style={{ marginRight: '8px' }}
            />
            YAML
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              checked={exportFormat === 'url'}
              onChange={() => onFormatChange('url')}
              style={{ marginRight: '8px' }}
            />
            URL (Shareable)
          </label>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        style={{
          width: '100%',
          padding: '12px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        {exportFormat === 'url' ? '📋 Copy URL to Clipboard' : '💾 Download Configuration'}
      </button>
    </motion.div>
  );
};

/**
 * Import Tab Component
 */
interface ImportTabProps {
  urlInput: string;
  importResult: ImportResult | null;
  conflicts: ConfigurationConflict[];
  showConflictResolution: boolean;
  onUrlInputChange: (url: string) => void;
  onFileImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onURLImport: () => void;
  onConflictResolution: (strategy: 'keep_current' | 'use_imported' | 'merge') => void;
  onCancelConflictResolution: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const ImportTab: React.FC<ImportTabProps> = ({
  urlInput,
  importResult,
  conflicts,
  showConflictResolution,
  onUrlInputChange,
  onFileImport,
  onURLImport,
  onConflictResolution,
  onCancelConflictResolution,
  fileInputRef
}) => {
  return (
    <motion.div
      key="import"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {showConflictResolution ? (
        <ConflictResolution
          conflicts={conflicts}
          onResolve={onConflictResolution}
          onCancel={onCancelConflictResolution}
        />
      ) : (
        <>
          {/* File Import */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Import from File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml"
              onChange={onFileImport}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '12px',
                background: '#f5f5f5',
                border: '2px dashed #ddd',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📁 Choose File (JSON or YAML)
            </button>
          </div>

          {/* URL Import */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Import from URL
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => onUrlInputChange(e.target.value)}
                placeholder="storycore://grid-config/..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px'
                }}
              />
              <button
                onClick={onURLImport}
                style={{
                  padding: '8px 16px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Import
              </button>
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <ImportResultDisplay result={importResult} />
          )}
        </>
      )}
    </motion.div>
  );
};

/**
 * Import Result Display
 */
const ImportResultDisplay: React.FC<{ result: ImportResult }> = ({ result }) => {
  if (!result.success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '16px',
          background: '#ffebee',
          border: '1px solid #ef5350',
          borderRadius: '8px'
        }}
      >
        <div style={{ fontWeight: 600, color: '#c62828', marginBottom: '8px' }}>
          ❌ Import Failed
        </div>
        {result.errors && result.errors.map((error, index) => (
          <div key={index} style={{ fontSize: '14px', color: '#d32f2f', marginBottom: '4px' }}>
            • {error}
          </div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '16px',
        background: '#e8f5e9',
        border: '1px solid #66bb6a',
        borderRadius: '8px'
      }}
    >
      <div style={{ fontWeight: 600, color: '#2e7d32', marginBottom: '8px' }}>
        ✅ Import Successful
      </div>
      {result.warnings && result.warnings.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontWeight: 500, color: '#f57c00', marginBottom: '4px' }}>
            ⚠️ Warnings:
          </div>
          {result.warnings.map((warning, index) => (
            <div key={index} style={{ fontSize: '14px', color: '#e65100', marginBottom: '4px' }}>
              • {warning}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

/**
 * Conflict Resolution Component
 */
interface ConflictResolutionProps {
  conflicts: ConfigurationConflict[];
  onResolve: (strategy: 'keep_current' | 'use_imported' | 'merge') => void;
  onCancel: () => void;
}

const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  conflicts,
  onResolve,
  onCancel
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
          ⚠️ Configuration Conflicts Detected
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          The imported configuration has {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} with your current settings.
        </p>
      </div>

      {/* Conflicts List */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        marginBottom: '16px',
        padding: '12px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        {conflicts.map((conflict, index) => (
          <div
            key={index}
            style={{
              padding: '12px',
              background: 'white',
              borderRadius: '6px',
              marginBottom: index < conflicts.length - 1 ? '8px' : 0
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>
              {conflict.field}
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#666' }}>Current:</span>{' '}
                <span style={{ fontWeight: 500 }}>{String(conflict.currentValue)}</span>
              </div>
              <div>
                <span style={{ color: '#666' }}>Imported:</span>{' '}
                <span style={{ fontWeight: 500 }}>{String(conflict.importedValue)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resolution Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => onResolve('use_imported')}
          style={{
            padding: '12px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Use Imported Values
        </button>
        <button
          onClick={() => onResolve('keep_current')}
          style={{
            padding: '12px',
            background: '#757575',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Keep Current Values
        </button>
        <button
          onClick={() => onResolve('merge')}
          style={{
            padding: '12px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Smart Merge (Recommended)
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '12px',
            background: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Cancel Import
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Show notification helper
 */
function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  const event = new CustomEvent('grid-config-notification', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
}
