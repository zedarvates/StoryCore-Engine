/**
 * Export/Import Controls Component
 * 
 * Provides UI controls for exporting and importing grid configurations.
 * Includes progress indicators and success/error notifications.
 * 
 * Requirements: 10.1, 10.2
 */

import React, { useState, useRef } from 'react';
import { exportService, ExportFormat } from '../../services/gridEditor/ExportService';
import { importService } from '../../services/gridEditor/ImportService';
import { useGridStore, GridConfiguration } from '../../stores/gridEditorStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExportImportControlsProps {
  /**
   * Optional className for styling
   */
  className?: string;

  /**
   * Callback when export completes successfully
   */
  onExportSuccess?: (filename: string) => void;

  /**
   * Callback when import completes successfully
   */
  onImportSuccess?: (config: GridConfiguration) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;

  /**
   * Whether to show as compact buttons (for toolbar)
   */
  compact?: boolean;
}

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  type: NotificationType;
  message: string;
  details?: string[];
}

// ============================================================================
// Export/Import Controls Component
// ============================================================================

export const ExportImportControls: React.FC<ExportImportControlsProps> = ({
  className = '',
  onExportSuccess,
  onImportSuccess,
  onError,
  compact = false,
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Store Hooks
  // ============================================================================

  const config = useGridStore((state) => state.config);
  const loadConfiguration = useGridStore((state) => state.loadConfiguration);
  const clearHistory = useUndoRedoStore((state) => state.clearHistory);

  // ============================================================================
  // Export Handlers
  // ============================================================================

  const handleExport = async (format: ExportFormat = 'json') => {
    setIsExporting(true);
    setNotification(null);
    setShowFormatMenu(false);

    try {
      const result = await exportService.exportConfiguration(config, {
        format,
        prettyPrint: true,
      });

      if (result.success && result.blob && result.filename) {
        // Trigger download
        exportService.downloadFile(result.blob, result.filename);

        // Show success notification
        setNotification({
          type: 'success',
          message: `Configuration exported successfully as ${result.filename}`,
        });

        onExportSuccess?.(result.filename);
      } else {
        // Show error notification
        setNotification({
          type: 'error',
          message: result.error || 'Export failed',
          details: result.validationErrors,
        });

        onError?.(result.error || 'Export failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      setNotification({
        type: 'error',
        message: errorMessage,
      });
      onError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================================================
  // Import Handlers
  // ============================================================================

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setNotification(null);

    try {
      // Check if there are unsaved changes
      const hasUnsavedChanges = useUndoRedoStore.getState().undoStack.length > 0;

      const result = await importService.importConfiguration(
        file,
        { validateSchema: true, confirmUnsavedChanges: true },
        hasUnsavedChanges
      );

      if (result.success && result.data) {
        // Load the configuration
        loadConfiguration(result.data);

        // Clear undo/redo history
        clearHistory();

        // Show success notification with warnings if any
        setNotification({
          type: result.warnings ? 'warning' : 'success',
          message: 'Configuration imported successfully',
          details: result.warnings,
        });

        onImportSuccess?.(result.data);
      } else {
        // Show error notification
        setNotification({
          type: 'error',
          message: result.error || 'Import failed',
          details: result.validationErrors,
        });

        onError?.(result.error || 'Import failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
      setNotification({
        type: 'error',
        message: errorMessage,
      });
      onError?.(errorMessage);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ============================================================================
  // Notification Handlers
  // ============================================================================

  const dismissNotification = () => {
    setNotification(null);
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (compact) {
    return (
      <div className={`export-import-controls-compact ${className}`} style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {/* Export Button with Format Menu */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              title="Export Configuration"
              disabled={isExporting}
              onClick={() => setShowFormatMenu(!showFormatMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
                padding: '8px 12px',
                backgroundColor: '#3a3a3a',
                color: isExporting ? '#666' : '#ccc',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: isExporting ? 'wait' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              {isExporting ? '⏳' : '💾'}
            </button>

            {/* Format Menu */}
            {showFormatMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                  zIndex: 1000,
                  minWidth: '120px',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    color: '#ccc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Export as JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('zip')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    color: '#ccc',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Export as ZIP
                </button>
              </div>
            )}
          </div>

          {/* Import Button */}
          <button
            type="button"
            title="Import Configuration"
            disabled={isImporting}
            onClick={handleImportClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '40px',
              padding: '8px 12px',
              backgroundColor: '#3a3a3a',
              color: isImporting ? '#666' : '#ccc',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: isImporting ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
          >
            {isImporting ? '⏳' : '📂'}
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Notification Toast */}
        {notification && (
          <NotificationToast
            notification={notification}
            onDismiss={dismissNotification}
          />
        )}
      </div>
    );
  }

  // Full UI (non-compact)
  return (
    <div className={`export-import-controls ${className}`} style={{ padding: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {/* Export Section */}
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#ccc', fontSize: '14px', marginBottom: '8px' }}>Export</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExport('json')}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: '#4a90e2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isExporting ? 'wait' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isExporting ? 0.6 : 1,
              }}
            >
              {isExporting ? 'Exporting...' : 'Export as JSON'}
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExport('zip')}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: '#4a90e2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isExporting ? 'wait' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isExporting ? 0.6 : 1,
              }}
            >
              {isExporting ? 'Exporting...' : 'Export as ZIP'}
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div style={{ flex: 1 }}>
          <h3 style={{ color: '#ccc', fontSize: '14px', marginBottom: '8px' }}>Import</h3>
          <button
            type="button"
            disabled={isImporting}
            onClick={handleImportClick}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#5a9e5a',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isImporting ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isImporting ? 0.6 : 1,
            }}
          >
            {isImporting ? 'Importing...' : 'Import Configuration'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          notification={notification}
          onDismiss={dismissNotification}
        />
      )}
    </div>
  );
};

// ============================================================================
// Notification Component (Full)
// ============================================================================

interface NotificationProps {
  notification: Notification;
  onDismiss: () => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const colors = {
    success: { bg: '#2d5a2d', border: '#4a9e4a', text: '#a8e6a8' },
    error: { bg: '#5a2d2d', border: '#9e4a4a', text: '#e6a8a8' },
    warning: { bg: '#5a4a2d', border: '#9e8a4a', text: '#e6d8a8' },
    info: { bg: '#2d4a5a', border: '#4a8a9e', text: '#a8d8e6' },
  };

  const color = colors[notification.type];

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: '4px',
        color: color.text,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            {notification.message}
          </div>
          {notification.details && notification.details.length > 0 && (
            <ul style={{ margin: '8px 0 0 20px', fontSize: '12px' }}>
              {notification.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            marginLeft: '12px',
            padding: '4px 8px',
            backgroundColor: 'transparent',
            color: color.text,
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Notification Toast Component (Compact)
// ============================================================================

const NotificationToast: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const colors = {
    success: { bg: '#2d5a2d', border: '#4a9e4a', text: '#a8e6a8' },
    error: { bg: '#5a2d2d', border: '#9e4a4a', text: '#e6a8a8' },
    warning: { bg: '#5a4a2d', border: '#9e8a4a', text: '#e6d8a8' },
    info: { bg: '#2d4a5a', border: '#4a8a9e', text: '#a8d8e6' },
  };

  const color = colors[notification.type];

  // Auto-dismiss after 5 seconds
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        minWidth: '300px',
        maxWidth: '500px',
        padding: '12px 16px',
        backgroundColor: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: '4px',
        color: color.text,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 10000,
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '13px' }}>
            {notification.message}
          </div>
          {notification.details && notification.details.length > 0 && (
            <ul style={{ margin: '8px 0 0 20px', fontSize: '11px' }}>
              {notification.details.slice(0, 3).map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
              {notification.details.length > 3 && (
                <li>... and {notification.details.length - 3} more</li>
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            marginLeft: '12px',
            padding: '2px 6px',
            backgroundColor: 'transparent',
            color: color.text,
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Export
// ============================================================================

export default ExportImportControls;
