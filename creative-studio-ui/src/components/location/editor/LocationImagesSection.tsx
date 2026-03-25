/**
 * LocationImagesSection Component
 * 
 * Tab content for the Images tab in LocationEditor.
 * Displays the current tile image and provides generation functionality.
 * 
 * File: creative-studio-ui/src/components/location/editor/LocationImagesSection.tsx
 */

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Eye, MapPin, RefreshCw } from 'lucide-react';
import type { Location } from '@/types/location';
import { LocationImageGenerator } from './LocationImageGenerator';
import { getImageDisplayUrl } from '@/services/imageStorageService';
import { useAppStore } from '@/stores/useAppStore';
import './LocationImagesSection.css';

interface LocationImagesSectionProps {
  /** Location to edit */
  location: Location;

  /** Handler when an image is generated */
  onImageGenerated?: (tileUrl: string, prompt?: string) => void;

  /** Handler when a historical image is selected to be restored */
  onImageSelect?: (tileUrl: string) => void;
}

/**
 * Display current tile image and provide generation options
 */
export function LocationImagesSection({
  location,
  onImageGenerated,
  onImageSelect,
}: LocationImagesSectionProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [historyUrls, setHistoryUrls] = useState<Record<string, string>>({});
  
  const project = useAppStore((state) => state.project);

  // Update display URL when location changes
  useEffect(() => {
    const loadDisplayUrls = async () => {
      // Load current image
      const currentPath = location.metadata?.thumbnail_path || location.metadata?.tile_image_path;
      if (currentPath) {
        const url = await getImageDisplayUrl(
          currentPath,
          project?.path || project?.metadata?.path as string | undefined
        );
        setDisplayImageUrl(url);
      } else {
        setDisplayImageUrl(null);
      }

      // Load history images
      const history = location.metadata?.thumbnail_history || [];
      const urls: Record<string, string> = {};
      
      for (const path of history) {
        if (!urls[path]) {
          const url = await getImageDisplayUrl(
            path,
            project?.path || project?.metadata?.path as string | undefined
          );
          if (url) urls[path] = url;
        }
      }
      setHistoryUrls(urls);
    };

    loadDisplayUrls();
  }, [location.metadata?.thumbnail_path, location.metadata?.tile_image_path, location.metadata?.thumbnail_history, project?.path, project?.metadata?.path]);

  const handleImageGenerated = (tileUrl: string, prompt?: string) => {
    setDisplayImageUrl(tileUrl);
    onImageGenerated?.(tileUrl, prompt);
    setShowGenerator(false);
  };

  return (
    <div className="location-images-section">
      <div className="location-images-section__header">
        <h3 className="location-images-section__title">
          <ImageIcon size={20} />
          Location Tile Image
        </h3>
        <p className="location-images-section__description">
          View and generate the tile image for this location. The tile image is used
          for map representation and identification.
        </p>
      </div>

      {/* Current tile image display */}
      <div className="location-images-section__current">
        <h4 className="location-images-section__subsection-title">
          <MapPin size={16} />
          Current Tile Image
        </h4>

        {displayImageUrl ? (
          <div className="location-images-section__preview">
            <img
              src={displayImageUrl}
              alt={`Tile image of ${location.name}`}
              className="location-images-section__image"
            />
            <div className="location-images-section__image-info">
              <span className="location-images-section__image-label">
                {location.name || 'Unnamed Location'}
              </span>
            </div>
          </div>
        ) : (
          <div className="location-images-section__placeholder">
            <ImageIcon size={48} />
            <p>No tile image set for this location</p>
            <span className="location-images-section__placeholder-hint">
              Generate a tile image using the button below
            </span>
          </div>
        )}
      {/* Image History */}
      {location.metadata?.thumbnail_history && location.metadata.thumbnail_history.length > 0 && (
        <div className="location-images-section__history">
          <h4 className="location-images-section__subsection-title">
            <ImageIcon size={16} />
            Generation History (Last {location.metadata.thumbnail_history.length})
          </h4>
          <div className="location-images-section__history-grid">
            {location.metadata.thumbnail_history.map((path, index) => (
              <div 
                key={`${path}-${index}`}
                className={`location-images-section__history-item ${
                  (location.metadata?.thumbnail_path === path || location.metadata?.tile_image_path === path) 
                    ? 'location-images-section__history-item--active' 
                    : ''
                }`}
                onClick={() => onImageSelect?.(path)}
                title="Restore this image"
              >
                {historyUrls[path] ? (
                  <img 
                    src={historyUrls[path]} 
                    alt={`History ${index}`} 
                    className="location-images-section__history-image" 
                  />
                ) : (
                  <div className="location-images-section__history-placeholder">
                    <RefreshCw size={12} className="animate-spin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Generate new image button */}
      <div className="location-images-section__actions">
        <button
          className="location-images-section__generate-btn"
          onClick={() => setShowGenerator(true)}
        >
          <RefreshCw size={18} />
          Generate New Tile Image
        </button>
      </div>

      {/* Image generator modal */}
      {showGenerator && (
        <div
          className="location-images-section__modal-overlay"
          onClick={() => setShowGenerator(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="location-images-section__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="location-images-section__modal-header">
              <h4 className="location-images-section__modal-title">
                <RefreshCw size={18} />
                Generate Tile Image
              </h4>
              <button
                className="location-images-section__modal-close"
                onClick={() => setShowGenerator(false)}
                aria-label="Close generator"
              >
                ×
              </button>
            </div>

            <LocationImageGenerator
              location={location}
              onImageGenerated={handleImageGenerated}
            />
          </div>
        </div>
      )}

      {/* Location info for reference */}
      <div className="location-images-section__info">
        <h4 className="location-images-section__subsection-title">
          <Eye size={16} />
          Location Details Used for Generation
        </h4>
        <div className="location-images-section__details">
          {location.name && (
            <div className="location-images-section__detail">
              <span className="location-images-section__detail-label">Name:</span>
              <span className="location-images-section__detail-value">{location.name}</span>
            </div>
          )}
          {location.location_type && (
            <div className="location-images-section__detail">
              <span className="location-images-section__detail-label">Type:</span>
              <span className="location-images-section__detail-value">
                {location.location_type === 'exterior' ? 'Exterior' : 'Interior'}
              </span>
            </div>
          )}
          {location.metadata?.description && (
            <div className="location-images-section__detail">
              <span className="location-images-section__detail-label">Description:</span>
              <span className="location-images-section__detail-value">
                {location.metadata.description}
              </span>
            </div>
          )}
          {location.metadata?.atmosphere && (
            <div className="location-images-section__detail">
              <span className="location-images-section__detail-label">Atmosphere:</span>
              <span className="location-images-section__detail-value">
                {location.metadata.atmosphere}
              </span>
            </div>
          )}
          {!location.name && !location.metadata?.description && (
            <p className="location-images-section__no-info">
              Add location details in the Info tab for better image generation results.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LocationImagesSection;
