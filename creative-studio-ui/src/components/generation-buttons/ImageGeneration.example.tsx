/**
 * Image Generation Example
 * 
 * Demonstrates the complete image generation workflow:
 * - ImageGenerationButton
 * - ImageGenerationDialog
 * - ImagePreviewPanel
 */

import React, { useState } from 'react';
import { ImageGenerationButton } from './ImageGenerationButton';
import { ImageGenerationDialog } from './ImageGenerationDialog';
import { ImagePreviewPanel } from './ImagePreviewPanel';
import type { GeneratedAsset } from '../../types/generation';

export const ImageGenerationExample: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedAsset | null>(null);
  
  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  const handleSave = (asset: GeneratedAsset) => {
    console.log('Saving asset:', asset);
    alert('Image saved successfully!');
  };
  
  const handleRegenerate = () => {
    setIsDialogOpen(true);
  };
  
  const handleGenerateVideo = (asset: GeneratedAsset) => {
    console.log('Generating video from image:', asset);
    alert('Video generation started!');
  };
  
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Image Generation Workflow</h1>
        <p className="text-muted-foreground mb-6">
          This example demonstrates the complete image generation workflow with button, dialog, and preview panel.
        </p>
      </div>
      
      {/* Image Generation Button */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Step 1: Trigger Image Generation</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Click the button to open the image generation dialog. The button is enabled only after prompt generation is complete.
        </p>
        <ImageGenerationButton onClick={handleOpenDialog} />
      </div>
      
      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        initialPrompt="A serene mountain landscape at sunset, with golden light reflecting off a crystal-clear lake"
      />
      
      {/* Image Preview Panel */}
      {generatedImage && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Step 2: Review Generated Image</h2>
          <p className="text-sm text-muted-foreground mb-4">
            View the generated image with metadata and proceed to video generation.
          </p>
          <ImagePreviewPanel
            asset={generatedImage}
            onSave={handleSave}
            onRegenerate={handleRegenerate}
            onGenerateVideo={handleGenerateVideo}
            canGenerateVideo={true}
          />
        </div>
      )}
      
      {/* Instructions */}
      <div className="border rounded-lg p-4 bg-muted/50">
        <h3 className="font-semibold mb-2">Workflow Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Complete prompt generation first (prerequisite)</li>
          <li>Click "Generate Image" button or press Ctrl+Shift+I</li>
          <li>Configure image parameters in the dialog</li>
          <li>Click "Generate Image" to start generation</li>
          <li>Review the generated image in the preview panel</li>
          <li>Save, regenerate, or proceed to video generation</li>
        </ol>
      </div>
      
      {/* Mock Data Button */}
      <div className="space-y-2">
        <h3 className="font-semibold">Testing:</h3>
        <Button
          variant="outline"
          onClick={() => {
            const mockImage: GeneratedAsset = {
              id: 'mock-image-1',
              type: 'image',
              url: 'https://via.placeholder.com/1024x1024/4A90E2/FFFFFF?text=Generated+Image',
              metadata: {
                generationParams: {
                  prompt: 'A serene mountain landscape at sunset',
                  negativePrompt: 'blurry, low quality',
                  steps: 20,
                  cfgScale: 7.5,
                  sampler: 'euler_ancestral',
                  scheduler: 'normal',
                  seed: 42,
                  width: 1024,
                  height: 1024,
                },
                fileSize: 2048000,
                dimensions: { width: 1024, height: 1024 },
                format: 'png',
              },
              relatedAssets: [],
              timestamp: Date.now(),
            };
            setGeneratedImage(mockImage);
          }}
        >
          Load Mock Image
        </Button>
      </div>
    </div>
  );
};

// For Storybook or standalone testing
export default ImageGenerationExample;
