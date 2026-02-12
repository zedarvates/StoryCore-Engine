/**
 * Camera Preset Controls Component
 * 
 * Allows applying and modifying camera presets for shots.
 * Requirements: 12.3, 12.6
 */

import React, { useState, useCallback } from 'react';
import {
  getAllCameraPresets,
  getCameraPresetsByType,
  applyCameraPresetToShot,
  type CameraPreset,
  type CameraMovementType,
  type CameraPresetParameters,
} from '../../services/cameraPresetService';
import { CameraPresetPreview } from '../CameraPresetPreview';
import type { Shot } from '../../types';
import './cameraPresetControls.css';

// ============================================================================
// Types
// ============================================================================

interface CameraPresetControlsProps {
  shot: Shot;
  onApplyPreset?: (parameters: CameraPresetParameters) => void;
}

// ============================================================================
// Component
// ============================================================================

export const CameraPresetControls: React.FC<CameraPresetControlsProps> = ({
  shot,
  onApplyPreset,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<CameraPreset | null>(null);
  const [showPresetLibrary, setShowPresetLibrary] = useState(false);
  const [appliedParameters, setAppliedParameters] = useState<CameraPresetParameters | null>(null);
  const [customParameters, setCustomParameters] = useState<Partial<CameraPresetParameters>>({});

  // Get all presets
  const allPresets = getAllCameraPresets();

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: CameraPreset) => {
    setSelectedPreset(preset);
  }, []);

  // Handle preset application
  const handleApplyPreset = useCallback((preset: CameraPreset) => {
    const parameters = applyCameraPresetToShot(preset, shot.id);
    setAppliedParameters(parameters);
    setCustomParameters(parameters);
    setShowPresetLibrary(false);
    
    if (onApplyPreset) {
      onApplyPreset(parameters);
    }
  }, [shot.id, onApplyPreset]);

  // Handle parameter modification
  const handleParameterChange = useCallback((
    param: keyof CameraPresetParameters,
    value: unknown
  ) => {
    setCustomParameters((prev) => ({
      ...prev,
      [param]: value,
    }));

    // Apply modified parameters
    if (onApplyPreset && appliedParameters) {
      onApplyPreset({
        ...appliedParameters,
        ...customParameters,
        [param]: value,
      });
    }
  }, [appliedParameters, customParameters, onApplyPreset]);

  // Handle clear preset
  const handleClearPreset = useCallback(() => {
    setAppliedParameters(null);
    setCustomParameters({});
    setSelectedPreset(null);
  }, []);

  return (
    <div className="camera-preset-controls">
      <div className="camera-preset-controls-header">
        <h4 className="camera-preset-controls-title">Camera Preset</h4>
        {appliedParameters && (
          <button
            className="camera-preset-clear-btn"
            onClick={handleClearPreset}
            title="Clear camera preset"
          >
            Clear
          </button>
        )}
      </div>

      {/* Applied Preset Info */}
      {appliedParameters ? (
        <div className="camera-preset-applied">
          <div className="camera-preset-applied-info">
            <span className="camera-preset-applied-icon">📷</span>
            <div className="camera-preset-applied-details">
              <span className="camera-preset-applied-type">
                {appliedParameters.movementType.toUpperCase()}
              </span>
              <span className="camera-preset-applied-meta">
                {appliedParameters.duration}s • {appliedParameters.focalLength}mm
              </span>
            </div>
          </div>

          {/* Parameter Modification Controls */}
          <div className="camera-preset-parameters">
            {/* Duration */}
            <div className="camera-preset-param">
              <label htmlFor="camera-duration">
                Duration (s)
                <span className="param-hint" title="Shot duration in seconds">ⓘ</span>
              </label>
              <input
                id="camera-duration"
                type="number"
                value={customParameters.duration ?? appliedParameters.duration}
                onChange={(e) => handleParameterChange('duration', parseFloat(e.target.value))}
                min={0.5}
                max={60}
                step={0.5}
              />
            </div>

            {/* Focal Length */}
            <div className="camera-preset-param">
              <label htmlFor="camera-focal-length">
                Focal Length (mm)
                <span className="param-hint" title="Camera focal length">ⓘ</span>
              </label>
              <input
                id="camera-focal-length"
                type="number"
                value={customParameters.focalLength ?? appliedParameters.focalLength}
                onChange={(e) => handleParameterChange('focalLength', parseInt(e.target.value))}
                min={10}
                max={200}
                step={1}
              />
            </div>

            {/* Speed (if applicable) */}
            {appliedParameters.speed !== undefined && (
              <div className="camera-preset-param">
                <label htmlFor="camera-speed">
                  Speed
                  <span className="param-hint" title="Movement speed (0-100)">ⓘ</span>
                </label>
                <input
                  id="camera-speed"
                  type="range"
                  value={customParameters.speed ?? appliedParameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseInt(e.target.value))}
                  min={0}
                  max={100}
                  step={1}
                />
                <span className="camera-preset-param-value">
                  {customParameters.speed ?? appliedParameters.speed}
                </span>
              </div>
            )}

            {/* Easing (if applicable) */}
            {appliedParameters.easing && (
              <div className="camera-preset-param">
                <label htmlFor="camera-easing">
                  Easing
                  <span className="param-hint" title="Animation easing function">ⓘ</span>
                </label>
                <select
                  id="camera-easing"
                  value={customParameters.easing ?? appliedParameters.easing}
                  onChange={(e) => handleParameterChange('easing', e.target.value)}
                >
                  <option value="linear">Linear</option>
                  <option value="ease-in">Ease In</option>
                  <option value="ease-out">Ease Out</option>
                  <option value="ease-in-out">Ease In-Out</option>
                </select>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Preset Selection */
        <div className="camera-preset-selection">
          <button
            className="camera-preset-select-btn"
            onClick={() => setShowPresetLibrary(!showPresetLibrary)}
          >
            <span className="camera-preset-select-icon">📷</span>
            <span>Select Camera Preset</span>
          </button>

          {/* Quick Preset Buttons */}
          <div className="camera-preset-quick-buttons">
            {['static', 'pan', 'dolly', 'zoom'].map((type) => {
              const presets = getCameraPresetsByType(type as CameraMovementType);
              const firstPreset = presets[0];
              
              if (!firstPreset) return null;

              return (
                <button
                  key={type}
                  className="camera-preset-quick-btn"
                  onClick={() => handleApplyPreset(firstPreset)}
                  title={`Apply ${type} preset`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset Library Modal */}
      {showPresetLibrary && (
        <div className="camera-preset-library-modal">
          <div className="camera-preset-library-overlay" onClick={() => setShowPresetLibrary(false)} />
          <div className="camera-preset-library-content">
            <div className="camera-preset-library-header">
              <h3>Camera Presets</h3>
              <button
                className="camera-preset-library-close"
                onClick={() => setShowPresetLibrary(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="camera-preset-library-grid">
              {allPresets.map((preset) => (
                <div
                  key={preset.id}
                  className={`camera-preset-library-item ${selectedPreset?.id === preset.id ? 'selected' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <div className="camera-preset-library-thumbnail">
                    {preset.thumbnailUrl ? (
                      <img src={preset.thumbnailUrl} alt={preset.name} />
                    ) : (
                      <div className="camera-preset-library-placeholder">📷</div>
                    )}
                  </div>
                  <div className="camera-preset-library-info">
                    <h5>{preset.name}</h5>
                    <p>{preset.metadata.cameraMetadata.movementType}</p>
                  </div>
                  <button
                    className="camera-preset-library-apply"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyPreset(preset);
                    }}
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>

            {/* Preview Panel */}
            {selectedPreset && (
              <div className="camera-preset-library-preview">
                <CameraPresetPreview
                  preset={selectedPreset}
                  onApply={handleApplyPreset}
                  showApplyButton={true}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraPresetControls;

