/**
 * Result Card Component
 * Displays a single result with preview and actions
 */

import React, { useState } from 'react';
import { GeneratedResult, GeneratedAsset } from '../services/resultService';

interface ResultCardProps {
  result: GeneratedResult;
  getPreviewUrl: (asset: GeneratedAsset) => string;
  onDownloadAsset?: (asset: GeneratedAsset) => void;
  onDownloadAll?: () => void;
  onDelete?: () => void;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  getPreviewUrl,
  onDownloadAsset,
  onDownloadAll,
  onDelete,
  showDetails = false,
  compact = false,
  className = '',
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<GeneratedAsset | null>(null);

  const getTypeIcon = () => {
    switch (result.type) {
      case 'grid':
        return '🎨';
      case 'promotion':
        return '⬆️';
      case 'refine':
        return '✨';
      case 'qa':
        return '🔍';
      default:
        return '📄';
    }
  };

  const getStatusColor = () => {
    return result.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  const getAssetIcon = (asset: GeneratedAsset) => {
    switch (asset.type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'data':
        return '📄';
      default:
        return '📄';
    }
  };

  const formatFileSize = (size?: number): string => {
    if (!size) return 'Unknown';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePreview = (asset: GeneratedAsset) => {
    setPreviewAsset(asset);
    setShowPreview(true);
  };

  if (compact) {
    return (
      <div className={`result-card-compact ${className}`}>
        <div className="result-header">
          <span className="result-type">{getTypeIcon()} {result.type}</span>
          <span className={`result-status ${getStatusColor()}`}>
            {result.status === 'success' ? '✅ Success' : '❌ Failed'}
          </span>
        </div>
        <div className="result-assets">
          {result.assets.length} asset(s)
        </div>
      </div>
    );
  }

  return (
    <div className={`result-card ${className}`}>
      <div className="result-header">
        <h3 className="result-title">
          {getTypeIcon()} {result.type} Result
        </h3>
        <span className={`result-status ${getStatusColor()}`}>
          {result.status === 'success' ? '✅ Success' : '❌ Failed'}
        </span>
      </div>

      {result.assets.length > 0 && (
        <div className="result-preview" onClick={() => handlePreview(result.assets[0])}>
          <img
            src={getPreviewUrl(result.assets[0])}
            alt="Preview"
            className="preview-image"
          />
        </div>
      )}

      <div className="result-assets">
        <h4>Assets ({result.assets.length})</h4>
        <ul className="asset-list">
          {result.assets.map((asset) => (
            <li key={asset.id} className="asset-item">
              <div className="asset-info">
                <span className="asset-icon">{getAssetIcon(asset)}</span>
                <span className="asset-name">{asset.name}</span>
                <span className="asset-format">{asset.format}</span>
                <span className="asset-size">{formatFileSize(asset.size)}</span>
                {asset.dimensions && (
                  <span className="asset-dimensions">
                    {asset.dimensions.width}x{asset.dimensions.height}
                  </span>
                )}
                {asset.duration && (
                  <span className="asset-duration">{asset.duration}s</span>
                )}
              </div>
              <button
                className="download-button"
                onClick={() => onDownloadAsset?.(asset)}
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      </div>

      {showDetails && (
        <div className="result-details">
          <div className="detail-row">
            <span className="detail-label">Task ID:</span>
            <span className="detail-value">{result.taskId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Shot ID:</span>
            <span className="detail-value">{result.shotId}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Generated:</span>
            <span className="detail-value">{result.generatedAt.toLocaleString()}</span>
          </div>
          {result.processingTime && (
            <div className="detail-row">
              <span className="detail-label">Processing Time:</span>
              <span className="detail-value">{result.processingTime}s</span>
            </div>
          )}
          {result.qualityScore && (
            <div className="detail-row">
              <span className="detail-label">Quality Score:</span>
              <span className="detail-value">{result.qualityScore}/100</span>
            </div>
          )}
          {result.metrics && (
            <div className="detail-row">
              <span className="detail-label">Metrics:</span>
              <span className="detail-value">
                {Object.entries(result.metrics).map(([key, value]) => (
                  <div key={key}>{key}: {value}</div>
                ))}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="result-actions">
        <button className="action-button download-all" onClick={onDownloadAll}>
          Download All
        </button>
        <button className="action-button delete" onClick={onDelete}>
          Delete
        </button>
      </div>

      {showPreview && previewAsset && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <div className="preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setShowPreview(false)}>
              ×
            </button>
            {previewAsset.type === 'image' && (
              <img
                src={getPreviewUrl(previewAsset)}
                alt="Preview"
                className="preview-image-large"
              />
            )}
            {previewAsset.type === 'video' && (
              <video controls className="preview-video">
                <source src={previewAsset.url} type="video/mp4" />
              </video>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Add CSS styles
const styles = `
.result-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background: white;
  position: relative;
}

.result-card-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.result-status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.result-preview {
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 4px;
  margin-bottom: 12px;
  cursor: pointer;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-assets {
  margin-bottom: 12px;
}

.asset-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.asset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.asset-item:last-child {
  border-bottom: none;
}

.asset-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.asset-icon {
  font-size: 16px;
}

.asset-name {
  font-weight: bold;
}

.asset-format, .asset-size, .asset-dimensions, .asset-duration {
  font-size: 12px;
  color: #718096;
}

.download-button {
  padding: 4px 8px;
  background: #4299e1;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.result-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 12px;
}

.detail-row {
  display: flex;
  margin-bottom: 4px;
}

.detail-label {
  font-weight: bold;
  width: 120px;
  color: #718096;
}

.detail-value {
  flex: 1;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-button {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.action-button.download-all {
  background: #38a169;
  color: white;
}

.action-button.delete {
  background: #e53e3e;
  color: white;
}

.preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.preview-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.preview-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: white;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
}

.preview-image-large {
  max-width: 100%;
  max-height: 80vh;
}

.preview-video {
  max-width: 100%;
  max-height: 80vh;
}
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);