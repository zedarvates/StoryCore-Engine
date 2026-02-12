/**
 * Video Generation Button and Dialog Example
 * 
 * Demonstrates the usage of VideoGenerationButton and VideoGenerationDialog components
 * in different states and configurations.
 */

import React, { useState } from 'react';
import { VideoGenerationButton } from './VideoGenerationButton';
import { VideoGenerationDialog } from './VideoGenerationDialog';
import { useGenerationStore } from '../../stores/generationStore';
import type { GeneratedAsset } from '../../types/generation';

/**
 * Example: Basic Video Generation Button with Dialog
 */
export const BasicVideoGenerationButton: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Mock source image
  const mockSourceImage: GeneratedAsset = {
    id: 'image-1',
    type: 'image',
    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    metadata: {
      generationParams: {
        prompt: 'A beautiful landscape',
        width: 1024,
        height: 1024,
      },
      fileSize: 1024000,
      dimensions: { width: 1024, height: 1024 },
      format: 'png',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Basic Video Generation Button with Dialog</h2>
      <VideoGenerationButton 
        onClick={() => setIsDialogOpen(true)}
      />
      <VideoGenerationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        sourceImage={mockSourceImage}
      />
    </div>
  );
};

/**
 * Example: Video Generation Button with Pipeline State
 */
export const VideoGenerationButtonWithPipeline: React.FC = () => {
  const { currentPipeline } = useGenerationStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const imageStage = currentPipeline?.stages.image;
  const videoStage = currentPipeline?.stages.video;
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Video Generation Button with Pipeline State</h2>
      
      <div className="space-y-2">
        <p>Image Stage: {imageStage?.status || 'No pipeline'}</p>
        <p>Video Stage: {videoStage?.status || 'No pipeline'}</p>
      </div>
      
      <VideoGenerationButton 
        onClick={() => setIsDialogOpen(true)}
      />
      
      {isDialogOpen && (
        <div className="p-4 border rounded">
          Video generation dialog would open here
          <button onClick={() => setIsDialogOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

/**
 * Example: Video Generation Button States
 */
export const VideoGenerationButtonStates: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Video Generation Button States</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Disabled (Image not completed)</h3>
          <VideoGenerationButton 
            onClick={() => {}}
            disabled={true}
            disabledReason="Complete image generation first"
          />
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Enabled (Ready to generate)</h3>
          <VideoGenerationButton 
            onClick={() => console.log('Generate video')}
          />
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Generating</h3>
          <VideoGenerationButton 
            onClick={() => {}}
            isGenerating={true}
          />
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Custom Disabled Reason</h3>
          <VideoGenerationButton 
            onClick={() => {}}
            disabled={true}
            disabledReason="ComfyUI service is not available"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Example: Video Generation Button in Toolbar
 */
export const VideoGenerationButtonInToolbar: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Video Generation Button in Toolbar</h2>
      
      <div className="flex gap-2 p-2 border rounded bg-gray-50">
        <button className="px-4 py-2 border rounded">Prompt</button>
        <button className="px-4 py-2 border rounded">Image</button>
        <VideoGenerationButton 
          onClick={() => setIsDialogOpen(true)}
          className="flex-shrink-0"
        />
        <button className="px-4 py-2 border rounded" disabled>Audio</button>
      </div>
      
      {isDialogOpen && (
        <div className="p-4 border rounded">
          Video generation dialog would open here
          <button onClick={() => setIsDialogOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
};

/**
 * Example: Complete Pipeline Flow
 */
export const CompletePipelineFlow: React.FC = () => {
  const { currentPipeline, startPipeline, completeStage } = useGenerationStore();
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  
  const handleStartPipeline = () => {
    startPipeline();
    // Simulate prompt completion
    setTimeout(() => {
      completeStage('prompt', {
        text: 'A beautiful sunset over mountains',
        categories: { genre: 'landscape' },
        timestamp: Date.now(),
        editable: true,
      });
    }, 1000);
    
    // Simulate image completion
    setTimeout(() => {
      completeStage('image', {
        id: '1',
        type: 'image',
        url: '/generated/image.png',
        metadata: {
          generationParams: { width: 1024, height: 768 },
          fileSize: 2048000,
          format: 'png',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      });
    }, 3000);
  };
  
  const handleVideoGeneration = () => {
    setIsVideoDialogOpen(true);
    // Simulate video generation
    setTimeout(() => {
      completeStage('video', {
        id: '2',
        type: 'video',
        url: '/generated/video.mp4',
        metadata: {
          generationParams: { frameCount: 120, frameRate: 24 },
          fileSize: 10240000,
          format: 'mp4',
          duration: 5,
        },
        relatedAssets: ['1'],
        timestamp: Date.now(),
      });
      setIsVideoDialogOpen(false);
    }, 5000);
  };
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Complete Pipeline Flow</h2>
      
      <div className="space-y-2">
        <p>Pipeline Status: {currentPipeline ? 'Active' : 'Not started'}</p>
        {currentPipeline && (
          <>
            <p>Prompt: {currentPipeline.stages.prompt.status}</p>
            <p>Image: {currentPipeline.stages.image.status}</p>
            <p>Video: {currentPipeline.stages.video.status}</p>
          </>
        )}
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={handleStartPipeline}
          className="px-4 py-2 border rounded bg-blue-500 text-white"
          disabled={!!currentPipeline}
        >
          Start Pipeline
        </button>
        
        <VideoGenerationButton 
          onClick={handleVideoGeneration}
        />
      </div>
      
      {isVideoDialogOpen && (
        <div className="p-4 border rounded bg-yellow-50">
          Generating video... This will take a few seconds.
        </div>
      )}
    </div>
  );
};

/**
 * Example: All Examples Combined
 */
export const VideoGenerationExamples: React.FC = () => {
  return (
    <div className="space-y-8">
      <BasicVideoGenerationButton />
      <hr role="separator" aria-label="Séparateur de section" />
      <VideoGenerationButtonWithPipeline />
      <hr role="separator" aria-label="Séparateur de section" />
      <VideoGenerationButtonStates />
      <hr />
      <VideoGenerationButtonInToolbar />
      <hr />
      <CompletePipelineFlow />
    </div>
  );
};

export default VideoGenerationExamples;
