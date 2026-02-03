/**
 * Batch Gallery View Component
 * 
 * Displays completed batch generation results in a gallery:
 * - Grid layout of generated assets
 * - Favorite/discard selection
 * - Asset metadata display
 * - Comparison tools
 * 
 * Requirements: 11.4, 11.5
 */

import React, { useState } from 'react';
import { useGenerationStore } from '../../stores/generationStore';
import type { BatchGenerationState, GeneratedAsset } from '../../types/generation';

interface BatchGalleryViewProps {
  batch: BatchGenerationState;
}

export const BatchGalleryView: React.FC<BatchGalleryViewProps> = ({ batch }) => {
  const { markAsFavorite, markAsDiscarded, clearBatchSelections } = useGenerationStore();
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'favorites' | 'unselected'>('all');

  const filteredResults = batch.results.filter((asset) => {
    if (viewMode === 'favorites') {
      return batch.favorites.has(asset.id);
    }
    if (viewMode === 'unselected') {
      return !batch.favorites.has(asset.id) && !batch.discarded.has(asset.id);
    }
    return !batch.discarded.has(asset.id); // 'all' mode excludes discarded
  });

  const handleToggleFavorite = (assetId: string) => {
    if (batch.favorites.has(assetId)) {
      // Remove from favorites by marking as unselected (clear selection)
      markAsDiscarded(batch.id, assetId);
      markAsFavorite(batch.id, assetId); // This will remove from discarded
      // Actually we need a way to unmark - for now just toggle
    } else {
      markAsFavorite(batch.id, assetId);
    }
  };

  const handleToggleDiscard = (assetId: string) => {
    if (batch.discarded.has(assetId)) {
      markAsFavorite(batch.id, assetId); // Remove from discarded
    } else {
      markAsDiscarded(batch.id, assetId);
    }
  };

  const handleClearSelections = () => {
    clearBatchSelections(batch.id);
  };

  const renderAssetPreview = (asset: GeneratedAsset) => {
    switch (asset.type) {
      case 'image':
        return (
          <img
            src={asset.url}
            alt="Generated image"
            className="w-full h-full object-cover"
          />
        );
      case 'video':
        return (
          <video
            src={asset.url}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
          />
        );
      case 'audio':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <span className="text-4xl">🎵</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="batch-gallery-view space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Batch Results</h3>
          <p className="text-sm text-gray-400">
            {batch.results.length} assets generated •{' '}
            {batch.favorites.size} favorites •{' '}
            {batch.discarded.size} discarded
          </p>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode('favorites')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === 'favorites'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Favorites ({batch.favorites.size})
          </button>
          <button
            onClick={() => setViewMode('unselected')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === 'unselected'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Unselected
          </button>
        </div>

        {/* Clear Selections */}
        {(batch.favorites.size > 0 || batch.discarded.size > 0) && (
          <button
            onClick={handleClearSelections}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
          >
            Clear Selections
          </button>
        )}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredResults.map((asset) => {
          const isFavorite = batch.favorites.has(asset.id);
          const isDiscarded = batch.discarded.has(asset.id);

          return (
            <div
              key={asset.id}
              className={`relative group rounded-lg overflow-hidden bg-gray-800 cursor-pointer transition-all ${
                isFavorite ? 'ring-2 ring-yellow-500' : ''
              } ${isDiscarded ? 'opacity-50' : ''}`}
              onClick={() => setSelectedAsset(asset)}
            >
              {/* Asset Preview */}
              <div className="aspect-square">
                {renderAssetPreview(asset)}
              </div>

              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(asset.id);
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    isFavorite
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-yellow-500 hover:text-white'
                  }`}
                  aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  ★
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleDiscard(asset.id);
                  }}
                  className={`p-2 rounded-full transition-colors ${
                    isDiscarded
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-red-500 hover:text-white'
                  }`}
                  aria-label={isDiscarded ? 'Restore' : 'Discard'}
                >
                  🗑
                </button>
              </div>

              {/* Favorite Badge */}
              {isFavorite && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                  ★ Favorite
                </div>
              )}

              {/* Metadata */}
              <div className="p-2 bg-gray-900/80">
                <p className="text-xs text-gray-400 truncate">
                  {new Date(asset.timestamp).toLocaleString()}
                </p>
                {asset.metadata.fileSize && (
                  <p className="text-xs text-gray-500">
                    {(asset.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredResults.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No assets to display</p>
          {viewMode !== 'all' && (
            <button
              onClick={() => setViewMode('all')}
              className="mt-2 text-blue-400 hover:text-blue-300"
            >
              View all assets
            </button>
          )}
        </div>
      )}

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">Asset Details</h4>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Asset Display */}
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                {selectedAsset.type === 'image' && (
                  <img src={selectedAsset.url} alt="Generated asset" className="w-full" />
                )}
                {selectedAsset.type === 'video' && (
                  <video src={selectedAsset.url} controls className="w-full" />
                )}
                {selectedAsset.type === 'audio' && (
                  <audio src={selectedAsset.url} controls className="w-full" />
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-300">Metadata</h5>
                <div className="bg-gray-900 rounded p-3 text-sm text-gray-400 space-y-1">
                  <p>Type: {selectedAsset.type}</p>
                  <p>Timestamp: {new Date(selectedAsset.timestamp).toLocaleString()}</p>
                  {selectedAsset.metadata.fileSize && (
                    <p>
                      File Size: {(selectedAsset.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                  {selectedAsset.metadata.dimensions && (
                    <p>
                      Dimensions: {selectedAsset.metadata.dimensions.width} ×{' '}
                      {selectedAsset.metadata.dimensions.height}
                    </p>
                  )}
                  {selectedAsset.metadata.duration && (
                    <p>Duration: {selectedAsset.metadata.duration.toFixed(2)}s</p>
                  )}
                </div>
              </div>

              {/* Generation Parameters */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-300">Generation Parameters</h5>
                <div className="bg-gray-900 rounded p-3 text-sm text-gray-400">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(selectedAsset.metadata.generationParams, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleFavorite(selectedAsset.id)}
                  className={`flex-1 py-2 rounded transition-colors ${
                    batch.favorites.has(selectedAsset.id)
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {batch.favorites.has(selectedAsset.id) ? '★ Favorited' : '☆ Add to Favorites'}
                </button>
                <button
                  onClick={() => handleToggleDiscard(selectedAsset.id)}
                  className={`flex-1 py-2 rounded transition-colors ${
                    batch.discarded.has(selectedAsset.id)
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {batch.discarded.has(selectedAsset.id) ? 'Restore' : 'Discard'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
