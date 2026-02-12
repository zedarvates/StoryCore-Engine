/**
 * LocationCard Component
 * 
 * Displays a location summary card with thumbnail, name, type, and cube progress.
 * Supports selection mode for Story Generator and action buttons for editing and deletion.
 * 
 * File: creative-studio-ui/src/components/location/LocationCard.tsx
 */

import React, { useState } from 'react';
import { Edit2, Trash2, MapPin, Image as ImageIcon, Loader2, Box } from 'lucide-react';
import type { Location } from '@/types/location';
import { getLocationCompletionPercentage } from '@/stores/locationStore';
import './LocationCard.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the LocationCard component
 */
export interface LocationCardProps {
  /** The location to display */
  location: Location;
  
  /** Optional click handler for the card */
  onClick?: () => void;
  
  /** Whether the card is in selection mode */
  selectable?: boolean;
  
  /** Whether the card is currently selected */
  selected?: boolean;
  
  /** Handler for selection changes */
  onSelect?: (selected: boolean) => void;
  
  /** Whether to show action buttons (edit, delete) */
  showActions?: boolean;
  
  /** Handler for edit button click */
  onEdit?: () => void;
  
  /** Handler for delete button click */
  onDelete?: () => void;
  
  /** Whether the card is in loading state */
  loading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function LocationCard({
  location,
  onClick,
  selectable = false,
  selected = false,
  onSelect,
  showActions = false,
  onEdit,
  onDelete,
  loading = false,
}: LocationCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const completionPercentage = getLocationCompletionPercentage(location);
  const hasThumbnail = location.metadata?.thumbnail_path && !imageError;
  
  // Get thumbnail from front face if no dedicated thumbnail
  const displayThumbnail = hasThumbnail 
    ? location.metadata.thumbnail_path 
    : location.cube_textures?.front?.image_path;
  
  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onClick) {
      onClick();
    }
  };
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };
  
  const handleSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) onSelect(e.target.checked);
  };
  
  return (
    <div 
      className={`location-card ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''} ${loading ? 'loading' : ''}`}
      onClick={handleCardClick}
    >
      {loading && (
        <div className="location-card__loading-overlay">
          <Loader2 className="location-card__spinner" />
        </div>
      )}
      
      {selectable && (
        <div className="location-card__checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleSelectChange}
            onClick={(e) => e.stopPropagation()}
            title="Select location"
          />
        </div>
      )}
      
      <div className="location-card__thumbnail">
        {displayThumbnail ? (
          <img 
            src={displayThumbnail} 
            alt={location.name}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="location-card__thumbnail-placeholder">
            <MapPin size={48} />
          </div>
        )}
        
        {/* Cube Progress Indicator */}
        <div className="location-card__cube-progress">
          <Box size={14} />
          <span>{completionPercentage}%</span>
        </div>
      </div>
      
      <div className="location-card__content">
        <div className="location-card__header">
          <h3 className="location-card__name">{location.name}</h3>
          <span className={`location-card__type location-card__type--${location.location_type}`}>
            {location.location_type === 'exterior' ? 'Exterior' : 'Interior'}
          </span>
        </div>
        
        <p className="location-card__description">
          {location.metadata?.description?.slice(0, 100)}
          {location.metadata?.description?.length > 100 && '...'}
        </p>
        
        {location.metadata?.genre_tags && location.metadata.genre_tags.length > 0 && (
          <div className="location-card__tags">
            {location.metadata.genre_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="location-card__tag">
                {tag}
              </span>
            ))}
            {location.metadata.genre_tags.length > 3 && (
              <span className="location-card__tag location-card__tag--more">
                +{location.metadata.genre_tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        <div className="location-card__meta">
          <span className="location-card__created">
            Created: {new Date(location.creation_timestamp).toLocaleDateString()}
          </span>
          {location.is_world_derived && (
            <span className="location-card__derived">
              From World Building
            </span>
          )}
        </div>
      </div>
      
      {showActions && !loading && (
        <div className="location-card__actions">
          <button 
            className="location-card__action location-card__action--edit"
            onClick={handleEditClick}
            title="Edit location"
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="location-card__action location-card__action--delete"
            onClick={handleDeleteClick}
            title="Delete location"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default LocationCard;
