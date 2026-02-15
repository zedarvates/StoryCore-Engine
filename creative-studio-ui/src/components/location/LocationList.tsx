/**
 * LocationList Component
 * 
 * Grid layout for displaying location cards with filter and create functionality.
 * 
 * File: creative-studio-ui/src/components/location/LocationList.tsx
 * 
 * Updated: Added pagination support for large location lists
 */

import React, { useMemo } from 'react';
import { Plus, Grid, List, Filter, Search } from 'lucide-react';
import { LocationCard } from './LocationCard';
import type { Location, LocationType } from '@/types/location';
import { useLocationStore, getFilteredLocations } from '@/stores/locationStore';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/pagination';
import './LocationList.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the LocationList component
 */
export interface LocationListProps {
  /** Handler for create location button click */
  onCreateLocation: () => void;
  
  /** Handler for location card click */
  onLocationClick: (location: Location) => void;
  
  /** Handler for location edit */
  onEditLocation: (location: Location) => void;
  
  /** Handler for location delete */
  onDeleteLocation: (location: Location) => void;
  
  /** Whether to show filter controls */
  showFilters?: boolean;
  
  /** Whether to show create button */
  showCreateButton?: boolean;
  
  /** Whether to show action buttons on cards */
  showActions?: boolean;
  
  /** Whether to show selection controls */
  selectable?: boolean;
  
  /** Selected location IDs (for selection mode) */
  selectedIds?: string[];
  
  /** Handler for selection changes */
  onSelectionChange?: (ids: string[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function LocationList({
  onCreateLocation,
  onLocationClick,
  onEditLocation,
  onDeleteLocation,
  showFilters = true,
  showCreateButton = true,
  showActions = true,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: LocationListProps) {
  const {
    locations,
    filterType,
    filterWorld,
    searchQuery,
    selectLocation,
    setFilterType,
    setFilterWorld,
    setSearchQuery,
    isLoading,
  } = useLocationStore();
  
  const filteredLocations = useMemo(
    () => getFilteredLocations(useLocationStore.getState()),
    [locations, filterType, filterWorld, searchQuery]
  );
  
  /**
   * Pagination for locations
   */
  const {
    paginatedItems,
    pagination,
    goToPage,
    setPageSize,
  } = usePagination({
    items: filteredLocations,
    pageSize: 12,
    resetOnItemsChange: true,
  });
  
  const handleLocationClick = (location: Location) => {
    selectLocation(location.location_id);
    onLocationClick(location);
  };
  
  const handleSelectionChange = (location: Location, selected: boolean) => {
    if (onSelectionChange) {
      if (selected) {
        onSelectionChange([...selectedIds, location.location_id]);
      } else {
        onSelectionChange(selectedIds.filter((id) => id !== location.location_id));
      }
    }
  };
  
  const uniqueWorlds = useMemo(() => {
    const worlds = new Set<string>();
    locations.forEach((loc) => {
      if (loc.world_id) worlds.add(loc.world_id);
    });
    return Array.from(worlds);
  }, [locations]);
  
  return (
    <div className="location-list">
      {/* Header */}
      <div className="location-list__header">
        <h2 className="location-list__title">Locations</h2>
        {showCreateButton && (
          <button className="location-list__create-btn" onClick={onCreateLocation}>
            <Plus size={18} />
            Create Location
          </button>
        )}
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="location-list__filters">
          {/* Search */}
          <div className="location-list__search">
            <Search size={16} className="location-list__search-icon" />
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="location-list__search-input"
            />
          </div>
          
          {/* Type Filter */}
          <div className="location-list__filter">
            <Filter size={16} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as LocationType | 'all')}
              className="location-list__select"
              aria-label="Filter by location type"
            >
              <option value="all">All Types</option>
              <option value="exterior">Exterior</option>
              <option value="interior">Interior</option>
            </select>
          </div>
          
          {/* World Filter */}
          {uniqueWorlds.length > 0 && (
            <div className="location-list__filter">
              <select
                value={filterWorld}
                onChange={(e) => setFilterWorld(e.target.value)}
                className="location-list__select"
                aria-label="Filter by world"
              >
                <option value="all">All Worlds</option>
                {uniqueWorlds.map((worldId) => (
                  <option key={worldId} value={worldId}>
                    {worldId}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Results Count */}
          <div className="location-list__count">
            {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
      
      {/* Grid */}
      {isLoading ? (
        <div className="location-list__loading">
          <div className="location-list__spinner" />
          <p>Loading locations...</p>
        </div>
      ) : filteredLocations.length === 0 ? (
        <div className="location-list__empty">
          <div className="location-list__empty-icon">📍</div>
          <h3>No locations found</h3>
          <p>
            {searchQuery || filterType !== 'all' || filterWorld !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first location to get started'}
          </p>
          {showCreateButton && (
            <button className="location-list__create-btn" onClick={onCreateLocation}>
              <Plus size={18} />
              Create Location
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="location-list__grid">
            {paginatedItems.map((location) => (
              <LocationCard
                key={location.location_id}
                location={location}
                onClick={() => handleLocationClick(location)}
                selectable={selectable}
                selected={selectedIds.includes(location.location_id)}
                onSelect={(selected) => handleSelectionChange(location, selected)}
                showActions={showActions}
                onEdit={() => onEditLocation(location)}
                onDelete={() => onDeleteLocation(location)}
              />
            ))}
          </div>
          
          {/* Pagination Controls */}
          <Pagination
            pagination={pagination}
            onPageChange={goToPage}
            onPageSizeChange={setPageSize}
            showPageSizeSelector
            className="location-list__pagination"
          />
        </>
       )}
    </div>
  );
}

export default LocationList;
