import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter } from 'lucide-react';
import type { CharacterFilters } from '@/stores/useAppStore';
import './CharacterSearchBar.css';

/**
 * Props for the CharacterSearchBar component
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */
export interface CharacterSearchBarProps {
  /** Callback when search query changes (debounced) */
  onSearchChange: (query: string) => void;
  
  /** Callback when filters change */
  onFilterChange: (filters: CharacterFilters) => void;
  
  /** Current active filters */
  currentFilters: CharacterFilters;
  
  /** Number of results matching current search/filters */
  resultCount: number;
  
  /** Optional debounce delay in milliseconds (default: 300ms) */
  debounceDelay?: number;
}

/**
 * Available archetype options for filtering
 */
const ARCHETYPE_OPTIONS = [
  'Hero',
  'Mentor',
  'Ally',
  'Guardian',
  'Trickster',
  'Shapeshifter',
  'Shadow',
  'Herald',
];

/**
 * Available age range options for filtering
 */
const AGE_RANGE_OPTIONS = [
  'Child (0-12)',
  'Teen (13-19)',
  'Young Adult (20-35)',
  'Adult (36-55)',
  'Senior (56+)',
];

/**
 * Available creation method options for filtering
 */
const CREATION_METHOD_OPTIONS = [
  { value: 'wizard', label: 'Wizard' },
  { value: 'auto_generated', label: 'Auto-Generated' },
  { value: 'manual', label: 'Manual' },
] as const;

/**
 * CharacterSearchBar Component
 * 
 * Provides search and filter functionality for character lists.
 * Features:
 * - Debounced search input (300ms default)
 * - Multi-select filter dropdowns for archetype, age range, and creation method
 * - Result count display
 * - Clear filters button
 * 
 * Requirements:
 * - Req 9.1: Search input field
 * - Req 9.2: Filter characters by name, archetype, or traits
 * - Req 9.3: Filter options for archetype, age range, creation method
 * - Req 9.5: Display count of filtered results
 */
export function CharacterSearchBar({
  onSearchChange,
  onFilterChange,
  currentFilters,
  resultCount,
  debounceDelay = 300,
}: CharacterSearchBarProps) {
  // Local search query state (for immediate UI updates)
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter dropdown visibility state
  const [showArchetypeFilter, setShowArchetypeFilter] = useState(false);
  const [showAgeRangeFilter, setShowAgeRangeFilter] = useState(false);
  const [showCreationMethodFilter, setShowCreationMethodFilter] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchQuery);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceDelay, onSearchChange]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Handle archetype filter toggle
  const handleArchetypeToggle = (archetype: string) => {
    const current = currentFilters.archetype || [];
    const updated = current.includes(archetype)
      ? current.filter(a => a !== archetype)
      : [...current, archetype];
    
    onFilterChange({
      ...currentFilters,
      archetype: updated.length > 0 ? updated : undefined,
    });
  };

  // Handle age range filter toggle
  const handleAgeRangeToggle = (ageRange: string) => {
    const current = currentFilters.ageRange || [];
    const updated = current.includes(ageRange)
      ? current.filter(a => a !== ageRange)
      : [...current, ageRange];
    
    onFilterChange({
      ...currentFilters,
      ageRange: updated.length > 0 ? updated : undefined,
    });
  };

  // Handle creation method filter toggle
  const handleCreationMethodToggle = (method: 'wizard' | 'auto_generated' | 'manual') => {
    const current = currentFilters.creationMethod || [];
    const updated = current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method];
    
    onFilterChange({
      ...currentFilters,
      creationMethod: updated.length > 0 ? updated : undefined,
    });
  };

  // Handle clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    onFilterChange({
      archetype: undefined,
      ageRange: undefined,
      creationMethod: undefined,
    });
  };

  // Check if any filters are active
  const hasActiveFilters = 
    searchQuery.length > 0 ||
    (currentFilters.archetype && currentFilters.archetype.length > 0) ||
    (currentFilters.ageRange && currentFilters.ageRange.length > 0) ||
    (currentFilters.creationMethod && currentFilters.creationMethod.length > 0);

  // Count active filter selections
  const activeFilterCount = 
    (currentFilters.archetype?.length || 0) +
    (currentFilters.ageRange?.length || 0) +
    (currentFilters.creationMethod?.length || 0);

  return (
    <div className="character-search-bar">
      {/* Search input */}
      <div className="character-search-bar__search">
        <Search className="character-search-bar__search-icon" />
        <input
          type="text"
          className="character-search-bar__search-input"
          placeholder="Search characters by name, archetype, or traits..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search characters"
        />
        {searchQuery && (
          <button
            className="character-search-bar__clear-button"
            onClick={handleClearSearch}
            aria-label="Clear search"
            title="Clear search"
          >
            <X className="character-search-bar__clear-icon" />
          </button>
        )}
      </div>

      {/* Filter controls */}
      <div className="character-search-bar__filters">
        {/* Archetype filter */}
        <div className="character-search-bar__filter-group">
          <button
            className={`character-search-bar__filter-button ${
              currentFilters.archetype && currentFilters.archetype.length > 0
                ? 'character-search-bar__filter-button--active'
                : ''
            }`}
            onClick={() => setShowArchetypeFilter(!showArchetypeFilter)}
            aria-label="Filter by archetype"
            aria-expanded={showArchetypeFilter ? "true" : "false"}
          >
            <Filter className="character-search-bar__filter-icon" />
            <span>Archetype</span>
            {currentFilters.archetype && currentFilters.archetype.length > 0 && (
              <span className="character-search-bar__filter-badge">
                {currentFilters.archetype.length}
              </span>
            )}
          </button>
          
          {showArchetypeFilter && (
            <div className="character-search-bar__filter-dropdown">
              {ARCHETYPE_OPTIONS.map(archetype => (
                <label
                  key={archetype}
                  className="character-search-bar__filter-option"
                >
                  <input
                    type="checkbox"
                    checked={currentFilters.archetype?.includes(archetype) || false}
                    onChange={() => handleArchetypeToggle(archetype)}
                  />
                  <span>{archetype}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Age range filter */}
        <div className="character-search-bar__filter-group">
          <button
            className={`character-search-bar__filter-button ${
              currentFilters.ageRange && currentFilters.ageRange.length > 0
                ? 'character-search-bar__filter-button--active'
                : ''
            }`}
            onClick={() => setShowAgeRangeFilter(!showAgeRangeFilter)}
            aria-label="Filter by age range"
            aria-expanded={showAgeRangeFilter ? "true" : "false"}
          >
            <Filter className="character-search-bar__filter-icon" />
            <span>Age Range</span>
            {currentFilters.ageRange && currentFilters.ageRange.length > 0 && (
              <span className="character-search-bar__filter-badge">
                {currentFilters.ageRange.length}
              </span>
            )}
          </button>
          
          {showAgeRangeFilter && (
            <div className="character-search-bar__filter-dropdown">
              {AGE_RANGE_OPTIONS.map(ageRange => (
                <label
                  key={ageRange}
                  className="character-search-bar__filter-option"
                >
                  <input
                    type="checkbox"
                    checked={currentFilters.ageRange?.includes(ageRange) || false}
                    onChange={() => handleAgeRangeToggle(ageRange)}
                  />
                  <span>{ageRange}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Creation method filter */}
        <div className="character-search-bar__filter-group">
          <button
            className={`character-search-bar__filter-button ${
              currentFilters.creationMethod && currentFilters.creationMethod.length > 0
                ? 'character-search-bar__filter-button--active'
                : ''
            }`}
            onClick={() => setShowCreationMethodFilter(!showCreationMethodFilter)}
            aria-label="Filter by creation method"
            aria-expanded={showCreationMethodFilter ? "true" : "false"}
          >
            <Filter className="character-search-bar__filter-icon" />
            <span>Creation Method</span>
            {currentFilters.creationMethod && currentFilters.creationMethod.length > 0 && (
              <span className="character-search-bar__filter-badge">
                {currentFilters.creationMethod.length}
              </span>
            )}
          </button>
          
          {showCreationMethodFilter && (
            <div className="character-search-bar__filter-dropdown">
              {CREATION_METHOD_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="character-search-bar__filter-option"
                >
                  <input
                    type="checkbox"
                    checked={currentFilters.creationMethod?.includes(value) || false}
                    onChange={() => handleCreationMethodToggle(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            className="character-search-bar__clear-filters-button"
            onClick={handleClearFilters}
            aria-label="Clear all filters"
            title="Clear all filters"
          >
            <X className="character-search-bar__clear-filters-icon" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="character-search-bar__result-count">
        <span className="character-search-bar__result-count-number">
          {resultCount}
        </span>
        <span className="character-search-bar__result-count-label">
          {resultCount === 1 ? 'character' : 'characters'}
        </span>
        {activeFilterCount > 0 && (
          <span className="character-search-bar__result-count-filters">
            ({activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active)
          </span>
        )}
      </div>
    </div>
  );
}
