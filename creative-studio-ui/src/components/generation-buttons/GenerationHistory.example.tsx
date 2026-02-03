/**
 * Generation History Panel Example
 * 
 * Demonstrates the GenerationHistoryPanel component with sample data.
 */

import React, { useEffect } from 'react';
import { GenerationHistoryPanel } from './GenerationHistoryPanel';
import { generationHistoryService } from '../../services/GenerationHistoryService';
import type { GeneratedAsset, HistoryEntry } from '../../types/generation';

/**
 * Setup sample history data
 */
const setupSampleHistory = () => {
  // Clear existing history
  generationHistoryService.clearHistory();
  
  // Sample assets
  const imageAsset1: GeneratedAsset = {
    id: 'img-1',
    type: 'image',
    url: 'https://picsum.photos/seed/sunset1/512/512',
    metadata: {
      generationParams: {
        prompt: 'A beautiful sunset over mountains',
        width: 512,
        height: 512,
        steps: 20,
        cfgScale: 7.5,
        seed: 12345,
      },
      fileSize: 1024000,
      dimensions: { width: 512, height: 512 },
      format: 'png',
    },
    relatedAssets: [],
    timestamp: Date.now() - 7200000, // 2 hours ago
  };
  
  const imageAsset2: GeneratedAsset = {
    id: 'img-1',
    type: 'image',
    url: 'https://picsum.photos/seed/sunset2/512/512',
    metadata: {
      generationParams: {
        prompt: 'A beautiful sunset over mountains',
        width: 512,
        height: 512,
        steps: 30, // Changed
        cfgScale: 8.0, // Changed
        seed: 12345,
      },
      fileSize: 1124000,
      dimensions: { width: 512, height: 512 },
      format: 'png',
    },
    relatedAssets: [],
    timestamp: Date.now() - 3600000, // 1 hour ago
  };
  
  const videoAsset: GeneratedAsset = {
    id: 'vid-1',
    type: 'video',
    url: 'https://example.com/video.mp4',
    metadata: {
      generationParams: {
        prompt: 'Animated sunset with moving clouds',
        frameCount: 120,
        frameRate: 24,
        motionStrength: 0.8,
      },
      fileSize: 5120000,
      duration: 5,
      format: 'mp4',
    },
    relatedAssets: ['img-1'],
    timestamp: Date.now() - 1800000, // 30 minutes ago
  };
  
  const audioAsset: GeneratedAsset = {
    id: 'aud-1',
    type: 'audio',
    url: 'https://example.com/audio.mp3',
    metadata: {
      generationParams: {
        text: 'The sun sets over the mountains, painting the sky in brilliant colors.',
        voiceType: 'female',
        speed: 1.0,
        pitch: 1.0,
        language: 'en-US',
      },
      fileSize: 256000,
      duration: 8,
      format: 'mp3',
    },
    relatedAssets: ['vid-1'],
    timestamp: Date.now() - 900000, // 15 minutes ago
  };
  
  const imageAsset3: GeneratedAsset = {
    id: 'img-2',
    type: 'image',
    url: 'https://picsum.photos/seed/forest/512/512',
    metadata: {
      generationParams: {
        prompt: 'A mystical forest with glowing mushrooms',
        width: 768,
        height: 768,
        steps: 25,
        cfgScale: 7.0,
        seed: 54321,
      },
      fileSize: 1524000,
      dimensions: { width: 768, height: 768 },
      format: 'png',
    },
    relatedAssets: [],
    timestamp: Date.now() - 600000, // 10 minutes ago
  };
  
  // Log history entries
  generationHistoryService.logGeneration(
    'pipeline-1',
    'image',
    imageAsset1.metadata.generationParams,
    imageAsset1
  );
  
  generationHistoryService.logGeneration(
    'pipeline-1',
    'image',
    imageAsset2.metadata.generationParams,
    imageAsset2
  );
  
  generationHistoryService.logGeneration(
    'pipeline-1',
    'video',
    videoAsset.metadata.generationParams,
    videoAsset
  );
  
  generationHistoryService.logGeneration(
    'pipeline-1',
    'audio',
    audioAsset.metadata.generationParams,
    audioAsset
  );
  
  generationHistoryService.logGeneration(
    'pipeline-2',
    'image',
    imageAsset3.metadata.generationParams,
    imageAsset3
  );
};

/**
 * Basic Example
 */
export const BasicExample: React.FC = () => {
  useEffect(() => {
    setupSampleHistory();
  }, []);
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Generation History Panel</h1>
      <p className="text-muted-foreground mb-8">
        View all previous generations with filtering, sorting, and version comparison.
      </p>
      
      <GenerationHistoryPanel />
    </div>
  );
};

/**
 * With Callbacks Example
 */
export const WithCallbacksExample: React.FC = () => {
  useEffect(() => {
    setupSampleHistory();
  }, []);
  
  const handleEntrySelect = (entry: HistoryEntry) => {
    console.log('Entry selected:', entry);
    alert(`Selected: ${entry.type} v${entry.version}`);
  };
  
  const handleRegenerate = (entry: HistoryEntry) => {
    console.log('Regenerate:', entry);
    alert(`Regenerating ${entry.type} with parameters:\n${JSON.stringify(entry.params, null, 2)}`);
  };
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">History Panel with Callbacks</h1>
      <p className="text-muted-foreground mb-8">
        Click entries to select them or use the regenerate button.
      </p>
      
      <GenerationHistoryPanel
        onEntrySelect={handleEntrySelect}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
};

/**
 * Empty State Example
 */
export const EmptyStateExample: React.FC = () => {
  useEffect(() => {
    // Clear history to show empty state
    generationHistoryService.clearHistory();
  }, []);
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Empty History State</h1>
      <p className="text-muted-foreground mb-8">
        Shows the empty state when no history entries exist.
      </p>
      
      <GenerationHistoryPanel />
    </div>
  );
};

/**
 * Filtered Example
 */
export const FilteredExample: React.FC = () => {
  useEffect(() => {
    setupSampleHistory();
  }, []);
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Filtered History</h1>
      <p className="text-muted-foreground mb-8">
        Use the filters to narrow down history entries by type, search, or sort order.
      </p>
      
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Try these filters:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Filter by type: Select "Images" to see only image generations</li>
            <li>Search: Type "sunset" to find related entries</li>
            <li>Sort: Change sort order to see oldest entries first</li>
            <li>Compare: Click the compare button on two entries to see differences</li>
          </ul>
        </div>
        
        <GenerationHistoryPanel />
      </div>
    </div>
  );
};

/**
 * Version Comparison Example
 */
export const VersionComparisonExample: React.FC = () => {
  useEffect(() => {
    setupSampleHistory();
  }, []);
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Version Comparison</h1>
      <p className="text-muted-foreground mb-8">
        Compare different versions of the same asset to see parameter changes.
      </p>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-300">
            How to compare versions:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click the compare button (GitCompare icon) on the first entry</li>
            <li>The panel enters comparison mode</li>
            <li>Click another entry to see parameter differences</li>
            <li>Changed parameters are highlighted in yellow</li>
            <li>Click the X button to exit comparison mode</li>
          </ol>
        </div>
        
        <GenerationHistoryPanel />
      </div>
    </div>
  );
};

/**
 * All Examples
 */
export default function GenerationHistoryExamples() {
  return (
    <div className="space-y-16">
      <BasicExample />
      <Separator className="my-16" />
      <WithCallbacksExample />
      <Separator className="my-16" />
      <EmptyStateExample />
      <Separator className="my-16" />
      <FilteredExample />
      <Separator className="my-16" />
      <VersionComparisonExample />
    </div>
  );
}

// Import Separator for the default export
import { Separator } from '../ui/separator';
