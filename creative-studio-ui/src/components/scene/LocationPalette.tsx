/**
 * LocationPalette Component
 * 
 * Sidebar with draggable location thumbnails for placing in the 3D scene.
 * 
 * File: creative-studio-ui/src/components/scene/LocationPalette.tsx
 */

import React, { useState } from 'react';
import { MapPin, GripVertical, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import type { Location } from '@/types/location';
import './LocationPalette.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the LocationPalette component
 */
export interface LocationPaletteProps {
  /** Available locations */
  locations: Location[];
  
  /** Currently placed locations in scene */
  placedLocations: { instanceId: string; locationId: string }[];
  
  /** Handler for adding location to scene */
  onAddToScene: (locationId: string) => void;
  
  /** Handler for removing location from scene */
  onRemoveFromScene: (instanceId: string) => void;
  
  /** Handler for selecting location */
  onSelect: (instanceId: string | null) => void;
  
  /** Currently selected instance */
  selectedInstanceId: string | null;
}

// ============================================================================
// Component
// ============================================================================

export function LocationPalette({
  locations,
  placedLocations,
  onAddToScene,
  onRemoveFromScene,
  onSelect,
  selectedInstanceId,
}: LocationPaletteProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const getPlacedInstanceId = (locationId: string): string | undefined => {
    const placed = placedLocations.find((p) => p.locationId === locationId);
    return placed?.instanceId;
  };
  
  return (
    <div className="location-palette">
      <div className="location-palette__header" onClick={() => setIsExpanded(!isExpanded)}>
        <MapPin size={18} />
        <h3 className="location-palette__title">Locations</h3>
        <span className="location-palette__count">{locations.length}</span>
      </div>
      
      {isExpanded && (
        <div className="location-palette__content">
          {/* Available Locations */}
          <div className="location-palette__section">
            <h4 className="location-palette__section-title">Available</h4>
            <div className="location-palette__list">
              {locations.map((location) => {
                const isPlaced = getPlacedInstanceId(location.location_id);
                
                return (
                  <div
                    key={location.location_id}
                    className={`location-palette__item ${isPlaced ? 'location-palette__item--placed' : ''}`}
                    draggable={!isPlaced}
                    onDragStart={() => onAddToScene(location.location_id)}
                  >
                    <GripVertical size={14} className="location-palette__drag" />
                    <div className="location-palette__thumbnail">
                      {location.cube_textures?.front?.image_path ? (
                        <img src={location.cube_textures.front.image_path} alt={location.name} />
                      ) : (
                        <MapPin size={20} />
                      )}
                    </div>
                    <div className="location-palette__info">
                      <span className="location-palette__name">{location.name}</span>
                      <span className="location-palette__type">{location.location_type}</span>
                    </div>
                    {isPlaced ? (
                      <button
                        className="location-palette__action location-palette__action--remove"
                        onClick={() => {
                          const instanceId = getPlacedInstanceId(location.location_id);
                          if (instanceId) onRemoveFromScene(instanceId);
                        }}
                        title="Remove from scene"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <button
                        className="location-palette__action location-palette__action--add"
                        onClick={() => onAddToScene(location.location_id)}
                        title="Add to scene"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Placed Locations */}
          {placedLocations.length > 0 && (
            <div className="location-palette__section">
              <h4 className="location-palette__section-title">In Scene</h4>
              <div className="location-palette__list">
                {placedLocations.map((placed) => {
                  const location = locations.find((l) => l.location_id === placed.locationId);
                  if (!location) return null;
                  
                  return (
                    <div
                      key={placed.instanceId}
                      className={`location-palette__item location-palette__item--in-scene ${selectedInstanceId === placed.instanceId ? 'location-palette__item--selected' : ''}`}
                      onClick={() => onSelect(placed.instanceId)}
                    >
                      <GripVertical size={14} className="location-palette__drag" />
                      <div className="location-palette__thumbnail">
                        {location.cube_textures?.front?.image_path ? (
                          <img src={location.cube_textures.front.image_path} alt={location.name} />
                        ) : (
                          <MapPin size={20} />
                        )}
                      </div>
                      <div className="location-palette__info">
                        <span className="location-palette__name">{location.name}</span>
                        <span className="location-palette__instance-id">
                          {placed.instanceId.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LocationPalette;
