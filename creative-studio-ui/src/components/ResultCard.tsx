/**
 * ResultCard Component
 * 
 * Displays a generated result with preview, metadata, and download options.
 */

import React, { useState } from 'react';
import type { GeneratedResult, GeneratedAsset } from '../services/resultService';

export interface ResultCardProps {
  /**
   * Result to display
   */
  result: GeneratedResult;

  /**
   * Callback to get preview URL
   */
  getPreviewUrl: (asset: GeneratedAsset) => string;

  /**
   * Callback to download asset
   */
  onDownloadAsset?: (asset: GeneratedAsset) => void;

  /**
   * Callback to download all assets
   */
  onDownloadAll?: () => void;

  /**
   * Callback to delete result
   */
  onDelete?: () => void;

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
   * Custom className
   */
  className?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  getPreviewUrl,
  onDownloadAsset,
  onDownloadAll,
  onDelete,
  showDetails = false,
  compact = false,
  className = '',
}) => {
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(
    result.assets.length > 0 ? result.assets[0] : null
  );
  const [showPreview, setShowPreview] = useState(false);

  const getStatusColor = (status: GeneratedResult['status']): string => {
    return status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  };

  const getTypeIcon = (type: GeneratedResult['type']): string => {
    switch (type) {
      case 'grid':
        return '🎨';
      case 'promotion':
        return '⬆️';
      case 'refine':
        return '✨';
      case 'qa':
        return '🔍';
      default:
        return '📦';
    }
  };

  const getAssetIcon = (type: GeneratedAsset['type']): string => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'data':
        return '📄';
      default:
        return '📎';
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 border rounded-lg ${className}`}>
        <span className="text-2xl">{getTypeIcon(result.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{result.type.toUpperCase()}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(result.status)}`}>
              {result.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">{result.assets.length} assets</p>
        </div>
        {onDownloadAll && (
          <button
            onClick={onDownloadAll}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Download
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getTypeIcon(result.type)}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{result.type.toUpperCase()} Result</h3>
              <p className="text-sm text-gray-500">Task ID: {result.taskId.slice(0, 8)}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.status)}`}>
            {result.status}
          </span>
        </div>
      </div>

      {/* Preview */}
      {selectedAsset && (selectedAsset.type === 'image' || selectedAsset.type === 'video') && (
        <div className="relative bg-gray-900 aspect-video">
          {selectedAsset.type === 'image' ? (
            <img
              src={getPreviewUrl(selectedAsset)}
              alt={selectedAsset.name}
              className="w-full h-full object-contain cursor-pointer"
              onClick={() => setShowPreview(true)}
            />
          ) : (
            <video
              src={selectedAsset.url}
              controls
              className="w-full h-full object-contain"
            />
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="absolute top-2 right-2 px-3 py-1 bg-black/50 text-white rounded hover:bg-black/70"
          >
            🔍 Preview
          </button>
        </div>
      )}

      {/* Assets List */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 mb-3">
          Generated Assets ({result.assets.length})
        </h4>
        <div className="space-y-2">
          {result.assets.map((asset) => (
            <div
              key={asset.id}
              className={`flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                selectedAsset?.id === asset.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setSelectedAsset(asset)}
            >
              <span className="text-2xl">{getAssetIcon(asset.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{asset.name}</p>
                <div className="flex gap-3 text-sm text-gray-500">
                  <span>{asset.format?.toUpperCase()}</span>
                  <span>{formatFileSize(asset.size)}</span>
                  {asset.dimensions && (
                    <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
                  )}
                  {asset.duration && <span>{formatDuration(asset.duration)}</span>}
                </div>
              </div>
              {onDownloadAsset && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadAsset(asset);
                  }}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Download
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="p-4 border-t bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Details</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Generated:</span>
              <span className="ml-2 font-medium">{result.generatedAt.toLocaleString()}</span>
            </div>
            {result.processingTime && (
              <div>
                <span className="text-gray-500">Processing Time:</span>
                <span className="ml-2 font-medium">{result.processingTime}s</span>
              </div>
            )}
            {result.qualityScore && (
              <div>
                <span className="text-gray-500">Quality Score:</span>
                <span className="ml-2 font-medium">{result.qualityScore}/100</span>
              </div>
            )}
            {result.metrics && Object.keys(result.metrics).length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">Metrics:</span>
                <div className="mt-1 space-y-1">
                  {Object.entries(result.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t flex gap-2">
        {onDownloadAll && (
          <button
            onClick={onDownloadAll}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Download All
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedAsset && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="max-w-6xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {selectedAsset.type === 'image' ? (
              <img
                src={selectedAsset.url}
                alt={selectedAsset.name}
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : (
              <video
                src={selectedAsset.url}
                controls
                autoPlay
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 px-4 py-2 bg-white text-gray-900 rounded hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
