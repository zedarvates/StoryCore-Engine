/**
 * ResultsGallery Component
 * 
 * Displays a gallery of generated results with filtering and sorting.
 */

import React, { useState } from 'react';
import { useResultDisplay } from '../hooks/useResultDisplay';
import { ResultCard } from './ResultCard';
import type { GeneratedResult } from '../services/resultService';

export interface ResultsGalleryProps {
  /**
   * Filter by task type
   */
  filterType?: GeneratedResult['type'] | 'all';

  /**
   * Filter by status
   */
  filterStatus?: GeneratedResult['status'] | 'all';

  /**
   * Show detailed information
   * @default false
   */
  showDetails?: boolean;

  /**
   * Compact mode
   * @default false
   */
  compact?: boolean;

  /**
   * Auto-fetch results
   * @default true
   */
  autoFetch?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Callback when result is downloaded
   */
  onDownload?: (result: GeneratedResult) => void;

  /**
   * Callback when result is deleted
   */
  onDelete?: (result: GeneratedResult) => void;
}

export const ResultsGallery: React.FC<ResultsGalleryProps> = ({
  filterType = 'all',
  filterStatus = 'all',
  showDetails = false,
  compact = false,
  autoFetch = true,
  className = '',
  onDownload,
  onDelete,
}) => {
  const {
    results,
    downloadAsset,
    downloadAllAssets,
    deleteResult,
    getPreviewUrl,
    isLoading,
    error,
    fetchProjectResults,
  } = useResultDisplay({ autoFetch });

  const [sortBy, setSortBy] = useState<'date' | 'type' | 'quality'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Convert results map to array
  const resultsArray = Array.from(results.values());

  // Filter results
  const filteredResults = resultsArray.filter((result) => {
    if (filterType !== 'all' && result.type !== filterType) return false;
    if (filterStatus !== 'all' && result.status !== filterStatus) return false;
    return true;
  });

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = a.generatedAt.getTime() - b.generatedAt.getTime();
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'quality':
        comparison = (a.qualityScore || 0) - (b.qualityScore || 0);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleDownloadAll = async (result: GeneratedResult) => {
    await downloadAllAssets(result);
    if (onDownload) {
      onDownload(result);
    }
  };

  const handleDelete = async (result: GeneratedResult) => {
    await deleteResult(result.taskId);
    if (onDelete) {
      onDelete(result);
    }
  };

  if (isLoading && resultsArray.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="mt-4 text-gray-600">Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button
          onClick={() => fetchProjectResults()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sortedResults.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-lg text-gray-600 mb-2">No results to display</p>
        <p className="text-sm text-gray-500">
          {filterType !== 'all' || filterStatus !== 'all'
            ? 'Try adjusting your filters'
            : 'Complete some tasks to see results here'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Generated Results
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({sortedResults.length} {sortedResults.length === 1 ? 'result' : 'results'})
          </span>
        </h2>

        {/* Controls */}
        <div className="flex gap-2">
          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="type">Sort by Type</option>
            <option value="quality">Sort by Quality</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchProjectResults()}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
            disabled={isLoading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600">
            {resultsArray.filter((r) => r.status === 'success').length} successful
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-gray-600">
            {resultsArray.filter((r) => r.status === 'failed').length} failed
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-600">
            {resultsArray.reduce((sum, r) => sum + r.assets.length, 0)} total assets
          </span>
        </div>
      </div>

      {/* Results Grid */}
      <div className={compact ? 'space-y-2' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
        {sortedResults.map((result) => (
          <ResultCard
            key={result.taskId}
            result={result}
            getPreviewUrl={getPreviewUrl}
            onDownloadAsset={(asset) => downloadAsset(asset)}
            onDownloadAll={() => handleDownloadAll(result)}
            onDelete={() => handleDelete(result)}
            showDetails={showDetails}
            compact={compact}
          />
        ))}
      </div>

      {/* Loading Indicator */}
      {isLoading && resultsArray.length > 0 && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="mt-2 text-sm text-gray-600">Loading more results...</p>
        </div>
      )}
    </div>
  );
};
