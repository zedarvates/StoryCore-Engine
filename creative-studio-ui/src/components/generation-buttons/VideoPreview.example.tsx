/**
 * Video Preview Panel Example
 * 
 * Demonstrates the VideoPreviewPanel component with various configurations.
 */

import React, { useState } from 'react';
import { VideoPreviewPanel } from './VideoPreviewPanel';
import type { GeneratedAsset } from '../../types/generation';

/**
 * Example: Basic Video Preview
 */
export const BasicVideoPreview: React.FC = () => {
  const mockVideoAsset: GeneratedAsset = {
    id: 'video-example-1',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    metadata: {
      generationParams: {
        prompt: 'Camera slowly pans across the scene',
        inputImagePath: '/path/to/source-image.png',
        frameCount: 120,
        frameRate: 24,
        width: 1024,
        height: 576,
        motionStrength: 0.8,
        seed: 42,
      },
      fileSize: 5242880, // 5 MB
      dimensions: { width: 1024, height: 576 },
      duration: 5,
      format: 'mp4',
    },
    relatedAssets: ['image-456'],
    timestamp: Date.now(),
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Basic Video Preview</h2>
      <VideoPreviewPanel asset={mockVideoAsset} />
    </div>
  );
};

/**
 * Example: Video Preview with Actions
 */
export const VideoPreviewWithActions: React.FC = () => {
  const [savedAsset, setSavedAsset] = useState<GeneratedAsset | null>(null);
  const [regenerateCount, setRegenerateCount] = useState(0);
  const [audioGenerated, setAudioGenerated] = useState(false);

  const mockVideoAsset: GeneratedAsset = {
    id: 'video-example-2',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    metadata: {
      generationParams: {
        prompt: 'Dramatic zoom into the subject',
        inputImagePath: '/path/to/source-image.png',
        frameCount: 240,
        frameRate: 30,
        width: 1920,
        height: 1080,
        motionStrength: 0.6,
        seed: 123,
      },
      fileSize: 15728640, // 15 MB
      dimensions: { width: 1920, height: 1080 },
      duration: 8,
      format: 'mp4',
    },
    relatedAssets: ['image-789'],
    timestamp: Date.now(),
  };

  const handleSave = (asset: GeneratedAsset) => {
    setSavedAsset(asset);
    alert(`Video saved: ${asset.id}`);
  };

  const handleRegenerate = () => {
    setRegenerateCount(prev => prev + 1);
    alert(`Regenerating video (attempt ${regenerateCount + 1})`);
  };

  const handleGenerateAudio = (asset: GeneratedAsset) => {
    setAudioGenerated(true);
    alert(`Generating audio for video: ${asset.id}`);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold">Video Preview with Actions</h2>
      
      <VideoPreviewPanel
        asset={mockVideoAsset}
        onSave={handleSave}
        onRegenerate={handleRegenerate}
        onGenerateAudio={handleGenerateAudio}
        canGenerateAudio={!audioGenerated}
      />
      
      {/* Status Display */}
      <div className="p-4 bg-muted rounded-lg space-y-2">
        <h3 className="font-semibold">Action Status</h3>
        <div className="text-sm space-y-1">
          <p>Saved: {savedAsset ? `Yes (${savedAsset.id})` : 'No'}</p>
          <p>Regenerate Count: {regenerateCount}</p>
          <p>Audio Generated: {audioGenerated ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Example: Video Preview with Disabled Audio
 */
export const VideoPreviewDisabledAudio: React.FC = () => {
  const mockVideoAsset: GeneratedAsset = {
    id: 'video-example-3',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    metadata: {
      generationParams: {
        prompt: 'Slow motion effect',
        inputImagePath: '/path/to/source-image.png',
        frameCount: 60,
        frameRate: 24,
        width: 1280,
        height: 720,
        motionStrength: 0.4,
        seed: 999,
      },
      fileSize: 8388608, // 8 MB
      dimensions: { width: 1280, height: 720 },
      duration: 2.5,
      format: 'mp4',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Video Preview with Disabled Audio</h2>
      <p className="text-muted-foreground mb-4">
        Audio generation is disabled (e.g., TTS service unavailable)
      </p>
      <VideoPreviewPanel
        asset={mockVideoAsset}
        onGenerateAudio={() => {}}
        canGenerateAudio={false}
      />
    </div>
  );
};

/**
 * Example: Video Preview without Optional Parameters
 */
export const VideoPreviewMinimal: React.FC = () => {
  const mockVideoAsset: GeneratedAsset = {
    id: 'video-example-4',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    metadata: {
      generationParams: {
        prompt: 'Simple camera movement',
      },
      fileSize: 3145728, // 3 MB
      format: 'mp4',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Minimal Video Preview</h2>
      <p className="text-muted-foreground mb-4">
        Video with minimal metadata (no dimensions, duration, or detailed parameters)
      </p>
      <VideoPreviewPanel asset={mockVideoAsset} />
    </div>
  );
};

/**
 * Example: Multiple Video Previews
 */
export const MultipleVideoPreviews: React.FC = () => {
  const videos: GeneratedAsset[] = [
    {
      id: 'video-batch-1',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      metadata: {
        generationParams: {
          prompt: 'Fast motion',
          frameCount: 60,
          frameRate: 30,
          motionStrength: 0.9,
        },
        fileSize: 2097152,
        dimensions: { width: 1280, height: 720 },
        duration: 2,
        format: 'mp4',
      },
      relatedAssets: [],
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'video-batch-2',
      type: 'video',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      metadata: {
        generationParams: {
          prompt: 'Slow motion',
          frameCount: 120,
          frameRate: 24,
          motionStrength: 0.3,
        },
        fileSize: 4194304,
        dimensions: { width: 1920, height: 1080 },
        duration: 5,
        format: 'mp4',
      },
      relatedAssets: [],
      timestamp: Date.now() - 1800000,
    },
  ];

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Multiple Video Previews</h2>
      <p className="text-muted-foreground">
        Batch generation results displayed in a grid
      </p>
      
      <div className="grid grid-cols-1 gap-6">
        {videos.map(video => (
          <VideoPreviewPanel
            key={video.id}
            asset={video}
            onSave={(asset) => alert(`Saved: ${asset.id}`)}
            onRegenerate={() => alert(`Regenerating: ${video.id}`)}
            onGenerateAudio={(asset) => alert(`Generating audio for: ${asset.id}`)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Example: Video Preview with Custom Styling
 */
export const VideoPreviewCustomStyling: React.FC = () => {
  const mockVideoAsset: GeneratedAsset = {
    id: 'video-example-5',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    metadata: {
      generationParams: {
        prompt: 'Cinematic pan',
        frameCount: 180,
        frameRate: 24,
        width: 1920,
        height: 1080,
        motionStrength: 0.7,
        seed: 555,
      },
      fileSize: 12582912, // 12 MB
      dimensions: { width: 1920, height: 1080 },
      duration: 7.5,
      format: 'mp4',
    },
    relatedAssets: ['image-custom'],
    timestamp: Date.now(),
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Video Preview with Custom Styling</h2>
      <VideoPreviewPanel
        asset={mockVideoAsset}
        onSave={(asset) => console.log('Saved:', asset)}
        onRegenerate={() => console.log('Regenerating')}
        onGenerateAudio={(asset) => console.log('Generating audio:', asset)}
        className="border-2 border-primary shadow-lg"
      />
    </div>
  );
};

/**
 * All Examples Component
 */
export const AllVideoPreviewExamples: React.FC = () => {
  return (
    <div className="space-y-12 pb-12">
      <BasicVideoPreview />
      <VideoPreviewWithActions />
      <VideoPreviewDisabledAudio />
      <VideoPreviewMinimal />
      <MultipleVideoPreviews />
      <VideoPreviewCustomStyling />
    </div>
  );
};

export default AllVideoPreviewExamples;
