/**
 * Batch Generation Example
 * 
 * Demonstrates how to use the batch generation system for creating
 * multiple variations of generated content.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import React, { useState } from 'react';
import { useGenerationStore } from '../../stores/generationStore';
import { BatchConfigPanel } from './BatchConfigPanel';
import { BatchProgressDisplay } from './BatchProgressDisplay';
import { BatchGalleryView } from './BatchGalleryView';
import type { GeneratedAsset } from '../../types/generation';

/**
 * Example: Basic Batch Generation Workflow
 * 
 * This example shows the complete workflow for batch generation:
 * 1. Configure batch settings
 * 2. Start batch generation
 * 3. Monitor progress
 * 4. View and manage results
 */
export const BatchGenerationExample: React.FC = () => {
  const {
    batchConfig,
    setBatchConfig,
    startBatch,
    cancelBatch,
    activeBatch,
    batchHistory,
    updateBatchTaskStatus,
    completeBatchTask,
  } = useGenerationStore();

  const [showConfig, setShowConfig] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  // Example: Configure batch generation
  const handleConfigureBatch = () => {
    setBatchConfig({
      enabled: true,
      batchSize: 4,
      variationParams: {
        varySeeds: true,
        seedRange: [0, 999999],
        varyPrompts: false,
        varyParameters: false,
      },
    });
    setShowConfig(true);
  };

  // Example: Start batch generation
  const handleStartBatch = () => {
    if (!batchConfig.enabled) {
      alert('Please enable batch generation first');
      return;
    }

    const baseParams = {
      prompt: 'A beautiful landscape with mountains and lakes',
      width: 512,
      height: 512,
      steps: 20,
      cfgScale: 7.5,
      seed: 12345,
    };

    const batchId = startBatch('image', baseParams);
    console.log('Started batch:', batchId);

    // Simulate batch processing
    simulateBatchProcessing(batchId);
  };

  // Example: Simulate batch processing (in real app, this would be handled by GenerationOrchestrator)
  const simulateBatchProcessing = async (batchId: string) => {
    const batch = activeBatch;
    if (!batch) return;

    for (const task of batch.tasks) {
      // Update to running
      updateBatchTaskStatus(batchId, task.id, 'running');

      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete with mock result
      const result: GeneratedAsset = {
        id: `asset-${task.id}`,
        type: 'image',
        url: `https://picsum.photos/seed/${task.params.seed}/512/512`,
        metadata: {
          generationParams: task.params,
          fileSize: Math.random() * 2 * 1024 * 1024, // Random size 0-2MB
          dimensions: { width: 512, height: 512 },
          format: 'png',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      completeBatchTask(batchId, task.id, result);
    }
  };

  // Example: Cancel batch
  const handleCancelBatch = () => {
    if (activeBatch) {
      cancelBatch(activeBatch.id);
    }
  };

  // Get current or selected batch for display
  const displayBatch = selectedBatch
    ? batchHistory.find(b => b.id === selectedBatch) || activeBatch
    : activeBatch;

  return (
    <div className="batch-generation-example p-6 space-y-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Batch Generation Example</h1>
        <p className="text-gray-400 mb-6">
          Generate multiple variations of content with different parameters
        </p>

        {/* Control Panel */}
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Controls</h2>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleConfigureBatch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Configure Batch
            </button>

            <button
              onClick={handleStartBatch}
              disabled={!batchConfig.enabled || !!activeBatch}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Batch Generation
            </button>

            {activeBatch && (
              <button
                onClick={handleCancelBatch}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Cancel Batch
              </button>
            )}
          </div>

          {/* Status */}
          <div className="text-sm text-gray-400">
            <p>Batch Mode: {batchConfig.enabled ? 'Enabled' : 'Disabled'}</p>
            <p>Batch Size: {batchConfig.batchSize}</p>
            <p>Active Batch: {activeBatch ? 'Yes' : 'No'}</p>
            <p>Completed Batches: {batchHistory.length}</p>
          </div>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="bg-gray-800 rounded-lg p-6">
            <BatchConfigPanel onClose={() => setShowConfig(false)} />
          </div>
        )}

        {/* Active Batch Progress */}
        {activeBatch && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Active Batch</h2>
            <BatchProgressDisplay
              batch={activeBatch}
              onCancel={handleCancelBatch}
            />
          </div>
        )}

        {/* Completed Batch Gallery */}
        {displayBatch && displayBatch.status === 'completed' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Batch Results</h2>
            <BatchGalleryView batch={displayBatch} />
          </div>
        )}

        {/* Batch History */}
        {batchHistory.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Batch History</h2>
            <div className="space-y-2">
              {batchHistory.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-gray-800 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors cursor-pointer"
                  onClick={() => setSelectedBatch(batch.id)}
                >
                  <div>
                    <p className="text-white font-medium">
                      Batch {batch.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {batch.completedCount} completed • {batch.failedCount} failed •{' '}
                      {new Date(batch.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded text-sm ${
                        batch.status === 'completed'
                          ? 'bg-green-600 text-white'
                          : batch.status === 'failed'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {batch.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBatch(batch.id);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Examples */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Usage Examples</h2>
          
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <h3 className="font-medium text-white mb-2">1. Configure Batch Settings</h3>
              <pre className="bg-gray-900 rounded p-3 overflow-x-auto">
{`setBatchConfig({
  enabled: true,
  batchSize: 8,
  variationParams: {
    varySeeds: true,
    seedRange: [0, 999999],
    varyPrompts: false,
    varyParameters: false,
  },
});`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-white mb-2">2. Start Batch Generation</h3>
              <pre className="bg-gray-900 rounded p-3 overflow-x-auto">
{`const batchId = startBatch('image', {
  prompt: 'A beautiful landscape',
  width: 512,
  height: 512,
  steps: 20,
  cfgScale: 7.5,
  seed: 12345,
});`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-white mb-2">3. Mark Favorites</h3>
              <pre className="bg-gray-900 rounded p-3 overflow-x-auto">
{`markAsFavorite(batchId, assetId);
markAsDiscarded(batchId, assetId);
clearBatchSelections(batchId);`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-white mb-2">4. Reorder Queue</h3>
              <pre className="bg-gray-900 rounded p-3 overflow-x-auto">
{`// Move task to position 0 (first in queue)
reorderQueue(taskId, 0);`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Example: Advanced Batch Configuration
 * 
 * Shows how to configure batch generation with multiple variation types
 */
export const AdvancedBatchConfigExample: React.FC = () => {
  const { setBatchConfig } = useGenerationStore();

  const handleSetupAdvancedBatch = () => {
    setBatchConfig({
      enabled: true,
      batchSize: 12,
      variationParams: {
        // Vary seeds for different random variations
        varySeeds: true,
        seedRange: [1000, 9999],
        
        // Vary prompts for different content
        varyPrompts: true,
        promptVariations: [
          'A serene mountain landscape at sunrise',
          'A bustling city street at night',
          'A peaceful beach with palm trees',
          'A mystical forest with fog',
        ],
        
        // Vary parameters for different styles
        varyParameters: true,
        parameterRanges: {
          cfgScale: [5, 10],
          steps: [15, 30],
        },
      },
    });
  };

  return (
    <div className="p-6 bg-gray-900">
      <h2 className="text-xl font-semibold text-white mb-4">
        Advanced Batch Configuration
      </h2>
      <button
        onClick={handleSetupAdvancedBatch}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
      >
        Setup Advanced Batch
      </button>
      <p className="text-sm text-gray-400 mt-2">
        This will create 12 variations with different seeds, prompts, and parameters
      </p>
    </div>
  );
};

export default BatchGenerationExample;
