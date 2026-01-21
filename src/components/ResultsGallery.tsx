/**
 * Results Gallery Component
 * Displays all results with filtering and sorting
 */

import React, { useState, useEffect } from 'react';
import { ResultCard } from './ResultCard';
import { GeneratedResult, GeneratedAsset } from '../services/resultService';

interface ResultsGalleryProps {
  results: GeneratedResult[];
  getPreviewUrl: (asset: GeneratedAsset) => string;
  filterType?: 'all' | 'grid' | 'promotion' | 'refine' | 'qa';
  filterStatus?: 'all' | 'success' | 'failed';
  sortBy?: 'date' | 'type' | 'quality';
  sortOrder?: 'asc' | 'desc';
  compact?: boolean;
  className?: string;
  onDownload?: (result: GeneratedResult) => void;
  onDelete?: (result: GeneratedResult) => void;
}

export const ResultsGallery: React.FC<ResultsGalleryProps> = ({
  results,
  getPreviewUrl,
  filterType = 'all',
  filterStatus = 'all',
  sortBy = 'date',
  sortOrder = 'desc',
  compact = false,
  className = '',
  onDownload,
  onDelete,
}) => {
  const [filteredResults, setFilteredResults] = useState<GeneratedResult[]>([]);
  const [summary, setSummary] = useState({
    success: 0,
    failed: 0,
    totalAssets: 0,
  });

  useEffect(() => {
    // Filter results
    let filtered = results;
    if (filterType !== 'all') {
      filtered = results.filter((result) => result.type === filterType);
    }
    if (filterStatus !== 'all') {
      filtered = filtered.filter((result) => result.status === filterStatus);
    }

    // Sort results
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return sortOrder === 'asc'
            ? a.generatedAt.getTime() - b.generatedAt.getTime()
            : b.generatedAt.getTime() - a.generatedAt.getTime();
        case 'type':
          return sortOrder === 'asc'
            ? a.type.localeCompare(b.type)
            : b.type.localeCompare(a.type);
        case 'quality':
          return sortOrder === 'asc'
            ? (a.qualityScore || 0) - (b.qualityScore || 0)
            : (b.qualityScore || 0) - (a.qualityScore || 0);
        default:
          return 0;
      }
    });

    setFilteredResults(filtered);

    // Calculate summary statistics
    const newSummary = {
      success: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'failed').length,
      totalAssets: results.reduce((sum, r) => sum + r.assets.length, 0),
    };
    setSummary(newSummary);
  }, [results, filterType, filterStatus, sortBy, sortOrder]);

  if (filteredResults.length === 0) {
    return (
      <div className={`results-gallery ${className}`}>
        <div className="gallery-summary">
          <div className="summary-stats">
            <span className="stat success">Success: {summary.success}</span>
            <span className="stat failed">Failed: {summary.failed}</span>
            <span className="stat assets">Total Assets: {summary.totalAssets}</span>
          </div>
        </div>
        <div className="empty-state">No results to display</div>
      </div>
    );
  }

  return (
    <div className={`results-gallery ${className}`}>
      <div className="gallery-summary">
        <div className="summary-stats">
          <span className="stat success">Success: {summary.success}</span>
          <span className="stat failed">Failed: {summary.failed}</span>
          <span className="stat assets">Total Assets: {summary.totalAssets}</span>
        </div>
      </div>

      <div className={`gallery-grid ${compact ? 'compact' : ''}`}>
        {filteredResults.map((result) => (
          <ResultCard
            key={result.taskId}
            result={result}
            getPreviewUrl={getPreviewUrl}
            onDownloadAsset={(asset) => {
              // Handle individual asset download
              console.log('Download asset:', asset.name);
            }}
            onDownloadAll={() => onDownload?.(result)}
            onDelete={() => onDelete?.(result)}
            showDetails={!compact}
            compact={compact}
            className="result-item"
          />
        ))}
      </div>
    </div>
  );
};

// Add CSS styles
const styles = `
.results-gallery {
  padding: 16px;
}

.gallery-summary {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.summary-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.stat.success {
  background: #f0fff4;
  color: #38a169;
}

.stat.failed {
  background: #fff5f5;
  color: #e53e3e;
}

.stat.assets {
  background: #ebf8ff;
  color: #3182ce;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.gallery-grid.compact {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.result-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #718096;
  font-style: italic;
}

@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);