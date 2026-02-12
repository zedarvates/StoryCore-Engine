/**
 * Camera Movement Selector Component
 * UI component for selecting and configuring camera movements
 */

import React, { useMemo } from 'react';
import { 
  CameraMovement, 
  CAMERA_MOVEMENT_PRESETS, 
  getCameraMovementConfig 
} from '@/types/cinematicTypes';
import './CameraMovementSelector.css';

interface CameraMovementSelectorProps {
  value?: CameraMovement;
  onChange: (movement: CameraMovement) => void;
  disabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

const CameraIcons: Record<CameraMovement, React.ReactNode> = {
  steadicam: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
    </svg>
  ),
  tracking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <line x1="6" y1="12" x2="6" y2="12"/>
    </svg>
  ),
  handheld: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3h12"/>
    </svg>
  ),
  drone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>
      <path d="M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v5"/>
    </svg>
  ),
  crane: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="2" x2="12" y2="8"/>
      <line x1="4" y1="22" x2="20" y2="22"/>
      <path d="M12 8l-4 14"/>
    </svg>
  ),
  dolly: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="4" cy="20" r="2"/>
      <circle cx="20" cy="20" r="2"/>
      <line x1="4" y1="20" x2="20" y2="20"/>
    </svg>
  ),
  pan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14"/>
      <path d="M12 5l7 7-7 7"/>
    </svg>
  ),
  tilt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14"/>
      <path d="M5 12l7-7 7 7"/>
    </svg>
  ),
  zoom: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  static: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  steady_cam: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  walking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 16v-2.5"/>
      <path d="M6 10l-4 6"/>
      <path d="M10 10l6-4"/>
      <path d="M14 6l3 7"/>
    </svg>
  ),
  running: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 16v-2.5"/>
      <path d="M6 10l-4 6"/>
      <path d="M10 10l6-4"/>
      <path d="M14 6l3 7"/>
    </svg>
  ),
  vehicle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="5.5" cy="17.5" r="3.5"/>
      <circle cx="18.5" cy="17.5" r="3.5"/>
      <path d="M15 6H5l-3 8h20l-3-8z"/>
    </svg>
  ),
  pov: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  reverse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
      <path d="M19 4v5h-12"/>
    </svg>
  ),
  orbital: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <ellipse cx="12" cy="12" rx="9" ry="5"/>
    </svg>
  ),
  arc: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 20a6 6 0 0 1 6-6 6 6 0 0 1 6 6"/>
    </svg>
  ),
  spline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18"/>
      <path d="M7 12c2-3 5-4 8-2"/>
    </svg>
  ),
};

export function CameraMovementSelector({
  value,
  onChange,
  disabled = false,
  showDetails = true,
  className = '',
}: CameraMovementSelectorProps) {
  const selectedConfig = useMemo(
    () => (value ? getCameraMovementConfig(value) : null),
    [value]
  );

  const movements = Object.entries(CAMERA_MOVEMENT_PRESETS);

  const groupedMovements = useMemo(() => {
    const groups: Record<string, [string, typeof movements[0][1]][]> = {
      'Stabilite': movements.filter(([key]) => 
        ['steadicam', 'steady_cam', 'static', 'dolly'].includes(key)
      ),
      'Mouvement': movements.filter(([key]) => 
        ['tracking', 'walking', 'running', 'vehicle'].includes(key)
      ),
      'Rotation': movements.filter(([key]) => 
        ['pan', 'tilt', 'orbital', 'arc'].includes(key)
      ),
      'Style': movements.filter(([key]) => 
        ['handheld', 'pov', 'reverse'].includes(key)
      ),
      'Echelle': movements.filter(([key]) => 
        ['drone', 'crane', 'zoom', 'spline'].includes(key)
      ),
    };
    return groups;
  }, []);

  return (
    <div className={`camera-movement-selector ${className}`}>
      {value && showDetails && selectedConfig && (
        <div className="movement-details">
          <div className="movement-details-header">
            <div className={`movement-icon selected ${selectedConfig.complexity}`}>
              {CameraIcons[value]}
            </div>
            <div className="movement-info">
              <h4>{selectedConfig.name}</h4>
              <p>{selectedConfig.description}</p>
            </div>
          </div>
          <div className="movement-meta">
            <span className={`speed ${selectedConfig.speed}`}>
              {selectedConfig.speed === 'slow' ? 'Lent' : 
               selectedConfig.speed === 'medium' ? 'Moyen' : 'Rapide'}
            </span>
            <span className="smoothness">
              Fluidite: {selectedConfig.smoothness}/10
            </span>
          </div>
        </div>
      )}

      <div className="movement-grid">
        {Object.entries(groupedMovements).map(([category, items]) => (
          <div key={category} className="movement-category">
            <h5 className="category-title">{category}</h5>
            <div className="category-items">
              {items.map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={`movement-button ${value === key ? 'selected' : ''} ${config.complexity}`}
                  onClick={() => onChange(key as CameraMovement)}
                  disabled={disabled}
                  title={`${config.name}: ${config.description}`}
                >
                  <div className="movement-icon">
                    {CameraIcons[key as CameraMovement]}
                  </div>
                  <span className="movement-name">{config.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CameraMovementSelector;

