/**
 * Auto-Save Indicator Component
 * 
 * This component provides:
 * - Visual indicator for auto-save status
 * - Last saved timestamp display
 * - Auto-save enable/disable toggle
 * - Interval configuration
 * 
 * Requirements: 15.7
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { versionControlService } from '../../services/gridEditor/VersionControlService';
import { useGridStore } from '../../stores/gridEditorStore';
import './AutoSaveIndicator.css';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AutoSaveIndicatorProps {
  /**
   * Project ID for version control
   */
  projectId: string;

  /**
   * Author name for auto-saved versions
   */
  author?: string;

  /**
   * Initial auto-save interval in minutes
   * Default: 5 minutes
   */
  initialInterval?: number;

  /**
   * Whether auto-save is enabled by default
   * Default: false
   */
  defaultEnabled?: boolean;

  /**
   * Show configuration controls
   * Default: true
   */
  showControls?: boolean;

  /**
   * Compact mode (minimal UI)
   * Default: false
   */
  compact?: boolean;
}

function useGridVersionAutoSave(projectId: string, author: string, intervalMinutes: number, defaultEnabled: boolean) {
  const [isEnabled, setIsEnabled] = useState(defaultEnabled);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSavedModification = useRef<number | undefined>(undefined);
  const savedIndicatorTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setShowSaved(false);
    setError(null);
    lastSavedModification.current = undefined;
    try {
      const latest = versionControlService.getLatestVersion(projectId);
      lastSavedModification.current = latest?.configuration.metadata.modifiedAt;
      setLastSavedAt(latest?.metadata.timestamp ?? null);
    } catch (error) {
      setLastSavedAt(null);
      setError(error instanceof Error ? error.message : 'Could not read the version history');
    }
    return () => window.clearTimeout(savedIndicatorTimer.current);
  }, [projectId]);

  const save = useCallback((automatic: boolean) => {
    const configuration = useGridStore.getState().exportConfiguration();
    if (configuration.projectId !== projectId) {
      if (!automatic) setError('Open this project before saving a version');
      return;
    }
    if (automatic && configuration.metadata.modifiedAt === lastSavedModification.current) return;
    try {
      const version = automatic
        ? versionControlService.saveVersionAuto(configuration, author)
        : versionControlService.saveVersion(configuration, { author });
      lastSavedModification.current = configuration.metadata.modifiedAt;
      setLastSavedAt(version.metadata.timestamp);
      setShowSaved(true);
      setError(null);
      window.clearTimeout(savedIndicatorTimer.current);
      savedIndicatorTimer.current = window.setTimeout(() => setShowSaved(false), 2000);
    } catch (error) {
      setShowSaved(false);
      setError(error instanceof Error ? error.message : 'Could not save the version');
    }
  }, [author, projectId]);

  useEffect(() => {
    if (!isEnabled) return;
    const timer = window.setInterval(() => save(true), intervalMinutes * 60_000);
    return () => window.clearInterval(timer);
  }, [isEnabled, intervalMinutes, save]);

  return {
    isEnabled,
    toggle: () => setIsEnabled((enabled) => !enabled),
    lastSavedAt,
    lastSavedText: lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleString()}` : '',
    showSaved,
    error,
    saveNow: () => save(false),
  };
}

// ============================================================================
// Auto-Save Indicator Component
// ============================================================================

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  projectId,
  author = 'User',
  initialInterval = 5,
  defaultEnabled = false,
  showControls = true,
  compact = false,
}) => {
  const [intervalMinutes, setIntervalMinutes] = useState(initialInterval);
  const [showSettings, setShowSettings] = useState(false);
  const { isEnabled, toggle, lastSavedAt, lastSavedText, showSaved, error, saveNow } =
    useGridVersionAutoSave(projectId, author, intervalMinutes, defaultEnabled);

  const handleIntervalChange = (minutes: number) => {
    if (minutes < 1 || minutes > 60) {
      alert('Interval must be between 1 and 60 minutes');
      return;
    }
    setIntervalMinutes(minutes);
  };

  if (compact) {
    return (
      <div className="auto-save-indicator compact">
        <button
          className={`auto-save-toggle ${isEnabled ? 'enabled' : 'disabled'}`}
          onClick={toggle}
          title={isEnabled ? 'Disable auto-save' : 'Enable auto-save'}
        >
          {isEnabled ? '💾' : '💾'}
        </button>

        {error && <span role="alert">{error}</span>}
        {showSaved && <span className="saved-indicator">✓</span>}

        {lastSavedAt && (
          <span className="last-saved-text">{lastSavedText}</span>
        )}
      </div>
    );
  }

  return (
    <div className="auto-save-indicator">
      <div className="auto-save-status">
        {/* Status indicator */}
        <div className="status-icon">
          {showSaved && (
            <span className="saved-checkmark" title="Saved">
              ✓
            </span>
          )}
          {!showSaved && isEnabled && (
            <span className="auto-save-active" title="Auto-save enabled">
              💾
            </span>
          )}
          {!isEnabled && (
            <span className="auto-save-inactive" title="Auto-save disabled">
              💾
            </span>
          )}
        </div>

        {/* Status text */}
        <div className="status-text">
          {error && <span role="alert">{error}</span>}
          {showSaved && <span className="saved-text">Saved!</span>}
          {!showSaved && lastSavedAt && (
            <span className="last-saved-text">{lastSavedText}</span>
          )}
          {!lastSavedAt && (
            <span className="not-saved-text">Not saved yet</span>
          )}
        </div>
      </div>

      {showControls && (
        <div className="auto-save-controls">
          {/* Enable/Disable toggle */}
          <label className="auto-save-toggle-label">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={toggle}
              className="auto-save-checkbox"
            />
            <span>Auto-Save</span>
          </label>

          {/* Manual save button */}
          <button
            className="manual-save-btn"
            onClick={saveNow}
            title="Save now"
          >
            Save Now
          </button>

          {/* Settings button */}
          <button
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Auto-save settings"
          >
            ⚙️
          </button>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="auto-save-settings">
          <div className="settings-header">
            <h4>Auto-Save Settings</h4>
            <button
              className="close-settings-btn"
              onClick={() => setShowSettings(false)}
            >
              ×
            </button>
          </div>

          <div className="settings-content">
            <label className="interval-label">
              <span>Save every:</span>
              <div className="interval-input-group">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={intervalMinutes}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      handleIntervalChange(value);
                    }
                  }}
                  className="interval-input"
                />
                <span className="interval-unit">minutes</span>
              </div>
            </label>

            <div className="settings-info">
              <p>
                Auto-save will automatically save your work at the specified interval.
                Versions are stored locally and can be restored from the version history.
              </p>
            </div>

            <div className="settings-actions">
              <button
                className="btn-primary"
                onClick={() => setShowSettings(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Simple Auto-Save Toggle Component
// ============================================================================

export interface SimpleAutoSaveToggleProps {
  projectId: string;
  author?: string;
  intervalMinutes?: number;
}

export const SimpleAutoSaveToggle: React.FC<SimpleAutoSaveToggleProps> = ({
  projectId,
  author = 'User',
  intervalMinutes = 5,
}) => {
  const { isEnabled, toggle, lastSavedAt, lastSavedText, error } =
    useGridVersionAutoSave(projectId, author, intervalMinutes, false);

  return (
    <div className="simple-auto-save-toggle">
      <label>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={toggle}
        />
        <span>Auto-Save ({intervalMinutes}m)</span>
      </label>
      {error && <span role="alert">{error}</span>}
      {lastSavedAt && (
        <span className="last-saved">{lastSavedText}</span>
      )}
    </div>
  );
};

export default AutoSaveIndicator;
