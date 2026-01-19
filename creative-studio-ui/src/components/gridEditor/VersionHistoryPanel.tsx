/**
 * Version History Panel - UI for managing version history
 * 
 * This component provides:
 * - List of saved versions with metadata
 * - Version preview thumbnails
 * - Version comparison view
 * - Restore and export version actions
 * 
 * Requirements: 15.2, 15.3, 15.4, 15.6
 */

import React, { useState, useEffect } from 'react';
import {
  versionControlService,
  VersionMetadata,
  SavedVersion,
  VersionComparison,
} from '../../services/gridEditor';
import { useGridStore } from '../../stores/gridEditorStore';
import './VersionHistoryPanel.css';

// ============================================================================
// Type Definitions
// ============================================================================

interface VersionHistoryPanelProps {
  projectId: string;
  onRestore?: (version: SavedVersion) => void;
  onClose?: () => void;
}

interface VersionItemProps {
  version: VersionMetadata;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onExport: () => void;
  onDelete: () => void;
}

// ============================================================================
// Version Item Component
// ============================================================================

const VersionItem: React.FC<VersionItemProps> = ({
  version,
  isSelected,
  onSelect,
  onRestore,
  onExport,
  onDelete,
}) => {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div
      className={`version-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {version.thumbnail && (
        <div className="version-thumbnail">
          <img src={version.thumbnail} alt={`Version ${version.id}`} />
        </div>
      )}
      
      <div className="version-info">
        <div className="version-timestamp">{formatDate(version.timestamp)}</div>
        
        {version.description && (
          <div className="version-description">{version.description}</div>
        )}
        
        {version.author && (
          <div className="version-author">By: {version.author}</div>
        )}
      </div>

      <div className="version-actions">
        <button
          className="version-action-btn restore-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          title="Restore this version"
        >
          Restore
        </button>
        
        <button
          className="version-action-btn export-btn"
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
          title="Export this version"
        >
          Export
        </button>
        
        <button
          className="version-action-btn delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete this version"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Version Comparison Component
// ============================================================================

interface VersionComparisonViewProps {
  comparison: VersionComparison;
  onClose: () => void;
}

const VersionComparisonView: React.FC<VersionComparisonViewProps> = ({
  comparison,
  onClose,
}) => {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="version-comparison-overlay">
      <div className="version-comparison-modal">
        <div className="version-comparison-header">
          <h3>Version Comparison</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="version-comparison-info">
          <div className="comparison-version">
            <strong>Version 1:</strong> {formatDate(comparison.version1.timestamp)}
            {comparison.version1.description && (
              <div className="comparison-description">{comparison.version1.description}</div>
            )}
          </div>
          
          <div className="comparison-version">
            <strong>Version 2:</strong> {formatDate(comparison.version2.timestamp)}
            {comparison.version2.description && (
              <div className="comparison-description">{comparison.version2.description}</div>
            )}
          </div>
        </div>

        <div className="version-comparison-differences">
          <h4>Differences ({comparison.differences.length})</h4>
          
          {comparison.differences.length === 0 ? (
            <div className="no-differences">No differences found</div>
          ) : (
            <div className="differences-list">
              {comparison.differences.map((diff, index) => (
                <div key={index} className={`difference-item ${diff.type}`}>
                  <div className="difference-type">{diff.type.replace(/_/g, ' ')}</div>
                  <div className="difference-description">{diff.description}</div>
                  
                  {diff.panelId && (
                    <div className="difference-panel">Panel: {diff.panelId}</div>
                  )}
                  
                  {diff.layerId && (
                    <div className="difference-layer">Layer: {diff.layerId}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="version-comparison-footer">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Version History Panel Component
// ============================================================================

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  projectId,
  onRestore,
  onClose,
}) => {
  const [versions, setVersions] = useState<VersionMetadata[]>([]);
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  
  const { loadConfiguration, exportConfiguration } = useGridStore();

  // Load versions on mount and when projectId changes
  useEffect(() => {
    loadVersions();
  }, [projectId]);

  // Update last saved time
  useEffect(() => {
    const latestVersion = versions[0];
    if (latestVersion) {
      setLastSavedTime(new Date(latestVersion.timestamp).toLocaleString());
    }
  }, [versions]);

  const loadVersions = () => {
    const versionList = versionControlService.listVersionMetadata(projectId);
    setVersions(versionList);
  };

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionIds((prev) => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      } else if (prev.length < 2) {
        return [...prev, versionId];
      } else {
        // Replace oldest selection
        return [prev[1], versionId];
      }
    });
  };

  const handleRestore = (versionId: string) => {
    const version = versionControlService.getVersion(projectId, versionId);
    
    if (!version) {
      alert('Version not found');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to restore this version? Current unsaved changes will be lost.'
    );

    if (confirmed) {
      loadConfiguration(version.configuration);
      
      if (onRestore) {
        onRestore(version);
      }

      alert('Version restored successfully');
    }
  };

  const handleExport = (versionId: string) => {
    const version = versionControlService.getVersion(projectId, versionId);
    
    if (!version) {
      alert('Version not found');
      return;
    }

    // Export the version configuration
    const json = JSON.stringify(version.configuration, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `grid-config-${versionId}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleDelete = (versionId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this version? This action cannot be undone.'
    );

    if (confirmed) {
      const success = versionControlService.deleteVersion(projectId, versionId);
      
      if (success) {
        loadVersions();
        setSelectedVersionIds(prev => prev.filter(id => id !== versionId));
        alert('Version deleted successfully');
      } else {
        alert('Failed to delete version');
      }
    }
  };

  const handleCompare = () => {
    if (selectedVersionIds.length !== 2) {
      alert('Please select exactly 2 versions to compare');
      return;
    }

    const comparisonResult = versionControlService.compareVersions(
      projectId,
      selectedVersionIds[0],
      selectedVersionIds[1]
    );

    if (comparisonResult) {
      setComparison(comparisonResult);
    } else {
      alert('Failed to compare versions');
    }
  };

  const handleSaveCurrentVersion = () => {
    const description = prompt('Enter a description for this version (optional):');
    
    if (description !== null) { // User didn't cancel
      const config = exportConfiguration();
      versionControlService.saveVersion(config, { description: description || undefined });
      loadVersions();
      alert('Version saved successfully');
    }
  };

  const handleExportHistory = () => {
    const blob = versionControlService.exportVersionHistory(projectId);
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `version-history-${projectId}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const handleImportHistory = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const count = await versionControlService.importVersionHistory(projectId, file);
        loadVersions();
        alert(`Successfully imported ${count} new version(s)`);
      } catch (error) {
        alert(`Failed to import version history: ${error}`);
      }
    };

    input.click();
  };

  const storageStats = versionControlService.getStorageStats(projectId);

  return (
    <div className="version-history-panel">
      <div className="version-history-header">
        <h2>Version History</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="version-history-toolbar">
        <button
          className="btn-primary"
          onClick={handleSaveCurrentVersion}
          title="Save current state as a new version"
        >
          Save Version
        </button>

        <button
          className="btn-secondary"
          onClick={handleCompare}
          disabled={selectedVersionIds.length !== 2}
          title="Compare two selected versions"
        >
          Compare ({selectedVersionIds.length}/2)
        </button>

        <button
          className="btn-secondary"
          onClick={handleExportHistory}
          title="Export all version history"
        >
          Export History
        </button>

        <button
          className="btn-secondary"
          onClick={handleImportHistory}
          title="Import version history"
        >
          Import History
        </button>
      </div>

      {lastSavedTime && (
        <div className="last-saved-info">
          Last saved: {lastSavedTime}
        </div>
      )}

      <div className="version-history-stats">
        <span>Versions: {storageStats.versionCount}</span>
        <span>Storage: {(storageStats.totalSize / 1024).toFixed(2)} KB</span>
      </div>

      <div className="version-history-list">
        {versions.length === 0 ? (
          <div className="no-versions">
            No versions saved yet. Click "Save Version" to create your first version.
          </div>
        ) : (
          versions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              isSelected={selectedVersionIds.includes(version.id)}
              onSelect={() => handleVersionSelect(version.id)}
              onRestore={() => handleRestore(version.id)}
              onExport={() => handleExport(version.id)}
              onDelete={() => handleDelete(version.id)}
            />
          ))
        )}
      </div>

      {comparison && (
        <VersionComparisonView
          comparison={comparison}
          onClose={() => setComparison(null)}
        />
      )}
    </div>
  );
};

export default VersionHistoryPanel;
