/**
 * Camera Preset Preview Component
 * 
 * Displays camera preset with preview animation and metadata.
 * Requirements: 12.2, 12.5
 */

import React, { useState, useRef, useEffect } from 'react';
import type { CameraPreset } from '../../services/cameraPresetService';
import './cameraPresetPreview.css';

// ============================================================================
// Types
// ============================================================================

interface CameraPresetPreviewProps {
  preset: CameraPreset;
  onApply?: (preset: CameraPreset) => void;
  onClose?: () => void;
  showApplyButton?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const CameraPresetPreview: React.FC<CameraPresetPreviewProps> = ({
  preset,
  onApply,
  onClose,
  showApplyButton = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { cameraMetadata } = preset.metadata;

  // Auto-play preview when component mounts
  useEffect(() => {
    if (videoRef.current && preset.previewUrl) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked by browser
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [preset.previewUrl]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply(preset);
    }
  };

  return (
    <div className="camera-preset-preview">
      {/* Header */}
      <div className="camera-preset-preview-header">
        <h3 className="camera-preset-preview-title">{preset.name}</h3>
        {onClose && (
          <button
            className="camera-preset-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            ✕
          </button>
        )}
      </div>

      {/* Preview Animation */}
      <div className="camera-preset-preview-animation">
        {preset.previewUrl ? (
          <div className="camera-preset-video-container">
            <video
              ref={videoRef}
              src={preset.previewUrl}
              loop
              muted
              className="camera-preset-video"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <button
              className="camera-preset-play-button"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        ) : (
          <div className="camera-preset-placeholder">
            <span className="camera-preset-placeholder-icon">📷</span>
            <span className="camera-preset-placeholder-text">
              {cameraMetadata.movementType.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="camera-preset-preview-description">
        <p>{preset.metadata.description}</p>
      </div>

      {/* Metadata */}
      <div className="camera-preset-preview-metadata">
        <div className="camera-preset-metadata-grid">
          <div className="camera-preset-metadata-item">
            <span className="camera-preset-metadata-label">Movement Type</span>
            <span className="camera-preset-metadata-value">
              {cameraMetadata.movementType}
            </span>
          </div>
          <div className="camera-preset-metadata-item">
            <span className="camera-preset-metadata-label">Duration</span>
            <span className="camera-preset-metadata-value">
              {cameraMetadata.duration}s
            </span>
          </div>
          <div className="camera-preset-metadata-item">
            <span className="camera-preset-metadata-label">Focal Length</span>
            <span className="camera-preset-metadata-value">
              {cameraMetadata.focalLength}mm
            </span>
          </div>
          <div className="camera-preset-metadata-item">
            <span className="camera-preset-metadata-label">Trajectory</span>
            <span className="camera-preset-metadata-value">
              {cameraMetadata.trajectory}
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Use Cases */}
      {cameraMetadata.recommendedUseCases && cameraMetadata.recommendedUseCases.length > 0 && (
        <div className="camera-preset-preview-use-cases">
          <h4 className="camera-preset-use-cases-title">Recommended Use Cases</h4>
          <ul className="camera-preset-use-cases-list">
            {cameraMetadata.recommendedUseCases.map((useCase, index) => (
              <li key={index} className="camera-preset-use-case-item">
                {useCase}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {preset.tags && preset.tags.length > 0 && (
        <div className="camera-preset-preview-tags">
          {preset.tags.map((tag, index) => (
            <span key={index} className="camera-preset-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      {showApplyButton && (
        <div className="camera-preset-preview-actions">
          <button
            className="camera-preset-apply-button"
            onClick={handleApply}
          >
            Apply Preset
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraPresetPreview;
