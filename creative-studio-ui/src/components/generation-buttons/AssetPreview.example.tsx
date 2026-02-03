/**
 * Asset Preview Panel Example
 * 
 * Demonstrates the unified asset preview component with different asset types.
 * Shows metadata display, export controls, and related assets functionality.
 */

import React, { useState } from 'react';
import { AssetPreviewPanel } from './AssetPreviewPanel';
import type { GeneratedAsset, ExportFormat } from '../../types/generation';

/**
 * Example component demonstrating AssetPreviewPanel usage
 */
export const AssetPreviewExample: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  
  // Mock image asset
  const imageAsset: GeneratedAsset = {
    id: 'img-001',
    type: 'image',
    url: 'https://picsum.photos/1024/768',
    metadata: {
      generationParams: {
        prompt: 'A serene mountain landscape at sunset with golden light',
        negativePrompt: 'blurry, low quality',
        steps: 30,
        cfgScale: 7.5,
        sampler: 'euler',
        scheduler: 'normal',
        seed: 42,
        width: 1024,
        height: 768,
      },
      fileSize: 2048576, // 2 MB
      dimensions: { width: 1024, height: 768 },
      format: 'png',
    },
    relatedAssets: ['vid-001', 'aud-001'],
    timestamp: Date.now() - 300000, // 5 minutes ago
  };
  
  // Mock video asset
  const videoAsset: GeneratedAsset = {
    id: 'vid-001',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    metadata: {
      generationParams: {
        prompt: 'Camera slowly pans from left to right, revealing the landscape',
        inputImagePath: '/assets/img-001.png',
        frameCount: 120,
        frameRate: 24,
        width: 1920,
        height: 1080,
        motionStrength: 0.8,
        seed: 42,
      },
      fileSize: 10485760, // 10 MB
      dimensions: { width: 1920, height: 1080 },
      duration: 5,
      format: 'mp4',
    },
    relatedAssets: ['img-001', 'aud-001'],
    timestamp: Date.now() - 240000, // 4 minutes ago
  };
  
  // Mock audio asset
  const audioAsset: GeneratedAsset = {
    id: 'aud-001',
    type: 'audio',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    metadata: {
      generationParams: {
        text: 'As the sun sets over the mountains, a sense of peace fills the air.',
        voiceType: 'female',
        speed: 1.0,
        pitch: 0,
        language: 'en-US',
        emotion: 'calm',
      },
      fileSize: 524288, // 512 KB
      duration: 8,
      format: 'wav',
    },
    relatedAssets: ['img-001', 'vid-001'],
    timestamp: Date.now() - 180000, // 3 minutes ago
  };
  
  // Mock prompt asset
  const promptAsset: GeneratedAsset = {
    id: 'prompt-001',
    type: 'prompt',
    url: '',
    metadata: {
      generationParams: {
        text: 'A cinematic wide shot of a majestic mountain range during golden hour, with dramatic clouds and warm lighting creating a sense of awe and tranquility',
        categories: {
          genre: 'landscape',
          shotType: 'wide',
          lighting: 'golden hour',
          mood: 'peaceful',
          sceneElements: ['mountains', 'clouds', 'sunset'],
        },
      },
      fileSize: 256,
      format: 'txt',
    },
    relatedAssets: ['img-001'],
    timestamp: Date.now() - 360000, // 6 minutes ago
  };
  
  // All assets for related assets display
  const allAssets = [imageAsset, videoAsset, audioAsset, promptAsset];
  
  // Get related assets for current selection
  const getRelatedAssets = (asset: GeneratedAsset): GeneratedAsset[] => {
    return allAssets.filter(a => asset.relatedAssets.includes(a.id));
  };
  
  // Event handlers
  const handleSave = (asset: GeneratedAsset) => {
    console.log('Saving asset:', asset.id);
    alert(`Asset ${asset.id} saved successfully!`);
  };
  
  const handleExport = (asset: GeneratedAsset, format: ExportFormat) => {
    console.log('Exporting asset:', asset.id, 'as', format);
    alert(`Exporting asset ${asset.id} as ${format.toUpperCase()}`);
  };
  
  const handleRegenerate = () => {
    console.log('Regenerating asset');
    alert('Regenerating asset with same parameters...');
  };
  
  const handleRelatedAssetClick = (asset: GeneratedAsset) => {
    console.log('Switching to related asset:', asset.id);
    setSelectedAsset(asset);
  };
  
  // Initial selection
  const currentAsset = selectedAsset || imageAsset;
  const relatedAssets = getRelatedAssets(currentAsset);
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Asset Preview Panel</h1>
          <p className="text-muted-foreground">
            Unified component for displaying generated assets with metadata, export controls, and related assets.
          </p>
        </div>
        
        {/* Asset Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedAsset(imageAsset)}
            className={`px-4 py-2 rounded-lg border ${
              currentAsset.id === imageAsset.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
          >
            Image Asset
          </button>
          <button
            onClick={() => setSelectedAsset(videoAsset)}
            className={`px-4 py-2 rounded-lg border ${
              currentAsset.id === videoAsset.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
          >
            Video Asset
          </button>
          <button
            onClick={() => setSelectedAsset(audioAsset)}
            className={`px-4 py-2 rounded-lg border ${
              currentAsset.id === audioAsset.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
          >
            Audio Asset
          </button>
          <button
            onClick={() => setSelectedAsset(promptAsset)}
            className={`px-4 py-2 rounded-lg border ${
              currentAsset.id === promptAsset.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            }`}
          >
            Prompt Asset
          </button>
        </div>
        
        {/* Asset Preview */}
        <AssetPreviewPanel
          asset={currentAsset}
          onSave={handleSave}
          onExport={handleExport}
          onRegenerate={handleRegenerate}
          relatedAssets={relatedAssets}
          onRelatedAssetClick={handleRelatedAssetClick}
        />
        
        {/* Usage Examples */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Usage Examples</h2>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Basic Usage</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`<AssetPreviewPanel
  asset={generatedAsset}
  onSave={handleSave}
  onRegenerate={handleRegenerate}
/>`}</code>
            </pre>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">With Export Controls</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`<AssetPreviewPanel
  asset={generatedAsset}
  onSave={handleSave}
  onExport={(asset, format) => {
    console.log('Exporting', asset.id, 'as', format);
  }}
  onRegenerate={handleRegenerate}
/>`}</code>
            </pre>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">With Related Assets</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code>{`<AssetPreviewPanel
  asset={generatedAsset}
  relatedAssets={pipelineAssets}
  onRelatedAssetClick={(asset) => {
    setCurrentAsset(asset);
  }}
  onSave={handleSave}
  onRegenerate={handleRegenerate}
/>`}</code>
            </pre>
          </div>
        </div>
        
        {/* Features */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Features</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Unified interface for all asset types (image, video, audio, prompt)</li>
            <li>Automatic delegation to specialized preview panels for media assets</li>
            <li>Comprehensive metadata display with human-readable formatting</li>
            <li>Export format selection with type-specific options</li>
            <li>Related assets visualization with thumbnails</li>
            <li>Save, export, and regenerate actions</li>
            <li>Responsive layout with proper spacing</li>
            <li>Accessible buttons and controls</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssetPreviewExample;
