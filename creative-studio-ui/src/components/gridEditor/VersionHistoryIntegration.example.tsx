/**
 * Version History Integration Example
 * 
 * This example demonstrates how to integrate the version history system
 * into the grid editor application.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.6, 15.7
 */

import React, { useState, useEffect } from 'react';
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { versionControlService } from '../../services/gridEditor';
import { useGridStore } from '../../stores/gridEditorStore';

// ============================================================================
// Example 1: Basic Version History Panel Integration
// ============================================================================

export const BasicVersionHistoryExample: React.FC = () => {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const projectId = 'my-project-id';

  return (
    <div className="grid-editor-container">
      {/* Main editor content */}
      <div className="editor-content">
        <button onClick={() => setShowVersionHistory(true)}>
          Show Version History
        </button>
      </div>

      {/* Version history panel (can be modal or sidebar) */}
      {showVersionHistory && (
        <div className="version-history-sidebar">
          <VersionHistoryPanel
            projectId={projectId}
            onClose={() => setShowVersionHistory(false)}
            onRestore={(version) => {
              ;
              setShowVersionHistory(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 2: Auto-Save Integration
// ============================================================================

export const AutoSaveExample: React.FC = () => {
  const projectId = 'my-project-id';
  const { exportConfiguration } = useGridStore();
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5 * 60 * 1000); // 5 minutes

  useEffect(() => {
    if (autoSaveEnabled) {
      // Configure and start auto-save
      versionControlService.startAutoSave(
        () => exportConfiguration(),
        'Auto-save User'
      );

      return () => {
        // Stop auto-save on unmount or when disabled
        versionControlService.stopAutoSave();
      };
    } else {
      versionControlService.stopAutoSave();
    }
  }, [autoSaveEnabled, exportConfiguration]);

  return (
    <div className="auto-save-controls">
      <label>
        <input
          type="checkbox"
          checked={autoSaveEnabled}
          onChange={(e) => setAutoSaveEnabled(e.target.checked)}
        />
        Enable Auto-Save
      </label>

      {autoSaveEnabled && (
        <div className="auto-save-settings">
          <label>
            Interval (minutes):
            <input
              type="number"
              min="1"
              max="60"
              value={autoSaveInterval / 60000}
              onChange={(e) => {
                const minutes = parseInt(e.target.value, 10);
                setAutoSaveInterval(minutes * 60 * 1000);
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 3: Manual Version Saving with Thumbnail
// ============================================================================

export const ManualVersionSaveExample: React.FC = () => {
  const { exportConfiguration } = useGridStore();
  const projectId = 'my-project-id';

  const handleSaveVersion = async () => {
    const description = prompt('Enter version description:');
    if (description === null) return; // User cancelled

    // Generate thumbnail from canvas (if available)
    const canvas = document.querySelector('canvas');
    const thumbnail = canvas?.toDataURL('image/png');

    // Save version with metadata
    const version = versionControlService.saveVersion(
      exportConfiguration(),
      {
        description: description || undefined,
        author: 'Current User',
        thumbnail,
      }
    );

    alert(`Version saved: ${version.metadata.id}`);
  };

  return (
    <button onClick={handleSaveVersion}>
      Save Current Version
    </button>
  );
};

// ============================================================================
// Example 4: Version Comparison Workflow
// ============================================================================

export const VersionComparisonExample: React.FC = () => {
  const projectId = 'my-project-id';
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

  useEffect(() => {
    // Load versions
    const versionList = versionControlService.listVersionMetadata(projectId);
    setVersions(versionList);
  }, [projectId]);

  const handleCompare = () => {
    if (selectedVersions.length !== 2) {
      alert('Please select exactly 2 versions');
      return;
    }

    const comparison = versionControlService.compareVersions(
      projectId,
      selectedVersions[0],
      selectedVersions[1]
    );

    if (comparison) {
      ;
      // Display comparison in UI
    }
  };

  return (
    <div className="version-comparison-workflow">
      <h3>Compare Versions</h3>
      
      <div className="version-list">
        {versions.map((version) => (
          <label key={version.id}>
            <input
              type="checkbox"
              checked={selectedVersions.includes(version.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedVersions([...selectedVersions, version.id].slice(-2));
                } else {
                  setSelectedVersions(selectedVersions.filter(id => id !== version.id));
                }
              }}
            />
            {new Date(version.timestamp).toLocaleString()}
            {version.description && ` - ${version.description}`}
          </label>
        ))}
      </div>

      <button
        onClick={handleCompare}
        disabled={selectedVersions.length !== 2}
      >
        Compare Selected Versions
      </button>
    </div>
  );
};

// ============================================================================
// Example 5: Complete Integration with Toolbar
// ============================================================================

export const CompleteVersionControlExample: React.FC = () => {
  const projectId = 'my-project-id';
  const { exportConfiguration, loadConfiguration } = useGridStore();
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Set up auto-save
  useEffect(() => {
    if (autoSaveEnabled) {
      versionControlService.startAutoSave(
        () => exportConfiguration(),
        'Auto-save User'
      );
    } else {
      versionControlService.stopAutoSave();
    }

    return () => versionControlService.stopAutoSave();
  }, [autoSaveEnabled, exportConfiguration]);

  // Update last saved time
  useEffect(() => {
    const updateLastSaved = () => {
      const latest = versionControlService.getLatestVersion(projectId);
      if (latest) {
        setLastSavedTime(new Date(latest.metadata.timestamp).toLocaleString());
      }
    };

    updateLastSaved();
    const interval = setInterval(updateLastSaved, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [projectId]);

  const handleQuickSave = () => {
    const config = exportConfiguration();
    versionControlService.saveVersionAuto(config, 'Current User');
    alert('Version saved successfully');
  };

  const handleRestoreLatest = () => {
    const latest = versionControlService.getLatestVersion(projectId);
    if (latest) {
      loadConfiguration(latest.configuration);
      alert('Latest version restored');
    } else {
      alert('No versions available');
    }
  };

  return (
    <div className="grid-editor-with-version-control">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <button onClick={handleQuickSave} title="Save current version">
          💾 Quick Save
        </button>

        <button onClick={() => setShowVersionHistory(true)} title="View version history">
          📜 History
        </button>

        <button onClick={handleRestoreLatest} title="Restore latest version">
          ⏮️ Restore Latest
        </button>

        <label className="auto-save-toggle">
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={(e) => setAutoSaveEnabled(e.target.checked)}
          />
          Auto-Save
        </label>

        {lastSavedTime && (
          <span className="last-saved-indicator">
            Last saved: {lastSavedTime}
          </span>
        )}
      </div>

      {/* Main editor content */}
      <div className="editor-content">
        {/* Grid editor components go here */}
      </div>

      {/* Version history panel */}
      {showVersionHistory && (
        <div className="version-history-modal">
          <VersionHistoryPanel
            projectId={projectId}
            onClose={() => setShowVersionHistory(false)}
            onRestore={(version) => {
              ;
              setShowVersionHistory(false);
            }}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Example 6: Version Control with Undo/Redo Integration
// ============================================================================

export const VersionControlWithUndoRedoExample: React.FC = () => {
  const projectId = 'my-project-id';
  const { exportConfiguration } = useGridStore();

  // Save version before major operations
  const handleMajorOperation = (operationName: string) => {
    // Save current state as a version before the operation
    versionControlService.saveVersion(
      exportConfiguration(),
      {
        description: `Before ${operationName}`,
        author: 'Current User',
      }
    );

    // Perform the operation
    ;

    // Save state after the operation
    versionControlService.saveVersion(
      exportConfiguration(),
      {
        description: `After ${operationName}`,
        author: 'Current User',
      }
    );
  };

  return (
    <div className="version-control-with-undo-redo">
      <button onClick={() => handleMajorOperation('Batch Transform')}>
        Apply Batch Transform
      </button>

      <button onClick={() => handleMajorOperation('Apply Preset')}>
        Apply Preset
      </button>

      <button onClick={() => handleMajorOperation('Import Configuration')}>
        Import Configuration
      </button>
    </div>
  );
};

// ============================================================================
// Styling for Examples
// ============================================================================

const exampleStyles = `
  .grid-editor-container {
    display: flex;
    height: 100vh;
  }

  .editor-content {
    flex: 1;
    padding: 20px;
  }

  .version-history-sidebar {
    width: 400px;
    border-left: 1px solid #333;
    background: #1e1e1e;
  }

  .version-history-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-height: 80vh;
    background: #1e1e1e;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    z-index: 1000;
  }

  .editor-toolbar {
    display: flex;
    gap: 8px;
    padding: 12px;
    background: #252525;
    border-bottom: 1px solid #333;
    align-items: center;
  }

  .editor-toolbar button {
    padding: 8px 16px;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  }

  .editor-toolbar button:hover {
    background: #005a9e;
  }

  .auto-save-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #e0e0e0;
  }

  .last-saved-indicator {
    margin-left: auto;
    font-size: 12px;
    color: #888;
  }

  .auto-save-controls {
    padding: 20px;
  }

  .auto-save-settings {
    margin-top: 12px;
    padding: 12px;
    background: #252525;
    border-radius: 4px;
  }

  .version-comparison-workflow {
    padding: 20px;
  }

  .version-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 16px 0;
  }

  .version-list label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: #252525;
    border-radius: 4px;
    cursor: pointer;
  }

  .version-list label:hover {
    background: #2a2a2a;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = exampleStyles;
  document.head.appendChild(styleElement);
}
