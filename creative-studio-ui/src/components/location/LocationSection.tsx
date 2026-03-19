/**
 * LocationSection Component
 * 
 * Main section wrapper for the locations feature on the project dashboard.
 * Provides section header, create button, and integrates LocationList.
 * Includes World Building wizard integration for creating locations from world data.
 * 
 * File: creative-studio-ui/src/components/location/LocationSection.tsx
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Map, X, Globe, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { LocationList } from './LocationList';
import { LocationEditor } from './LocationEditor';
import { ImageLocationCreator } from './ImageLocationCreator';
import type { Location, LocationType } from '@/types/location';
import { useLocationStore } from '@/stores/locationStore';
import { useAppStore } from '@/stores/useAppStore';
import { v4 as uuidv4 } from 'uuid';
import './LocationSection.css';

// ============================================================================
// Types
// ============================================================================

/**
 * World Building location data (mock interface for integration)
 */
export interface WorldLocationData {
  id: string;
  name: string;
  description: string;
  location_type: 'exterior' | 'interior';
  atmosphere: string;
  genre_tags: string[];
  world_id: string;
  world_name: string;
}

/**
 * Props for the LocationSection component
 */
export interface LocationSectionProps {
  /** Handler for create location button click */
  onCreateLocation?: () => void;

  /** Handler for location card click (opens editor) */
  onLocationClick?: (location: Location) => void;

  /** Optional handler for location edit */
  onEditLocation?: (location: Location) => void;

  /** Optional handler for location delete */
  onDeleteLocation?: (location: Location) => void;

  /** Whether to show action buttons on location cards */
  showActions?: boolean;

  /** Whether to auto-fetch locations on mount */
  autoFetch?: boolean;

  /** Optional world building locations for integration */
  worldLocations?: WorldLocationData[];

  /** Handler when a location is created from world data */
  onCreateFromWorld?: (worldLocation: WorldLocationData) => void;

  /** Whether to hide the section header */
  hideHeader?: boolean;

  /** Optional className */
  className?: string;

  /** Optional style */
  style?: React.CSSProperties;
}

// ============================================================================
// Component
// ============================================================================

export function LocationSection({
  onCreateLocation,
  onLocationClick,
  onEditLocation,
  onDeleteLocation,
  showActions = true,
  autoFetch = true,
  worldLocations = [],
  onCreateFromWorld,
  hideHeader = false,
  className = '',
  style = {},
}: LocationSectionProps) {
  // Use individual selectors for stability
  const locations = useLocationStore(state => state.locations);
  const fetchLocations = useLocationStore(state => state.fetchLocations);
  const fetchProjectLocations = useLocationStore(state => state.fetchProjectLocations);
  const isLoading = useLocationStore(state => state.isLoading);
  const error = useLocationStore(state => state.error);
  const addLocation = useLocationStore(state => state.addLocation);
  const updateLocation = useLocationStore(state => state.updateLocation);
  const deleteLocation = useLocationStore(state => state.deleteLocation);

  // Get project ID from app store for fetching project-local locations
  const project = useAppStore((state) => state.project);
  const projectId = project?.path || project?.id || project?.project_name || 'unknown';

  const [showEditor, setShowEditor] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorldSelector, setShowWorldSelector] = useState(false);
  const [showImageCreator, setShowImageCreator] = useState(false);

  // Fetch locations on mount (both central and project-local)
  useEffect(() => {
    // Eviter les appels redondants si déjà en cours de chargement
    if (autoFetch && !isLoading) {
      fetchLocations();
      if (projectId && projectId !== 'unknown') {
        fetchProjectLocations(projectId);
      }
    }
  }, [autoFetch, fetchLocations, fetchProjectLocations, projectId, isLoading]);


  const handleCreateLocation = useCallback(() => {
    setEditingLocation(null);
    setShowCreateModal(true);
    if (onCreateLocation) onCreateLocation();
  }, [onCreateLocation]);

  const handleCreateFromWorld = useCallback((worldLocation: WorldLocationData) => {
    setShowWorldSelector(false);

    // Pre-populate editor with world data
    const prePopulatedData: Partial<Location> = {
      name: worldLocation.name,
      location_type: worldLocation.location_type,
      metadata: {
        description: worldLocation.description,
        atmosphere: worldLocation.atmosphere,
        genre_tags: worldLocation.genre_tags,
      },
      is_world_derived: true,
      world_id: worldLocation.world_id,
      world_location_id: worldLocation.id,
    };

    setEditingLocation(prePopulatedData as Location);
    setShowCreateModal(true);
    onCreateFromWorld?.(worldLocation);
  }, [onCreateFromWorld]);

  const handleWorldSelectorOpen = useCallback(() => {
    setShowWorldSelector(true);
  }, []);

  const handleLocationClick = useCallback((location: Location) => {
    setEditingLocation(location);
    setShowEditor(true);
    if (onLocationClick) onLocationClick(location);
  }, [onLocationClick]);

  const handleEditLocation = useCallback((location: Location) => {
    setEditingLocation(location);
    setShowCreateModal(true);
    if (onEditLocation) onEditLocation(location);
  }, [onEditLocation]);

  const handleDeleteLocation = useCallback(async (location: Location) => {
    if (window.confirm(`Are you sure you want to delete "${location?.name || 'this location'}"?`)) {
      try {
        await deleteLocation(location.location_id);
        if (onDeleteLocation) onDeleteLocation(location);
      } catch (err) {
        console.error('Failed to delete location:', err);
      }
    }
  }, [deleteLocation, onDeleteLocation]);

  const handleSaveLocation = useCallback(async (locationData: Partial<Location>) => {
    try {
      if (editingLocation) {
        // Update existing location
        await updateLocation(editingLocation.location_id, locationData);
      } else {
        // Create new location
        const newLocation: Location = {
          ...locationData, // Spread first, then override with required defaults
          location_id: uuidv4(),
          name: locationData.name || 'New Location',
          location_type: locationData.location_type || 'exterior',
          texture_direction: locationData.location_type === 'interior' ? 'inward' : 'outward',
          creation_method: 'manual',
          creation_timestamp: Date.now(),
          version: '1.0',
          metadata: {
            description: locationData.metadata?.description || '',
            atmosphere: locationData.metadata?.atmosphere || '',
            genre_tags: locationData.metadata?.genre_tags || [],
            ...locationData.metadata,
          },
          cube_textures: {},
          placed_assets: [],
          is_world_derived: false,
          world_id: locationData.world_id,
          world_location_id: locationData.world_location_id,
        } as Location;
        await addLocation(newLocation);
      }
      setShowCreateModal(false);
      setEditingLocation(null);
    } catch (err) {
      console.error('Failed to save location:', err);
    }
  }, [editingLocation, addLocation, updateLocation]);

  const handleCloseEditor = useCallback(() => {
    setShowEditor(false);
    setEditingLocation(null);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setEditingLocation(null);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchLocations();
    if (projectId && projectId !== 'unknown') {
      fetchProjectLocations(projectId);
    }
  }, [fetchLocations, fetchProjectLocations, projectId]);

  return (
    <div className={`location-section ${className}`} style={style}>
      {/* Section Header */}
      {!hideHeader && (
        <div className="location-section__header">
          <div className="location-section__title-wrapper">
            <Map className="location-section__icon" size={24} />
            <h2 className="location-section__title">Locations</h2>
            <span className="location-section__count">
              {locations.length} {locations.length === 1 ? 'location' : 'locations'}
            </span>
          </div>

          <div className="location-section__actions">
            {/* World Building Integration */}
            {worldLocations.length > 0 && (
              <div className="location-section__world-dropdown">
                <button
                  className="location-section__world-btn"
                  onClick={handleWorldSelectorOpen}
                  title="Create from World Building"
                >
                  <Globe size={16} />
                  <span>From World</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            )}

            {/* Refresh button */}
            <button
              className="location-section__refresh"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh locations"
            >
              <RefreshCw size={16} className={isLoading ? 'location-section__spinner' : ''} />
            </button>

            {/* Create from image button */}
            <button
              className="location-section__image-btn"
              onClick={() => setShowImageCreator(true)}
              title="Create from Image"
            >
              <Sparkles size={16} />
              <span>From Image</span>
            </button>

            {/* Create button */}
            <button
              className="location-section__create"
              onClick={handleCreateLocation}
            >
              <Plus size={18} />
              <span>Create</span>
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="location-section__error">
          {error}
          <button onClick={handleRefresh}> Retry</button>
        </div>
      )}

      {/* Location List */}
      <LocationList
        onCreateLocation={handleCreateLocation}
        onLocationClick={handleLocationClick}
        onEditLocation={handleEditLocation}
        onDeleteLocation={handleDeleteLocation}
        showFilters={true}
        showCreateButton={true}
        showActions={showActions}
      />

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="location-section__modal-overlay" onClick={handleCloseCreateModal}>
          <div className="location-section__modal" onClick={(e) => e.stopPropagation()}>
            <div className="location-section__modal-header">
              <h3 className="location-section__modal-title">
                {editingLocation ? 'Edit Location' : 'Create New Location'}
              </h3>
              <button className="location-section__modal-close" onClick={handleCloseCreateModal} title="Close">
                <X size={20} />
              </button>
            </div>
            <LocationEditor
              location={editingLocation || undefined}
              onSave={handleSaveLocation}
              onCancel={handleCloseCreateModal}
            />
          </div>
        </div>
      )}

      {/* Full Editor Modal */}
      {showEditor && editingLocation && (
        <div className="location-section__modal-overlay" onClick={handleCloseEditor}>
          <div className="location-section__modal location-section__modal--full" onClick={(e) => e.stopPropagation()}>
            <div className="location-section__modal-header">
              <h3 className="location-section__modal-title">
                Edit Location: {editingLocation.name}
              </h3>
              <button className="location-section__modal-close" onClick={handleCloseEditor} title="Close">
                <X size={20} />
              </button>
            </div>
            <LocationEditor
              location={editingLocation}
              onSave={handleSaveLocation}
              onCancel={handleCloseEditor}
              mode="full"
            />
          </div>
        </div>
      )}

      {/* Image Creator Modal */}
      {showImageCreator && (
        <div className="location-section__modal-overlay" onClick={() => setShowImageCreator(false)}>
          <div className="location-section__modal max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="location-section__modal-header">
              <h3 className="location-section__modal-title">
                Create Location from Image
              </h3>
              <button className="location-section__modal-close" onClick={() => setShowImageCreator(false)} title="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-[#1a1a1a]">
              <ImageLocationCreator
                onLocationCreated={(locData) => {
                  const location: Partial<Location> = {
                    name: locData.name,
                    location_type: (locData.location_type === 'interior' ? 'interior' : 'exterior') as LocationType,
                    metadata: {
                      description: locData.description || '',
                      atmosphere: locData.attributes?.atmosphere || '',
                      genre_tags: [],
                    },
                    creation_method: 'ai_vision'
                  };
                  handleSaveLocation(location);
                  setShowImageCreator(false);
                }}
                genre={(project?.projectSetup?.genre?.[0] as string) || 'fantasy'}
              />
            </div>
          </div>
        </div>
      )}

      {/* World Building Location Selector Modal */}
      {showWorldSelector && (
        <div className="location-section__modal-overlay" onClick={() => setShowWorldSelector(false)}>
          <div className="location-section__modal" onClick={(e) => e.stopPropagation()}>
            <div className="location-section__modal-header">
              <h3 className="location-section__modal-title">
                <Globe size={20} />
                Create from World Building
              </h3>
              <button className="location-section__modal-close" onClick={() => setShowWorldSelector(false)} title="Close">
                <X size={20} />
              </button>
            </div>
            <div className="location-section__world-content">
              <p className="location-section__world-description">
                Select a location from your World Building data to create a new location:
              </p>
              <div className="location-section__world-list">
                {worldLocations.map((worldLoc) => (
                  <button
                    key={worldLoc.id}
                    className="location-section__world-item"
                    onClick={() => handleCreateFromWorld(worldLoc)}
                  >
                    <div className="location-section__world-item-info">
                      <span className="location-section__world-item-name">{worldLoc.name}</span>
                      <span className="location-section__world-item-type">
                        {worldLoc.location_type === 'exterior' ? 'Exterior' : 'Interior'}
                      </span>
                    </div>
                    <span className="location-section__world-source">
                      From: {worldLoc.world_name}
                    </span>
                  </button>
                ))}
              </div>
              {worldLocations.length === 0 && (
                <p className="location-section__world-empty">
                  No World Building locations available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationSection;

