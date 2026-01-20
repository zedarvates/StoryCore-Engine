import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, X, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Shot } from '../../types';
import type { SearchCriteria, SearchOperator } from '../../types/gridEditorAdvanced';

export interface SearchBarProps {
  shots: Shot[];
  onSearchResults: (results: Shot[]) => void;
  placeholder?: string;
  debounceMs?: number;
  showAdvancedFilters?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  shots,
  onSearchResults,
  placeholder = 'Search shots by name, tags, duration, type, or status...',
  debounceMs = 200,
  showAdvancedFilters = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'title' | 'tags' | 'duration' | 'type' | 'status'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Perform search
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return shots;
    }

    const query = debouncedQuery.toLowerCase().trim();
    
    return shots.filter(shot => {
      switch (searchField) {
        case 'title':
          return shot.title.toLowerCase().includes(query);
        
        case 'tags':
          // Search in metadata tags if they exist
          const tags = shot.metadata?.tags as string[] | undefined;
          return tags?.some(tag => tag.toLowerCase().includes(query)) ?? false;
        
        case 'duration':
          // Allow searching by duration (e.g., ">5", "<10", "5-10")
          return matchDuration(shot.duration, query);
        
        case 'type':
          // Search in metadata type if it exists
          const type = shot.metadata?.type as string | undefined;
          return type?.toLowerCase().includes(query) ?? false;
        
        case 'status':
          // Search in metadata status if it exists
          const status = shot.metadata?.status as string | undefined;
          return status?.toLowerCase().includes(query) ?? false;
        
        case 'all':
        default:
          // Search across all fields
          const titleMatch = shot.title.toLowerCase().includes(query);
          const descMatch = shot.description?.toLowerCase().includes(query) ?? false;
          const tagsMatch = (shot.metadata?.tags as string[] | undefined)?.some(
            tag => tag.toLowerCase().includes(query)
          ) ?? false;
          const typeMatch = (shot.metadata?.type as string | undefined)?.toLowerCase().includes(query) ?? false;
          const statusMatch = (shot.metadata?.status as string | undefined)?.toLowerCase().includes(query) ?? false;
          
          return titleMatch || descMatch || tagsMatch || typeMatch || statusMatch;
      }
    });
  }, [shots, debouncedQuery, searchField]);

  // Update results when they change
  useEffect(() => {
    onSearchResults(searchResults);
  }, [searchResults, onSearchResults]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  const handleFieldChange = useCallback((field: typeof searchField) => {
    setSearchField(field);
  }, []);

  return (
    <div className="search-bar-container">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          
          <input
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search shots"
          />
          
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                className="clear-button"
                onClick={handleClear}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                aria-label="Clear search"
              >
                <X size={16} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {showAdvancedFilters && (
          <button
            className="filter-toggle-button"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <Filter size={18} />
            <ChevronDown
              size={16}
              className={`chevron ${showFilters ? 'rotated' : ''}`}
            />
          </button>
        )}

        <div className="search-results-count">
          {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="search-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="filter-group">
              <label htmlFor="search-field">Search in:</label>
              <select
                id="search-field"
                value={searchField}
                onChange={(e) => handleFieldChange(e.target.value as typeof searchField)}
                className="filter-select"
              >
                <option value="all">All fields</option>
                <option value="title">Title</option>
                <option value="tags">Tags</option>
                <option value="duration">Duration</option>
                <option value="type">Type</option>
                <option value="status">Status</option>
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .search-bar-container {
          width: 100%;
          margin-bottom: 1rem;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 8px;
          border: 1px solid var(--border-color, #e0e0e0);
        }

        .search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: 6px;
        }

        .search-icon {
          color: var(--text-secondary, #666);
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          color: var(--text-primary, #333);
          background: transparent;
        }

        .search-input::placeholder {
          color: var(--text-tertiary, #999);
        }

        .clear-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          color: var(--text-secondary, #666);
          transition: all 0.2s;
        }

        .clear-button:hover {
          background: var(--bg-hover, #f0f0f0);
          color: var(--text-primary, #333);
        }

        .filter-toggle-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0.5rem;
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-secondary, #666);
          transition: all 0.2s;
        }

        .filter-toggle-button:hover {
          background: var(--bg-hover, #f0f0f0);
          border-color: var(--border-hover, #ccc);
        }

        .chevron {
          transition: transform 0.2s;
        }

        .chevron.rotated {
          transform: rotate(180deg);
        }

        .search-results-count {
          padding: 0.5rem;
          font-size: 13px;
          color: var(--text-secondary, #666);
          white-space: nowrap;
        }

        .search-filters {
          overflow: hidden;
          padding: 1rem;
          background: white;
          border: 1px solid var(--border-color, #e0e0e0);
          border-top: none;
          border-radius: 0 0 8px 8px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 14px;
          color: var(--text-secondary, #666);
          white-space: nowrap;
        }

        .filter-select {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 6px;
          font-size: 14px;
          color: var(--text-primary, #333);
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:hover {
          border-color: var(--border-hover, #ccc);
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--primary-color, #007bff);
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

// Helper function to match duration queries
function matchDuration(duration: number, query: string): boolean {
  // Handle range queries (e.g., "5-10")
  if (query.includes('-')) {
    const [min, max] = query.split('-').map(s => parseFloat(s.trim()));
    if (!isNaN(min) && !isNaN(max)) {
      return duration >= min && duration <= max;
    }
  }
  
  // Handle comparison queries (e.g., ">5", "<10", ">=5", "<=10")
  const comparisonMatch = query.match(/^([<>]=?)\s*(\d+(?:\.\d+)?)$/);
  if (comparisonMatch) {
    const operator = comparisonMatch[1];
    const value = parseFloat(comparisonMatch[2]);
    
    if (!isNaN(value)) {
      switch (operator) {
        case '>': return duration > value;
        case '>=': return duration >= value;
        case '<': return duration < value;
        case '<=': return duration <= value;
      }
    }
  }
  
  // Handle exact match
  const exactValue = parseFloat(query);
  if (!isNaN(exactValue)) {
    return Math.abs(duration - exactValue) < 0.1; // Allow small tolerance
  }
  
  return false;
}
