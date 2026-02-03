/**
 * GenerationProgressModal Example
 * 
 * Demonstrates the GenerationProgressModal component with simulated generation progress
 * through all pipeline stages (prompt → image → video → audio).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GenerationProgressModal, type GenerationType } from './GenerationProgressModal';
import type { GenerationProgress } from '@/types/generation';

/**
 * Example component demonstrating GenerationProgressModal usage
 */
export function GenerationProgressModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generationType, setGenerationType] = useState<GenerationType>('prompt');
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: '',
    stageProgress: 0,
    overallProgress: 0,
    estimatedTimeRemaining: 0,
    message: 'Initializing...',
    cancellable: true,
  });

  /**
   * Simulate successful generation through all stages
   */
  const simulateSuccessfulGeneration = async () => {
    setIsModalOpen(true);

    // Stage 1: Prompt Generation
    setGenerationType('prompt');
    setProgress({
      stage: 'Analyzing categories',
      stageProgress: 0,
      overallProgress: 0,
      estimatedTimeRemaining: 60000,
      message: 'Generating optimized prompt...',
      cancellable: true,
    });

    await delay(1000);

    setProgress({
      stage: 'Building prompt',
      stageProgress: 50,
      overallProgress: 12.5,
      estimatedTimeRemaining: 50000,
      message: 'Generating optimized prompt...',
      cancellable: true,
    });

    await delay(1000);

    setProgress({
      stage: 'Finalizing prompt',
      stageProgress: 100,
      overallProgress: 25,
      estimatedTimeRemaining: 45000,
      message: 'Prompt generation complete',
      cancellable: true,
    });

    await delay(500);

    // Stage 2: Image Generation
    setGenerationType('image');
    setProgress({
      stage: 'Initializing Flux Turbo',
      stageProgress: 0,
      overallProgress: 25,
      estimatedTimeRemaining: 40000,
      message: 'Creating image with Flux Turbo...',
      cancellable: true,
    });

    await delay(1000);

    for (let i = 1; i <= 5; i++) {
      setProgress({
        stage: `Processing step ${i}/5`,
        stageProgress: i * 20,
        overallProgress: 25 + (i * 5),
        estimatedTimeRemaining: 40000 - (i * 7000),
        message: 'Creating image with Flux Turbo...',
        cancellable: true,
      });
      await delay(800);
    }

    await delay(500);

    // Stage 3: Video Generation
    setGenerationType('video');
    setProgress({
      stage: 'Initializing LTX2 i2v',
      stageProgress: 0,
      overallProgress: 50,
      estimatedTimeRemaining: 25000,
      message: 'Generating video with LTX2 i2v...',
      cancellable: false,
    });

    await delay(1000);

    // Latent generation
    for (let i = 1; i <= 3; i++) {
      setProgress({
        stage: `Generating latent representation ${i}/3`,
        stageProgress: i * 16.67,
        overallProgress: 50 + (i * 4.17),
        estimatedTimeRemaining: 20000 - (i * 5000),
        message: 'Generating video with LTX2 i2v...',
        cancellable: false,
      });
      await delay(1000);
    }

    // Spatial upscaling
    for (let i = 1; i <= 3; i++) {
      setProgress({
        stage: `Spatial upscaling ${i}/3`,
        stageProgress: 50 + (i * 16.67),
        overallProgress: 62.5 + (i * 4.17),
        estimatedTimeRemaining: 10000 - (i * 3000),
        message: 'Generating video with LTX2 i2v...',
        cancellable: false,
      });
      await delay(1000);
    }

    await delay(500);

    // Stage 4: Audio Generation
    setGenerationType('audio');
    setProgress({
      stage: 'Initializing TTS',
      stageProgress: 0,
      overallProgress: 75,
      estimatedTimeRemaining: 8000,
      message: 'Creating audio with TTS...',
      cancellable: true,
    });

    await delay(1000);

    for (let i = 1; i <= 4; i++) {
      setProgress({
        stage: `Generating audio ${i}/4`,
        stageProgress: i * 25,
        overallProgress: 75 + (i * 6.25),
        estimatedTimeRemaining: 8000 - (i * 2000),
        message: 'Creating audio with TTS...',
        cancellable: true,
      });
      await delay(800);
    }

    // Complete
    setProgress({
      stage: 'Complete',
      stageProgress: 100,
      overallProgress: 100,
      estimatedTimeRemaining: 0,
      message: 'Generation complete',
      cancellable: false,
    });
  };

  /**
   * Simulate generation with error
   */
  const simulateErrorGeneration = async () => {
    setIsModalOpen(true);

    // Start with prompt
    setGenerationType('prompt');
    setProgress({
      stage: 'Generating prompt',
      stageProgress: 50,
      overallProgress: 12.5,
      estimatedTimeRemaining: 50000,
      message: 'Generating optimized prompt...',
      cancellable: true,
    });

    await delay(2000);

    // Move to image
    setGenerationType('image');
    setProgress({
      stage: 'Initializing Flux Turbo',
      stageProgress: 20,
      overallProgress: 30,
      estimatedTimeRemaining: 35000,
      message: 'Creating image with Flux Turbo...',
      cancellable: true,
    });

    await delay(2000);

    // Error during image generation
    setProgress({
      stage: 'Error',
      stageProgress: 20,
      overallProgress: 30,
      estimatedTimeRemaining: 0,
      message: 'Error: Failed to connect to ComfyUI server. The server may be offline or unreachable.',
      cancellable: false,
    });
  };

  /**
   * Simulate cancellable generation
   */
  const simulateCancellableGeneration = async () => {
    setIsModalOpen(true);

    setGenerationType('video');
    setProgress({
      stage: 'Generating video',
      stageProgress: 30,
      overallProgress: 60,
      estimatedTimeRemaining: 20000,
      message: 'Generating video with LTX2 i2v...',
      cancellable: true,
    });
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    console.log('Generation cancelled');
    setIsModalOpen(false);
    resetProgress();
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    console.log('Modal closed');
    setIsModalOpen(false);
    resetProgress();
  };

  /**
   * Handle retry
   */
  const handleRetry = () => {
    console.log('Retrying generation');
    simulateSuccessfulGeneration();
  };

  /**
   * Reset progress state
   */
  const resetProgress = () => {
    setProgress({
      stage: '',
      stageProgress: 0,
      overallProgress: 0,
      estimatedTimeRemaining: 0,
      message: 'Initializing...',
      cancellable: true,
    });
  };

  /**
   * Delay helper
   */
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="p-8 space-y-6">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">GenerationProgressModal Example</h1>
        <p className="text-muted-foreground mb-8">
          Demonstrates the generation progress modal with simulated pipeline execution
          through all stages: prompt → image → video → audio.
        </p>

        <div className="space-y-4">
          {/* Successful Generation */}
          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Successful Generation</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Simulates a complete generation through all pipeline stages with progress updates,
              timing information, and stage transitions.
            </p>
            <Button onClick={simulateSuccessfulGeneration} className="w-full sm:w-auto">
              Start Complete Pipeline
            </Button>
          </div>

          {/* Generation with Error */}
          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Generation with Error</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Simulates a generation that fails during the image generation stage with an error
              message and retry option.
            </p>
            <Button onClick={simulateErrorGeneration} variant="destructive" className="w-full sm:w-auto">
              Simulate Error
            </Button>
          </div>

          {/* Cancellable Generation */}
          <div className="p-6 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-2">Cancellable Generation</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Demonstrates a generation in progress with the cancel button enabled.
              Click cancel to stop the generation.
            </p>
            <Button onClick={simulateCancellableGeneration} variant="outline" className="w-full sm:w-auto">
              Start Cancellable Generation
            </Button>
          </div>

          {/* Current Status Display */}
          <div className="p-6 border rounded-lg bg-muted">
            <h2 className="text-xl font-semibold mb-4">Current Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Generation Type:</span>
                <div className="mt-1 text-muted-foreground capitalize">{generationType}</div>
              </div>
              <div>
                <span className="font-medium">Overall Progress:</span>
                <div className="mt-1 text-muted-foreground">{Math.round(progress.overallProgress)}%</div>
              </div>
              <div>
                <span className="font-medium">Stage Progress:</span>
                <div className="mt-1 text-muted-foreground">{Math.round(progress.stageProgress)}%</div>
              </div>
              <div>
                <span className="font-medium">Current Stage:</span>
                <div className="mt-1 text-muted-foreground">{progress.stage || 'None'}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="font-medium">Message:</span>
                <div className="mt-1 text-muted-foreground">{progress.message}</div>
              </div>
              <div>
                <span className="font-medium">Cancellable:</span>
                <div className="mt-1 text-muted-foreground">{progress.cancellable ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <span className="font-medium">Est. Remaining:</span>
                <div className="mt-1 text-muted-foreground">
                  {progress.estimatedTimeRemaining > 0
                    ? `${Math.round(progress.estimatedTimeRemaining / 1000)}s`
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GenerationProgressModal
        isOpen={isModalOpen}
        generationType={generationType}
        progress={progress}
        onCancel={handleCancel}
        onClose={handleClose}
        onRetry={handleRetry}
      />
    </div>
  );
}

export default GenerationProgressModalExample;
