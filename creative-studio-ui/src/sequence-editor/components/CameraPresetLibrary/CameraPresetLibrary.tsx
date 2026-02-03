/**
 * Camera Preset Library Component
 * 
 * Displays camera presets organized by movement type with filtering.
 * Requirements: 12.1, 12.4
 */

import React, { useState, useMemo } from 'react';
import {
  getAllCameraPresets,
  getCameraPresetsByType,
  type CameraMovementType,
  type CameraPreset,
} from '../../services/cameraPresetService';
import { CameraPresetPreview } from '../CameraPresetPreview';
import './cameraPresetLibrary.css';

// ============================================================================
// Types
// ============================================================================

interface CameraPresetLibraryProps {
  onPresetSelect?: (preset: CameraPreset) => void;
  onPresetApply?: (preset: CameraPreset) => void;
  selectedType?: CameraMovementType | 'all';
}

// ============================================================================
// Constants
// ============================================================================

const MOVEMENT_TYPES: Array<{ id: CameraMovementType | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All', icon: '📷' },
  { id: 'static', label: 'Static', icon: '⏸' },
  { id: 'pan', label: 'Pan', icon: '↔️' },
  { id: 'tilt', label: 'Tilt', icon: '↕️' },
  { id: 'dolly', label: 'Dolly', icon: '⬅️' },
  { id: 'zoom', label: 'Zoom', icon: '🔍' },
  { id: 'crane', label: 'Crane', icon: '🏗️' },
  { id: 'tracking', label: 'Tracking', icon: '🎯' },
];

// ============================================================================
// Component
// ============================================================================

export const CameraPresetLibrary: React.FC<CameraPresetLibraryProps> = ({
  onPresetSelect,
  onPresetApply,
  selectedType = 'all',
}) => {
  const [activeType, setActiveType] = useState<CameraMovementType | 'all'>(selectedType);
  const [selectedPreset, setSelectedPreset] = useState<CameraPreset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get all presets
  const allPresets = useMemo(() => getAllCameraPresets(), []);

  // Filter presets by type and search query
  const filteredPresets = useMemo(() => {
    let presets = activeType === 'all' 
      ? allPresets 
      : getCameraPresetsByType(activeType);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      presets = presets.filter(
        (preset) =>
          preset.name.toLowerCase().includes(query) ||
          preset.metadata.description.toLowerCase().includes(query) ||
          preset.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          preset.metadata.cameraMetadata.recommendedUseCases?.some((useCase) =>
            useCase.toLowerCase().includes(query)
          )
      );
    }

    return presets;
  }, [activeType, allPresets, searchQuery]);

  // Handle type selection
  const handleTypeSelect = (type: CameraMovementType | 'all') => {
    setActiveType(type);
    setSelectedPreset(null);
  };

  // Handle preset click
  const handlePresetClick = (preset: CameraPreset) => {
    setSelectedPreset(preset);
    if (onPresetSelect) {
      onPresetSelect(preset);
    }
  };

  // Handle preset apply
  const handlePresetApply = (preset: CameraPreset) => {
    if (onPresetApply) {
      onPresetApply(preset);
    }
  };

  // Handle search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="camera-preset-library">
      {/* Type Filter Tabs */}
      <div className="camera-preset-type-tabs">
        {MOVEMENT_TYPES.map((type) => {
          const count = type.id === 'all' 
            ? allPresets.length 
            : getCameraPresetsByType(type.id as CameraMovementType).length;

          return (
            <button
              key={type.id}
              className={`camera-preset-type-tab ${activeType === type.id ? 'active' : ''}`}
              onClick={() => handleTypeSelect(type.id)}
              title={`${type.label} (${count})`}
            >
              <span className="camera-preset-type-icon">{type.icon}</span>
              <span className="camera-preset-type-label">{type.label}</span>
              <span className="camera-preset-type-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="camera-preset-search">
        <input
          type="text"
          placeholder="Search camera presets..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="camera-preset-search-input"
          aria-label="Search camera presets"
        />
        {searchQuery && (
          <button
            className="camera-preset-search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Preset Grid */}
      <div className="camera-preset-grid">
        {filteredPresets.length > 0 ? (
          filteredPresets.map((preset) => (
            <div
              key={preset.id}
              className={`camera-preset-card ${selectedPreset?.id === preset.id ? 'selected' : ''}`}
              onClick={() => handlePresetClick(preset)}
            >
              {/* Thumbnail */}
              <div className="camera-preset-card-thumbnail">
                {preset.thumbnailUrl ? (
                  <img
                    src={preset.thumbnailUrl}
                    alt={preset.name}
                    className="camera-preset-card-image"
                  />
                ) : (
                  <div className="camera-preset-card-placeholder">
                    <span className="camera-preset-card-placeholder-icon">📷</span>
                  </div>
                )}
                {preset.previewUrl && (
                  <div className="camera-preset-card-play-badge">▶</div>
                )}
              </div>

              {/* Info */}
              <div className="camera-preset-card-info">
                <h4 className="camera-preset-card-title">{preset.name}</h4>
                <p className="camera-preset-card-description">
                  {preset.metadata.description}
                </p>
                <div className="camera-preset-card-meta">
                  <span className="camera-preset-card-meta-item">
                    {preset.metadata.cameraMetadata.duration}s
                  </span>
                  <span className="camera-preset-card-meta-item">
                    {preset.metadata.cameraMetadata.focalLength}mm
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="camera-preset-empty">
            <span className="camera-preset-empty-icon">🔍</span>
            <p className="camera-preset-empty-text">
              {searchQuery
                ? `No presets found for "${searchQuery}"`
                : 'No presets available'}
            </p>
          </div>
        )}
      </div>

      {/* Preview Panel */}
      {selectedPreset && (
        <div className="camera-preset-preview-panel">
          <CameraPresetPreview
            preset={selectedPreset}
            onApply={handlePresetApply}
            onClose={() => setSelectedPreset(null)}
          />
        </div>
      )}
    </div>
  );
};

export default CameraPresetLibrary;
