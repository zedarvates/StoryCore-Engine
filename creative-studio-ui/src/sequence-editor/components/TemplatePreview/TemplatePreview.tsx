/**
 * Template Preview Component
 * 
 * Displays template metadata, preview, and description.
 * Requirements: 10.2, 10.5
 */

import React from 'react';
import type { Asset, TemplateMetadata } from '../../types';
import './templatePreview.css';

// ============================================================================
// Types
// ============================================================================

interface TemplatePreviewProps {
  asset: Asset;
  onClose: () => void;
  onApply: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  asset,
  onClose,
  onApply,
}) => {
  const metadata = asset.metadata.templateMetadata;

  if (!metadata) {
    return null;
  }

  return (
    <div className="template-preview-overlay" onClick={onClose}>
      <div className="template-preview-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="template-preview-header">
          <h2>{asset.name}</h2>
          <button
            className="template-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            ✕
          </button>
        </div>

        {/* Preview Image */}
        <div className="template-preview-image">
          {asset.previewUrl ? (
            <img src={asset.previewUrl} alt={asset.name} />
          ) : (
            <div className="template-preview-placeholder">
              <span className="template-icon">📋</span>
              <span>No preview available</span>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="template-preview-metadata">
          <div className="metadata-row">
            <span className="metadata-label">Shots:</span>
            <span className="metadata-value">{metadata.shotCount}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">Duration:</span>
            <span className="metadata-value">
              {(metadata.totalDuration / 24).toFixed(1)}s
            </span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">Genre:</span>
            <span className="metadata-value">{metadata.genre}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">Complexity:</span>
            <span className={`metadata-value complexity-${metadata.complexity}`}>
              {metadata.complexity}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="template-preview-description">
          <h3>Description</h3>
          <p>{asset.metadata.description}</p>
        </div>

        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="template-preview-tags">
            {asset.tags.map((tag) => (
              <span key={tag} className="template-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="template-preview-actions">
          <button className="template-preview-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="template-preview-apply" onClick={onApply}>
            Apply Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
