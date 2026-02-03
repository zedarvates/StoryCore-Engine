/**
 * Preset Preview Component
 * 
 * Displays narrative preset preview and description.
 * Requirements: 10.4
 */

import React from 'react';
import type { Asset } from '../../types';
import './presetPreview.css';

// ============================================================================
// Types
// ============================================================================

interface PresetPreviewProps {
  asset: Asset;
  selectedShotCount: number;
  onClose: () => void;
  onApply: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const PresetPreview: React.FC<PresetPreviewProps> = ({
  asset,
  selectedShotCount,
  onClose,
  onApply,
}) => {
  return (
    <div className="preset-preview-overlay" onClick={onClose}>
      <div className="preset-preview-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="preset-preview-header">
          <h2>{asset.name}</h2>
          <button
            className="preset-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        {/* Preview Image */}
        <div className="preset-preview-image">
          {asset.previewUrl ? (
            <img src={asset.previewUrl} alt={asset.name} />
          ) : (
            <div className="preset-preview-placeholder">
              <span className="preset-icon">🎨</span>
              <span>No preview available</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="preset-preview-description">
          <h3>Description</h3>
          <p>{asset.metadata.description}</p>
        </div>

        {/* Application Info */}
        <div className="preset-preview-info">
          <div className="info-box">
            <span className="info-icon">📊</span>
            <div className="info-content">
              <span className="info-label">Will apply to:</span>
              <span className="info-value">
                {selectedShotCount} {selectedShotCount === 1 ? 'shot' : 'shots'}
              </span>
            </div>
          </div>
          {selectedShotCount === 0 && (
            <div className="info-warning">
              <span className="warning-icon">⚠️</span>
              <span>Please select shots in the timeline to apply this preset</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="preset-preview-tags">
            {asset.tags.map((tag) => (
              <span key={tag} className="preset-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="preset-preview-actions">
          <button className="preset-preview-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="preset-preview-apply"
            onClick={onApply}
            disabled={selectedShotCount === 0}
          >
            Apply Preset
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresetPreview;
