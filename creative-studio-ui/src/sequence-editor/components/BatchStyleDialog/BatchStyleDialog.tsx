/**
 * Batch Style Dialog Component
 * 
 * Dialog for applying visual styles to multiple shots simultaneously
 * Requirements: 11.6
 */

import React, { useState, useCallback } from 'react';
import { useBatchStyleApplication } from '../../hooks/useBatchStyleApplication';
import type { Asset } from '../../types';
import './batchStyleDialog.css';

// ============================================================================
// Props
// ============================================================================

interface BatchStyleDialogProps {
  style: Asset;
  onClose: () => void;
  onApply: (count: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export const BatchStyleDialog: React.FC<BatchStyleDialogProps> = ({
  style,
  onClose,
  onApply,
}) => {
  const {
    applyStyleToSelectedShots,
    checkStyleConsistency,
    selectedCount,
  } = useBatchStyleApplication();

  const [intensity, setIntensity] = useState(100);
  const [isApplying, setIsApplying] = useState(false);

  const styleConsistency = checkStyleConsistency();

  // Handle intensity change
  const handleIntensityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIntensity(parseInt(e.target.value, 10));
    },
    []
  );

  // Handle apply
  const handleApply = useCallback(async () => {
    setIsApplying(true);

    try {
      const count = applyStyleToSelectedShots(style, intensity);
      if (count) {
        onApply(count);
      }
    } catch (error) {
      console.error('Failed to apply style:', error);
      alert('Failed to apply style. Please try again.');
    } finally {
      setIsApplying(false);
    }
  }, [applyStyleToSelectedShots, style, intensity, onApply]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div className="batch-style-dialog-backdrop" onClick={handleBackdropClick}>
      <div className="batch-style-dialog">
        {/* Header */}
        <div className="dialog-header">
          <h2 className="dialog-title">Apply Style to Multiple Shots</h2>
          <button
            className="close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="dialog-content">
          {/* Style Info */}
          <div className="style-info">
            <div className="style-thumbnail">
              <img src={style.thumbnailUrl} alt={style.name} />
            </div>
            <div className="style-details">
              <h3 className="style-name">{style.name}</h3>
              <p className="style-description">{style.metadata.description}</p>
            </div>
          </div>

          {/* Selection Info */}
          <div className="selection-info">
            <div className="info-item">
              <span className="info-label">Selected Shots:</span>
              <span className="info-value">{selectedCount}</span>
            </div>
            {styleConsistency.hasStyle && (
              <div className="info-item">
                <span className="info-label">Current Style:</span>
                <span
                  className={`info-value ${
                    styleConsistency.consistent ? 'consistent' : 'inconsistent'
                  }`}
                >
                  {styleConsistency.consistent ? 'Consistent' : 'Mixed'}
                </span>
              </div>
            )}
          </div>

          {/* Warning if inconsistent */}
          {styleConsistency.hasStyle && !styleConsistency.consistent && (
            <div className="warning-message">
              ⚠️ Selected shots have different styles. Applying this style will
              replace all existing styles.
            </div>
          )}

          {/* Intensity Control */}
          <div className="intensity-control">
            <label htmlFor="batch-intensity" className="control-label">
              Style Intensity
              <span className="control-value">{intensity}%</span>
            </label>
            <input
              id="batch-intensity"
              type="range"
              min="0"
              max="100"
              value={intensity}
              onChange={handleIntensityChange}
              className="intensity-slider"
              disabled={isApplying}
            />
            <div className="slider-markers">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Preview Note */}
          <div className="preview-note">
            <span className="note-icon">ℹ️</span>
            <span className="note-text">
              Style will be applied to all {selectedCount} selected shot
              {selectedCount !== 1 ? 's' : ''} with {intensity}% intensity.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="dialog-actions">
          <button
            className="cancel-btn"
            onClick={handleCancel}
            disabled={isApplying}
          >
            Cancel
          </button>
          <button
            className="apply-btn"
            onClick={handleApply}
            disabled={isApplying || selectedCount === 0}
          >
            {isApplying ? 'Applying...' : `Apply to ${selectedCount} Shot${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchStyleDialog;
