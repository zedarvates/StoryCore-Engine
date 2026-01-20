/**
 * ThumbnailCacheDemo Component
 * 
 * Demonstrates the ThumbnailCache system with multiple thumbnails
 * Shows cache statistics and preloading capabilities
 */

import React, { useState } from 'react';
import { ThumbnailPreview } from './ThumbnailPreview';
import { useCacheStats, usePreloadThumbnails } from '../../hooks/useThumbnailCache';
import './ThumbnailCacheDemo.css';

export const ThumbnailCacheDemo: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const { stats, clearCache } = useCacheStats();

  // Generate times for demonstration (every 5 seconds for 60 seconds)
  const times = Array.from({ length: 12 }, (_, i) => i * 5);

  const { isPreloading, progress } = usePreloadThumbnails(videoUrl, times, quality);

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(e.target.value);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="thumbnail-cache-demo">
      <h2>Thumbnail Cache System Demo</h2>

      <div className="demo-controls">
        <div className="control-group">
          <label htmlFor="video-url">Video URL:</label>
          <input
            id="video-url"
            type="text"
            value={videoUrl}
            onChange={handleVideoUrlChange}
            placeholder="Enter video URL"
            className="video-url-input"
          />
        </div>

        <div className="control-group">
          <label htmlFor="quality">Quality:</label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}
            className="quality-select"
          >
            <option value="low">Low (160x90)</option>
            <option value="medium">Medium (320x180)</option>
            <option value="high">High (640x360)</option>
          </select>
        </div>

        <button onClick={clearCache} className="clear-cache-button">
          Clear Cache
        </button>
      </div>

      <div className="cache-stats">
        <h3>Cache Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Memory Usage:</span>
            <span className="stat-value">{formatBytes(stats.memorySize)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Memory %:</span>
            <span className="stat-value">{stats.memoryUsage.toFixed(2)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Cached Items:</span>
            <span className="stat-value">{stats.memoryCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Max Memory:</span>
            <span className="stat-value">{formatBytes(stats.maxMemorySize)}</span>
          </div>
        </div>
      </div>

      {isPreloading && (
        <div className="preload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">Preloading: {progress.toFixed(0)}%</span>
        </div>
      )}

      {videoUrl && (
        <div className="thumbnails-grid">
          <h3>Thumbnails Timeline</h3>
          <div className="thumbnails-container">
            {times.map((time) => (
              <div key={time} className="thumbnail-item">
                <ThumbnailPreview
                  videoUrl={videoUrl}
                  time={time}
                  quality={quality}
                  preloadAdjacent={true}
                  framerate={30}
                />
                <span className="thumbnail-time">{time}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="demo-info">
        <h3>Features Demonstrated</h3>
        <ul>
          <li>✓ LRU cache eviction policy (Requirement 5.3)</li>
          <li>✓ IndexedDB persistence (Requirement 5.8)</li>
          <li>✓ Intelligent preloading (Requirements 5.5, 5.7)</li>
          <li>✓ Loading placeholders (Requirement 5.6)</li>
          <li>✓ Multiple quality levels (Requirement 5.4)</li>
          <li>✓ Memory and disk cache tiers (Requirements 5.1, 5.2)</li>
        </ul>
      </div>
    </div>
  );
};
