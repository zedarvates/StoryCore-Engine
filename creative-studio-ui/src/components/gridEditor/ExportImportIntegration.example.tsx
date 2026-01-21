/**
 * Export/Import Integration Example
 * 
 * Demonstrates how to integrate export/import functionality into the Grid Editor.
 * Shows both compact (toolbar) and full UI modes.
 */

import React from 'react';
import { ExportImportControls } from './ExportImportControls';
import { Toolbar } from './Toolbar';
import { GridConfiguration } from '../../stores/gridEditorStore';

// ============================================================================
// Example 1: Compact Mode in Toolbar (Already Integrated)
// ============================================================================

/**
 * The Toolbar component already includes ExportImportControls in compact mode.
 * No additional integration needed - just use the Toolbar component.
 */
export const ToolbarWithExportImportExample: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#1a1a1a' }}>
      <Toolbar />
      <div style={{ padding: '20px', color: '#ccc' }}>
        <p>The toolbar above includes export/import buttons on the right side.</p>
        <p>Click the 💾 icon to export, and the 📂 icon to import.</p>
      </div>
    </div>
  );
};

// ============================================================================
// Example 2: Full UI Mode (Standalone Panel)
// ============================================================================

/**
 * Use the full UI mode for a dedicated export/import panel
 * (e.g., in a settings dialog or properties panel)
 */
export const FullExportImportPanelExample: React.FC = () => {
  const handleExportSuccess = (filename: string) => {
    ;
  };

  const handleImportSuccess = (config: GridConfiguration) => {
    ;
  };

  const handleError = (error: string) => {
    console.error('Operation failed:', error);
  };

  return (
    <div style={{ width: '600px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
      <ExportImportControls
        compact={false}
        onExportSuccess={handleExportSuccess}
        onImportSuccess={handleImportSuccess}
        onError={handleError}
      />
    </div>
  );
};

// ============================================================================
// Example 3: Custom Integration with Callbacks
// ============================================================================

/**
 * Custom integration with full control over export/import lifecycle
 */
export const CustomIntegrationExample: React.FC = () => {
  const [lastOperation, setLastOperation] = React.useState<string>('None');

  const handleExportSuccess = (filename: string) => {
    setLastOperation(`Exported: ${filename}`);
    // Custom logic: e.g., send analytics event, show custom notification
  };

  const handleImportSuccess = (config: GridConfiguration) => {
    setLastOperation(`Imported: ${config.projectId}`);
    // Custom logic: e.g., validate additional business rules, trigger refresh
  };

  const handleError = (error: string) => {
    setLastOperation(`Error: ${error}`);
    // Custom logic: e.g., send error to logging service, show custom error UI
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a' }}>
      <h2 style={{ color: '#ccc', marginBottom: '16px' }}>Grid Configuration Manager</h2>
      
      <ExportImportControls
        compact={false}
        onExportSuccess={handleExportSuccess}
        onImportSuccess={handleImportSuccess}
        onError={handleError}
      />

      <div
        style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
          color: '#ccc',
          fontSize: '13px',
        }}
      >
        <strong>Last Operation:</strong> {lastOperation}
      </div>
    </div>
  );
};

// ============================================================================
// Example 4: Programmatic Export/Import
// ============================================================================

/**
 * Use the services directly for programmatic export/import
 * (without UI components)
 */
import { exportService } from '../../services/gridEditor/ExportService';
import { importService } from '../../services/gridEditor/ImportService';
import { useGridStore } from '../../stores/gridEditorStore';

export const ProgrammaticExportImportExample: React.FC = () => {
  const config = useGridStore((state) => state.config);
  const loadConfiguration = useGridStore((state) => state.loadConfiguration);

  const handleProgrammaticExport = async () => {
    const result = await exportService.exportConfiguration(config, {
      format: 'json',
      prettyPrint: true,
    });

    if (result.success && result.blob && result.filename) {
      // Option 1: Download file
      exportService.downloadFile(result.blob, result.filename);

      // Option 2: Send to server
      // await uploadToServer(result.blob);

      // Option 3: Store in localStorage
      // const reader = new FileReader();
      // reader.onload = () => localStorage.setItem('gridConfig', reader.result as string);
      // reader.readAsText(result.blob);
    }
  };

  const handleProgrammaticImport = async (jsonString: string) => {
    const result = await importService.importFromJSON(jsonString, {
      validateSchema: true,
      confirmUnsavedChanges: false, // Skip confirmation for programmatic import
    });

    if (result.success && result.data) {
      loadConfiguration(result.data);
      ;
    } else {
      console.error('Import failed:', result.error, result.validationErrors);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a' }}>
      <h2 style={{ color: '#ccc', marginBottom: '16px' }}>Programmatic Export/Import</h2>
      
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleProgrammaticExport}
          style={{
            padding: '10px 16px',
            backgroundColor: '#4a90e2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Export Programmatically
        </button>

        <button
          onClick={() => {
            // Example: Import from localStorage
            const stored = localStorage.getItem('gridConfig');
            if (stored) {
              handleProgrammaticImport(stored);
            }
          }}
          style={{
            padding: '10px 16px',
            backgroundColor: '#5a9e5a',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Import from LocalStorage
        </button>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#2a2a2a',
          borderRadius: '4px',
          color: '#999',
          fontSize: '12px',
        }}
      >
        <p>This example shows how to use the export/import services directly without UI components.</p>
        <p>Useful for:</p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>Auto-save functionality</li>
          <li>Server synchronization</li>
          <li>Custom storage backends</li>
          <li>Batch operations</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================================================
// Example 5: Custom Unsaved Changes Handler
// ============================================================================

/**
 * Set up a custom handler for unsaved changes confirmation
 */
export const CustomUnsavedChangesExample: React.FC = () => {
  React.useEffect(() => {
    // Set up custom confirmation handler
    importService.setUnsavedChangesCallback(async () => {
      // Custom confirmation dialog (could be a modal, toast, etc.)
      return new Promise((resolve) => {
        const confirmed = window.confirm(
          'You have unsaved changes. Importing will discard them. Continue?'
        );
        resolve(confirmed);
      });
    });

    return () => {
      // Clean up on unmount
      importService.setUnsavedChangesCallback(async () => true);
    };
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#1a1a1a' }}>
      <h2 style={{ color: '#ccc', marginBottom: '16px' }}>Custom Unsaved Changes Handler</h2>
      <ExportImportControls compact={false} />
    </div>
  );
};

// ============================================================================
// Export All Examples
// ============================================================================

export default {
  ToolbarWithExportImportExample,
  FullExportImportPanelExample,
  CustomIntegrationExample,
  ProgrammaticExportImportExample,
  CustomUnsavedChangesExample,
};
