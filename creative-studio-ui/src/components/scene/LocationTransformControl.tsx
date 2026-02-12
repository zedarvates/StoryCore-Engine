/**
 * LocationTransformControl Component
 * 
 * Position, rotation, and scale controls for scene location placement.
 * 
 * File: creative-studio-ui/src/components/scene/LocationTransformControl.tsx
 */

import React, { useState, useCallback } from 'react';
import { Move, RotateCw, Maximize2, Trash2, Copy } from 'lucide-react';
import type { Transform3D } from '@/types/location';
import './LocationTransformControl.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the LocationTransformControl component
 */
export interface LocationTransformControlProps {
  /** Current transform values */
  transform: Transform3D;
  
  /** Handler for transform changes */
  onChange: (transform: Partial<Transform3D>) => void;
  
  /** Instance ID for reference */
  instanceId?: string;
  
  /** Location name for display */
  locationName?: string;
  
  /** Handler for delete */
  onDelete?: () => void;
  
  /** Handler for duplicate */
  onDuplicate?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function LocationTransformControl({
  transform,
  onChange,
  instanceId,
  locationName,
  onDelete,
  onDuplicate,
}: LocationTransformControlProps) {
  const [activeTab, setActiveTab] = useState<'position' | 'rotation' | 'scale'>('position');
  
  const handleInputChange = useCallback((
    field: 'position' | 'rotation' | 'scale',
    axis: 'x' | 'y' | 'z',
    value: number
  ) => {
    onChange({
      [field]: {
        ...transform[field],
        [axis]: value,
      },
    });
  }, [transform, onChange]);
  
  return (
    <div className="location-transform-control">
      {/* Header */}
      <div className="location-transform-control__header">
        <h4 className="location-transform-control__title">Transform</h4>
        {instanceId && (
          <span className="location-transform-control__instance-id">
            {instanceId.slice(0, 8)}
          </span>
        )}
      </div>
      
      {/* Tabs */}
      <div className="location-transform-control__tabs">
        <button
          className={`location-transform-control__tab ${activeTab === 'position' ? 'location-transform-control__tab--active' : ''}`}
          onClick={() => setActiveTab('position')}
        >
          <Move size={14} />
          Position
        </button>
        <button
          className={`location-transform-control__tab ${activeTab === 'rotation' ? 'location-transform-control__tab--active' : ''}`}
          onClick={() => setActiveTab('rotation')}
        >
          <RotateCw size={14} />
          Rotation
        </button>
        <button
          className={`location-transform-control__tab ${activeTab === 'scale' ? 'location-transform-control__tab--active' : ''}`}
          onClick={() => setActiveTab('scale')}
        >
          <Maximize2 size={14} />
          Scale
        </button>
      </div>
      
      {/* Controls */}
      <div className="location-transform-control__content">
        {activeTab === 'position' && (
          <div className="location-transform-control__inputs">
            <div className="location-transform-control__axis location-transform-control__axis--x">
              <span className="location-transform-control__axis-label">X</span>
              <input
                type="number"
                value={transform.position.x}
                onChange={(e) => handleInputChange('position', 'x', parseFloat(e.target.value) || 0)}
                step="0.1"
              />
            </div>
            <div className="location-transform-control__axis location-transform-control__axis--y">
              <span className="location-transform-control__axis-label">Y</span>
              <input
                type="number"
                value={transform.position.y}
                onChange={(e) => handleInputChange('position', 'y', parseFloat(e.target.value) || 0)}
                step="0.1"
              />
            </div>
            <div className="location-transform-control__axis location-transform-control__axis--z">
              <span className="location-transform-control__axis-label">Z</span>
              <input
                type="number"
                value={transform.position.z}
                onChange={(e) => handleInputChange('position', 'z', parseFloat(e.target.value) || 0)}
                step="0.1"
              />
            </div>
          </div>
        )}
        
        {activeTab === 'rotation' && (
          <div className="location-transform-control__inputs">
            <div className="location-transform-control__axis location-transform-control__axis--pitch">
              <span className="location-transform-control__axis-label">Pitch</span>
              <input
                type="number"
                value={transform.rotation.x}
                onChange={(e) => handleInputChange('rotation', 'x', parseFloat(e.target.value) || 0)}
                step="1"
              />
            </div>
            <div className="location-transform-control__axis location-transform-control__axis--yaw">
              <span className="location-transform-control__axis-label">Yaw</span>
              <input
                type="number"
                value={transform.rotation.y}
                onChange={(e) => handleInputChange('rotation', 'y', parseFloat(e.target.value) || 0)}
                step="1"
              />
            </div>
            <div className="location-transform-control__axis location-transform-control__axis--roll">
              <span className="location-transform-control__axis-label">Roll</span>
              <input
                type="number"
                value={transform.rotation.z}
                onChange={(e) => handleInputChange('rotation', 'z', parseFloat(e.target.value) || 0)}
                step="1"
              />
            </div>
          </div>
        )}
        
        {activeTab === 'scale' && (
          <div className="location-transform-control__inputs">
            <div className="location-transform-control__axis location-transform-control__axis--uniform">
              <span className="location-transform-control__axis-label">Scale</span>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={transform.scale.x}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChange({ scale: { x: val, y: val, z: val } });
                }}
              />
              <span className="location-transform-control__scale-value">{transform.scale.x.toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="location-transform-control__actions">
        {onDuplicate && (
          <button
            className="location-transform-control__action"
            onClick={onDuplicate}
            title="Duplicate"
          >
            <Copy size={14} />
          </button>
        )}
        {onDelete && (
          <button
            className="location-transform-control__action location-transform-control__action--delete"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default LocationTransformControl;
