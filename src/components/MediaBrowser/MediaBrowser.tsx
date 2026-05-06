/**
 * Media Browser Component
 * 
 * Requirements: 86
 * Level: 🟡 HAUTE
 * 
 * Media browser with lazy loading and optimized image rendering
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLazyLoad } from '../hooks/usePerformanceOptimization';
import { useDebounce } from '../hooks/useDebounce';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

export interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnail?: string;
  size?: number;
  duration?: number;
  width?: number;
  height?: number;
  tags?: string[];
  createdAt: string;
}

export interface MediaBrowserProps {
  mediaItems: MediaItem[];
  onSelect?: (item: MediaItem) => void;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  isLoading?: boolean;
  gridSize?: number;
  showThumbnails?: boolean;
  lazyLoadThreshold?: number;
  searchPlaceholder?: string;
  filterOptions?: {
    types?: ('image' | 'video' | 'audio')[];
    tags?: string[];
  };
  className?: string;
}

export const MediaBrowser: React.FC<MediaBrowserProps> = ({
  mediaItems,
  onSelect,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  gridSize = 200,
  showThumbnails = true,
  lazyLoadThreshold = 300,
  searchPlaceholder = 'Search media...',
  filterOptions,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter and search media items
  const filteredItems = useMemo(() => {
    let items = [...mediaItems];

    // Apply search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    if (selectedTypes.size > 0) {
      items = items.filter((item) => selectedTypes.has(item.type));
    }

    // Apply tag filter
    if (selectedTags.size > 0) {
      items = items.filter((item) =>
        item.tags?.some((tag) => selectedTags.has(tag))
      );
    }

    return items;
  }, [mediaItems, debouncedSearch, selectedTypes, selectedTags]);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => gridSize,
    overscan: 5,
  });

  // Lazy loading hook
  const { isLoaded, isInView, imgRef, onLoad } = useLazyLoad();

  // Handle item click
  const handleItemClick = useCallback(
    (item: MediaItem) => {
      setSelectedItem(item.id);
      onSelect?.(item);
    },
    [onSelect]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  // Handle type filter toggle
  const toggleTypeFilter = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  // Handle tag filter toggle
  const toggleTagFilter = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  }, []);

  // Get unique tags from media items
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    mediaItems.forEach((item) => {
      item.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [mediaItems]);

  // Render media item
  const renderMediaItem = useCallback(
    (item: MediaItem, index: number) => {
      const isSelected = selectedItem === item.id;
      const isVideo = item.type === 'video';
      const isAudio = item.type === 'audio';

      return (
        <div
          key={item.id}
          className={`media-item ${isSelected ? 'selected' : ''}`}
          style={{
            width: gridSize,
            height: gridSize,
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translateY(${rowVirtualizer.getVirtualItems()[index]?.start ?? 0}px)`,
          }}
          onClick={() => handleItemClick(item)}
          role="button"
          tabIndex={0}
          aria-label={`Select ${item.name}`}
        >
          <div className="media-item-content">
            {showThumbnails && item.thumbnail ? (
              <div className="media-thumbnail">
                <img
                  ref={index === 0 ? imgRef : undefined}
                  src={item.thumbnail}
                  alt={item.name}
                  loading="lazy"
                  onLoad={index === 0 ? onLoad : undefined}
                  className={isLoaded ? 'loaded' : 'loading'}
                />
                {isVideo && (
                  <div className="media-overlay">
                    <span className="media-duration">{item.duration}s</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="media-placeholder">
                <span className="media-icon">
                  {isVideo ? '🎬' : isAudio ? '🎵' : '🖼️'}
                </span>
              </div>
            )}

            <div className="media-info">
              <div className="media-name" title={item.name}>
                {item.name}
              </div>
              <div className="media-meta">
                <span className="media-type">{item.type}</span>
                {item.size && (
                  <span className="media-size">
                    {(item.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
              {item.tags && item.tags.length > 0 && (
                <div className="media-tags">
                  {item.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="media-tag">
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 2 && (
                    <span className="media-tag-more">+{item.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    },
    [
      gridSize,
      showThumbnails,
      selectedItem,
      imgRef,
      isLoaded,
      onLoad,
      handleItemClick,
      rowVirtualizer,
    ]
  );

  return (
    <div className={`media-browser ${className}`}>
      {/* Search and Filter Bar */}
      <div className="media-browser-header">
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="search-input"
            aria-label="Search media"
          />
        </div>

        {filterOptions?.types && filterOptions.types.length > 0 && (
          <div className="filter-container">
            <span className="filter-label">Types:</span>
            {filterOptions.types.map((type) => (
              <button
                key={type}
                className={`filter-button ${selectedTypes.has(type) ? 'active' : ''}`}
                onClick={() => toggleTypeFilter(type)}
                aria-pressed={selectedTypes.has(type)}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {uniqueTags.length > 0 && (
          <div className="filter-container">
            <span className="filter-label">Tags:</span>
            {uniqueTags.slice(0, 5).map((tag) => (
              <button
                key={tag}
                className={`filter-button ${selectedTags.has(tag) ? 'active' : ''}`}
                onClick={() => toggleTagFilter(tag)}
                aria-pressed={selectedTags.has(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="media-browser-info">
        <span>{filteredItems.length} items found</span>
        {debouncedSearch && (
          <span>Searching for: "{debouncedSearch}"</span>
        )}
      </div>

      {/* Media Grid */}
      <div
        ref={parentRef}
        className="media-grid-container"
        style={{ height: '600px', overflow: 'auto' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = filteredItems[virtualRow.index];
            if (!item) return null;
            return renderMediaItem(item, virtualRow.index);
          })}
        </div>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="load-more-container">
          <button
            onClick={() => onLoadMore?.()}
            disabled={isLoading}
            className="load-more-button"
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && !isLoading && (
        <div className="empty-state">
          {mediaItems.length === 0 ? (
            <p>No media items available</p>
          ) : (
            <p>No items match your search criteria</p>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading media...</p>
        </div>
      )}

      <style jsx>{`
        .media-browser {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #f5f5f5;
        }

        .media-browser-header {
          padding: 16px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }

        .search-container {
          flex: 1;
          min-width: 200px;
        }

        .search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .filter-container {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-label {
          font-size: 14px;
          color: #666;
        }

        .filter-button {
          padding: 4px 12px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 12px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-button:hover {
          border-color: #4a90e2;
          color: #4a90e2;
        }

        .filter-button.active {
          background: #4a90e2;
          color: white;
          border-color: #4a90e2;
        }

        .media-browser-info {
          padding: 8px 16px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          display: flex;
          gap: 16px;
        }

        .media-grid-container {
          flex: 1;
          overflow: auto;
        }

        .media-item {
          position: absolute;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          background: white;
          border: 2px solid transparent;
          border-radius: 8px;
          overflow: hidden;
        }

        .media-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .media-item.selected {
          border-color: #4a90e2;
          box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
        }

        .media-item-content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .media-thumbnail {
          position: relative;
          width: 100%;
          height: calc(${gridSize}px * 0.7);
          overflow: hidden;
          background: #f0f0f0;
        }

        .media-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .media-thumbnail img.loaded {
          opacity: 1;
        }

        .media-thumbnail img.loading {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .media-overlay {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .media-placeholder {
          width: 100%;
          height: calc(${gridSize}px * 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 24px;
        }

        .media-info {
          padding: 8px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .media-name {
          font-size: 12px;
          font-weight: 500;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .media-meta {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #666;
        }

        .media-type {
          text-transform: capitalize;
        }

        .media-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .media-tag {
          font-size: 10px;
          padding: 2px 6px;
          background: #e8f4fd;
          color: #4a90e2;
          border-radius: 10px;
        }

        .media-tag-more {
          font-size: 10px;
          padding: 2px 6px;
          color: #666;
        }

        .load-more-container {
          padding: 16px;
          text-align: center;
        }

        .load-more-button {
          padding: 8px 24px;
          background: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .load-more-button:hover:not(:disabled) {
          background: #357abd;
        }

        .load-more-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .empty-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 14px;
        }

        .loading-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f0f0f0;
          border-top-color: #4a90e2;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
