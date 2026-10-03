/**
 * Pipeline Completion View Component
 * 
 * Displays all generated assets together when pipeline is complete,
 * with export options and asset relationship visualization.
 * 
 * Requirements: 6.5, 9.4
 */

import React, { useState } from 'react';
import { useGenerationStore } from '../../stores/generationStore';
import { PipelineStateMachine } from '../../services/PipelineStateMachine';
import type { GeneratedAsset, GeneratedPrompt } from '../../types/generation';

export interface PipelineCompletionViewProps {
  pipelineId: string;
  onClose?: () => void;
  onExport?: (assets: GeneratedAsset[], format: ExportFormat) => void;
  onRestart?: () => void;
}

export type ExportFormat = 'individual' | 'batch' | 'zip' | 'mp4' | 'webm';

interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includePrompt: boolean;
  quality: 'low' | 'medium' | 'high';
}

/**
 * Pipeline Completion View Component
 */
export const PipelineCompletionView: React.FC<PipelineCompletionViewProps> = ({
  pipelineId,
  onClose,
  onExport,
  onRestart,
}) => {
  const currentPipeline = useGenerationStore(state => state.currentPipeline);
  const getRelatedAssets = useGenerationStore(state => state.getRelatedAssets);
  const getAllPipelineAssets = useGenerationStore(state => state.getAllPipelineAssets);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'individual',
    includeMetadata: true,
    includePrompt: true,
    quality: 'high',
  });

  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  if (!currentPipeline || currentPipeline.id !== pipelineId) {
    return (
      <div className="pipeline-completion-view">
        <div className="error-message">
          Pipeline not found
        </div>
      </div>
    );
  }

  if (!PipelineStateMachine.isPipelineComplete(currentPipeline)) {
    return (
      <div className="pipeline-completion-view">
        <div className="info-message">
          Pipeline is not yet complete
        </div>
      </div>
    );
  }

  const assets = getAllPipelineAssets();
  const completedStages = PipelineStateMachine.getCompletedStages(currentPipeline);
  const allAssets: GeneratedAsset[] = [
    assets.image,
    assets.video,
    assets.audio,
  ].filter((asset): asset is GeneratedAsset => asset !== undefined);

  const handleAssetSelect = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === allAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(allAssets.map(a => a.id)));
    }
  };

  const handleExport = () => {
    const assetsToExport = allAssets.filter(a => selectedAssets.has(a.id));
    if (assetsToExport.length === 0) {
      alert('Please select at least one asset to export');
      return;
    }

    onExport?.(assetsToExport, exportOptions.format);
  };

  const getAssetRelationships = (assetId: string): GeneratedAsset[] => {
    return getRelatedAssets(assetId);
  };

  return (
    <div className="pipeline-completion-view">
      {/* Header */}
      <div className="completion-header">
        <h2>Pipeline Complete</h2>
        <p className="completion-subtitle">
          All stages completed successfully. Review and export your generated assets.
        </p>
        {onClose && (
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close completion view"
          >
            ×
          </button>
        )}
      </div>

      {/* Pipeline Summary */}
      <div className="pipeline-summary">
        <div className="summary-card">
          <h3>Pipeline Summary</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Completed Stages</span>
              <span className="stat-value">{completedStages.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Generated Assets</span>
              <span className="stat-value">{allAssets.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">
                {Math.round((currentPipeline.updatedAt - currentPipeline.createdAt) / 1000)}s
              </span>
            </div>
          </div>
        </div>

        {/* Prompt Display */}
        {assets.prompt && (
          <div className="prompt-card">
            <h4>Generated Prompt</h4>
            <p className="prompt-text">{assets.prompt.text}</p>
          </div>
        )}
      </div>

      {/* Assets Grid */}
      <div className="assets-section">
        <div className="assets-header">
          <h3>Generated Assets</h3>
          <button
            className="select-all-button"
            onClick={handleSelectAll}
          >
            {selectedAssets.size === allAssets.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="assets-grid">
          {allAssets.map(asset => {
            const isSelected = selectedAssets.has(asset.id);
            const relatedAssets = getAssetRelationships(asset.id);

            return (
              <div
                key={asset.id}
                className={`asset-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleAssetSelect(asset.id)}
              >
                <div className="asset-checkbox">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleAssetSelect(asset.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="asset-preview">
                  {asset.type === 'image' && (
                    <img src={asset.url} alt="Generated image" />
                  )}
                  {asset.type === 'video' && (
                    <video src={asset.url} controls />
                  )}
                  {asset.type === 'audio' && (
                    <audio src={asset.url} controls />
                  )}
                </div>

                <div className="asset-info">
                  <div className="asset-type-badge">{asset.type}</div>
                  <div className="asset-metadata">
                    <span className="metadata-item">
                      {(asset.metadata.fileSize / 1024).toFixed(2)} KB
                    </span>
                    {asset.metadata.dimensions && (
                      <span className="metadata-item">
                        {asset.metadata.dimensions.width}×{asset.metadata.dimensions.height}
                      </span>
                    )}
                    {asset.metadata.duration && (
                      <span className="metadata-item">
                        {asset.metadata.duration.toFixed(1)}s
                      </span>
                    )}
                  </div>

                  {relatedAssets.length > 0 && (
                    <div className="asset-relationships">
                      <span className="relationships-label">Related:</span>
                      <span className="relationships-count">{relatedAssets.length} asset(s)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Options */}
      <div className="export-section">
        <h3>Export Options</h3>
        
        <div className="export-options-grid">
          <div className="option-group">
            <label htmlFor="export-format">Format</label>
            <select
              id="export-format"
              value={exportOptions.format}
              onChange={(e) => setExportOptions({
                ...exportOptions,
                format: e.target.value as ExportFormat,
              })}
            >
              <option value="individual">Individual Files</option>
              <option value="batch">Batch Export</option>
              <option value="zip">ZIP Archive</option>
              <option value="mp4">MP4 Video</option>
              <option value="webm">WebM Video</option>
            </select>
          </div>

          <div className="option-group">
            <label htmlFor="export-quality">Quality</label>
            <select
              id="export-quality"
              value={exportOptions.quality}
              onChange={(e) => setExportOptions({
                ...exportOptions,
                quality: e.target.value as 'low' | 'medium' | 'high',
              })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="option-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={exportOptions.includeMetadata}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  includeMetadata: e.target.checked,
                })}
              />
              Include Metadata
            </label>
          </div>

          <div className="option-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={exportOptions.includePrompt}
                onChange={(e) => setExportOptions({
                  ...exportOptions,
                  includePrompt: e.target.checked,
                })}
              />
              Include Prompt
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="completion-actions">
        <button
          className="export-button primary"
          onClick={handleExport}
          disabled={selectedAssets.size === 0}
        >
          Export Selected ({selectedAssets.size})
        </button>

        {onRestart && (
          <button
            className="restart-button secondary"
            onClick={onRestart}
          >
            Start New Pipeline
          </button>
        )}

        {onClose && (
          <button
            className="close-button-footer secondary"
            onClick={onClose}
          >
            Close
          </button>
        )}
      </div>

      {/* Asset Relationships Visualization */}
      {allAssets.length > 1 && (
        <div className="relationships-section">
          <h3>Asset Relationships</h3>
          <div className="relationships-diagram">
            <div className="pipeline-flow">
              {assets.prompt && (
                <div className="flow-node prompt-node">
                  <span className="node-label">Prompt</span>
                </div>
              )}
              {assets.image && (
                <>
                  <div className="flow-arrow">→</div>
                  <div className="flow-node image-node">
                    <span className="node-label">Image</span>
                  </div>
                </>
              )}
              {assets.video && (
                <>
                  <div className="flow-arrow">→</div>
                  <div className="flow-node video-node">
                    <span className="node-label">Video</span>
                  </div>
                </>
              )}
              {assets.audio && (
                <>
                  <div className="flow-arrow">→</div>
                  <div className="flow-node audio-node">
                    <span className="node-label">Audio</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineCompletionView;
