import React, { useState, useCallback } from 'react';
import { SearchBar } from '../components/search/SearchBar';
import { AdvancedSearch } from '../components/search/AdvancedSearch';
import { SearchResultsNavigation } from '../components/search/SearchResultsNavigation';
import { SavedFilters } from '../components/search/SavedFilters';
import { PredefinedFilters } from '../components/search/PredefinedFilters';
import { NoResults } from '../components/search/NoResults';
import type { Shot } from '../types';
import type { SearchFilter, PredefinedFilter } from '../types/gridEditorAdvanced';
import { motion, AnimatePresence } from 'framer-motion';

// Mock data for demonstration
const mockShots: Shot[] = [
  {
    id: '1',
    title: 'Opening Scene',
    description: 'Wide establishing shot of the city',
    duration: 5.2,
    position: 0,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      type: 'wide',
      status: 'ready',
      tags: ['establishing', 'city', 'outdoor'],
      favorite: true,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 3600000
    }
  },
  {
    id: '2',
    title: 'Character Introduction',
    description: 'Close-up of main character',
    duration: 3.5,
    position: 1,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      type: 'close-up',
      status: 'ready',
      tags: ['character', 'portrait', 'indoor'],
      favorite: false,
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 7200000
    }
  },
  {
    id: '3',
    title: 'Action Sequence',
    description: 'Fast-paced action with multiple cuts',
    duration: 12.8,
    position: 2,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      type: 'action',
      status: 'processing',
      tags: ['action', 'fast-paced', 'outdoor'],
      favorite: true,
      used: false,
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 1800000
    }
  },
  {
    id: '4',
    title: 'Dialogue Scene',
    description: 'Two characters talking',
    duration: 8.3,
    position: 3,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      type: 'medium',
      status: 'error',
      tags: ['dialogue', 'conversation', 'indoor'],
      favorite: false,
      hasErrors: true,
      createdAt: Date.now() - 345600000,
      updatedAt: Date.now() - 900000
    }
  },
  {
    id: '5',
    title: 'Closing Shot',
    description: 'Sunset over the horizon',
    duration: 6.7,
    position: 4,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    metadata: {
      type: 'wide',
      status: 'ready',
      tags: ['sunset', 'landscape', 'outdoor'],
      favorite: false,
      used: false,
      createdAt: Date.now() - 432000000,
      updatedAt: Date.now() - 600000
    }
  }
];

export const SearchExample: React.FC = () => {
  const [shots] = useState<Shot[]>(mockShots);
  const [searchResults, setSearchResults] = useState<Shot[]>(mockShots);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [highlightedShotId, setHighlightedShotId] = useState<string | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SearchFilter[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleSearchResults = useCallback((results: Shot[]) => {
    setSearchResults(results);
    setCurrentResultIndex(0);
    if (results.length > 0) {
      setHighlightedShotId(results[0].id);
    } else {
      setHighlightedShotId(null);
    }
  }, []);

  const handleNavigate = useCallback((index: number) => {
    setCurrentResultIndex(index);
  }, []);

  const handleHighlight = useCallback((shotId: string) => {
    setHighlightedShotId(shotId);
  }, []);

  const handleSaveFilter = useCallback((filter: SearchFilter) => {
    setSavedFilters(prev => [...prev, filter]);
  }, []);

  const handleDeleteFilter = useCallback((id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
    if (activeFilter === id) {
      setActiveFilter(null);
    }
  }, [activeFilter]);

  const handleUpdateFilter = useCallback((filter: SearchFilter) => {
    setSavedFilters(prev => prev.map(f => f.id === filter.id ? filter : f));
  }, []);

  const handleApplyFilter = useCallback((filter: SearchFilter) => {
    setActiveFilter(filter.id);
    // The AdvancedSearch component will handle the actual filtering
  }, []);

  const handleApplyPredefinedFilter = useCallback((
    filterType: PredefinedFilter,
    results: Shot[]
  ) => {
    setActiveFilter(filterType);
    handleSearchResults(results);
  }, [handleSearchResults]);

  return (
    <div className="search-example">
      <div className="example-header">
        <h1>Search and Filtering Example</h1>
        <p>Comprehensive search functionality with real-time filtering, logical operators, and saved filters</p>
      </div>

      <div className="search-container">
        {/* Basic Search Bar */}
        <div className="search-section">
          <h2>Basic Search</h2>
          <SearchBar
            shots={shots}
            onSearchResults={handleSearchResults}
            showAdvancedFilters={true}
          />
        </div>

        {/* Predefined Filters */}
        <div className="search-section">
          <h2>Quick Filters</h2>
          <PredefinedFilters
            shots={shots}
            onApplyFilter={handleApplyPredefinedFilter}
          />
        </div>

        {/* Advanced Search Toggle */}
        <div className="search-section">
          <button
            className="toggle-advanced-button"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            {showAdvancedSearch ? 'Hide' : 'Show'} Advanced Search
          </button>
        </div>

        {/* Advanced Search */}
        <AnimatePresence>
          {showAdvancedSearch && (
            <motion.div
              className="search-section"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <AdvancedSearch
                shots={shots}
                onSearchResults={handleSearchResults}
                onClose={() => setShowAdvancedSearch(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved Filters */}
        <div className="search-section">
          <h2>Saved Filters</h2>
          <SavedFilters
            filters={savedFilters}
            onApplyFilter={handleApplyFilter}
            onSaveFilter={handleSaveFilter}
            onDeleteFilter={handleDeleteFilter}
            onUpdateFilter={handleUpdateFilter}
          />
        </div>

        {/* Search Results */}
        <div className="search-section">
          <h2>Search Results ({searchResults.length})</h2>
          
          {searchResults.length > 0 ? (
            <>
              <SearchResultsNavigation
                results={searchResults}
                currentIndex={currentResultIndex}
                onNavigate={handleNavigate}
                onHighlight={handleHighlight}
              />

              <div className="results-list">
                {searchResults.map(shot => (
                  <div
                    key={shot.id}
                    className={`result-item ${highlightedShotId === shot.id ? 'highlighted' : ''}`}
                  >
                    <div className="result-header">
                      <h3>{shot.title}</h3>
                      <span className="result-duration">{shot.duration}s</span>
                    </div>
                    <p className="result-description">{shot.description}</p>
                    <div className="result-metadata">
                      <span className="metadata-item">Type: {shot.metadata?.type}</span>
                      <span className="metadata-item">Status: {shot.metadata?.status}</span>
                      {shot.metadata?.tags && (
                        <span className="metadata-item">
                          Tags: {(shot.metadata.tags as string[]).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <NoResults query="" />
          )}
        </div>
      </div>

      <style jsx>{`
        .search-example {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .example-header {
          margin-bottom: 2rem;
          text-align: center;
        }

        .example-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 32px;
          font-weight: 700;
          color: var(--text-primary, #333);
        }

        .example-header p {
          margin: 0;
          font-size: 16px;
          color: var(--text-secondary, #666);
        }

        .search-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .search-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .search-section h2 {
          margin: 0 0 1rem 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .toggle-advanced-button {
          width: 100%;
          padding: 1rem;
          background: var(--primary-color, #007bff);
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-advanced-button:hover {
          background: var(--primary-hover, #0056b3);
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }

        .result-item {
          padding: 1rem;
          background: var(--bg-secondary, #f5f5f5);
          border: 2px solid transparent;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .result-item.highlighted {
          background: var(--bg-info, #e7f3ff);
          border-color: var(--primary-color, #007bff);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .result-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .result-duration {
          padding: 0.25rem 0.5rem;
          background: white;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary, #666);
        }

        .result-description {
          margin: 0 0 0.75rem 0;
          font-size: 14px;
          color: var(--text-secondary, #666);
          line-height: 1.5;
        }

        .result-metadata {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .metadata-item {
          padding: 0.25rem 0.5rem;
          background: white;
          border-radius: 4px;
          font-size: 12px;
          color: var(--text-secondary, #666);
        }

        @media (max-width: 768px) {
          .search-example {
            padding: 1rem;
          }

          .example-header h1 {
            font-size: 24px;
          }

          .example-header p {
            font-size: 14px;
          }

          .search-section {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};
