/**
 * Lighting Rig Preview Component
 * 
 * Displays a preview of a lighting rig with metadata and visual representation.
 */

import React from 'react';
import { LightingRig } from '../../services/lightingRigService';
import './lightingRigPreview.css';

export interface LightingRigPreviewProps {
  rig: LightingRig;
  onSelect?: (rig: LightingRig) => void;
  selected?: boolean;
  showMetadata?: boolean;
}

export const LightingRigPreview: React.FC<LightingRigPreviewProps> = ({
  rig,
  onSelect,
  selected = false,
  showMetadata = true
}) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(rig);
    }
  };

  const getMoodColor = (mood: LightingRig['mood']): string => {
    const colors: Record<LightingRig['mood'], string> = {
      dramatic: '#8B0000',
      soft: '#FFB6C1',
      natural: '#90EE90',
      studio: '#4169E1',
      cinematic: '#FFD700',
      horror: '#2F4F4F',
      romantic: '#FF69B4'
    };
    return colors[mood];
  };

  return (
    <div
      className={`lighting-rig-preview ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${rig.name} lighting rig`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="lighting-rig-preview__thumbnail">
        <img
          src={rig.thumbnailUrl}
          alt={rig.name}
          className="lighting-rig-preview__image"
          onError={(e) => {
            // Fallback to placeholder on error
            (e.target as HTMLImageElement).src = '/assets/lighting-rigs/placeholder.jpg';
          }}
        />
        <div
          className="lighting-rig-preview__mood-badge"
          style={{ backgroundColor: getMoodColor(rig.mood) }}
        >
          {rig.mood}
        </div>
      </div>

      <div className="lighting-rig-preview__content">
        <h3 className="lighting-rig-preview__name">{rig.name}</h3>
        <p className="lighting-rig-preview__description">{rig.description}</p>

        {showMetadata && (
          <div className="lighting-rig-preview__metadata">
            <div className="lighting-rig-preview__metadata-item">
              <span className="lighting-rig-preview__metadata-label">Lights:</span>
              <span className="lighting-rig-preview__metadata-value">
                {rig.metadata.lightCount}
              </span>
            </div>
            <div className="lighting-rig-preview__metadata-item">
              <span className="lighting-rig-preview__metadata-label">Intensity:</span>
              <span className="lighting-rig-preview__metadata-value">
                {rig.metadata.intensityRange.min}-{rig.metadata.intensityRange.max}%
              </span>
            </div>
            <div className="lighting-rig-preview__metadata-item">
              <span className="lighting-rig-preview__metadata-label">Color Temp:</span>
              <span className="lighting-rig-preview__metadata-value">
                {rig.metadata.colorTemperature}K
              </span>
            </div>
          </div>
        )}

        <div className="lighting-rig-preview__tags">
          {rig.metadata.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="lighting-rig-preview__tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
