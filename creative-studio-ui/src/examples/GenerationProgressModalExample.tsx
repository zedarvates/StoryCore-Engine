/**
 * GenerationProgressModal Example
 * 
 * Demonstrates the GenerationProgressModal component with simulated generation progress.
 * Shows all states: idle, in-progress stages, completion, and error handling.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GenerationProgressModal } from '@/components/GenerationProgressModal';
import type { GenerationStatus } from '@/types/projectDashboard';

/**
 * Example component demonstrating GenerationProgressModal usage
 */
export function GenerationProgressModalExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>({
    stage: 'idle',
    progress: 0,
  });

  /**
   * Simulate generation progress through all stages
   */
  const simulateGeneration = async () => {
    setIsModalOpen(true);
    const startTime = Date.now();
    const totalShots = 10;

    // Stage 1: Grid generation
    setStatus({
      stage: 'grid',
      progress: 0,
      currentShot: 0,
      totalShots,
      startTime,
      estimatedCompletion: startTime + 60000, // 1 minute estimate
    });

    await delay(2000);

    setStatus({
      stage: 'grid',
      progress: 20,
      currentShot: 0,
      totalShots,
      startTime,
      estimatedCompletion: startTime + 50000,
    });

    await delay(2000);

    // Stage 2: ComfyUI generation
    for (let i = 0; i < totalShots; i++) {
      setStatus({
        stage: 'comfyui',
        progress: 20 + Math.floor((i / totalShots) * 40),
        currentShot: i + 1,
        totalShots,
        startTime,
        estimatedCompletion: startTime + 40000 - (i * 3000),
      });
      await delay(1000);
    }

    // Stage 3: Promotion
    for (let i = 0; i < totalShots; i++) {
      setStatus({
        stage: 'promotion',
        progress: 60 + Math.floor((i / totalShots) * 15),
        currentShot: i + 1,
        totalShots,
        startTime,
        estimatedCompletion: startTime + 20000 - (i * 1500),
      });
      await delay(800);
    }

    // Stage 4: QA
    setStatus({
      stage: 'qa',
      progress: 75,
      currentShot: totalShots,
      totalShots,
      startTime,
      estimatedCompletion: startTime + 10000,
    });

    await delay(3000);

    setStatus({
      stage: 'qa',
      progress: 90,
      currentShot: totalShots,
      totalShots,
      startTime,
      estimatedCompletion: startTime + 5000,
    });

    await delay(2000);

    // Stage 5: Export
    setStatus({
      stage: 'export',
      progress: 90,
      currentShot: totalShots,
      totalShots,
      startTime,
      estimatedCompletion: startTime + 3000,
    });

    await delay(2000);

    // Complete
    setStatus({
      stage: 'complete',
      progress: 100,
      currentShot: totalShots,
      totalShots,
      startTime,
    });
  };

  /**
   * Simulate generation with error
   */
  const simulateError = async () => {
    setIsModalOpen(true);
    const startTime = Date.now();
    const totalShots = 10;

    // Start generation
    setStatus({
      stage: 'grid',
      progress: 0,
      currentShot: 0,
      totalShots,
      startTime,
    });

    await delay(2000);

    // Progress through grid
    setStatus({
      stage: 'grid',
      progress: 20,
      currentShot: 0,
      totalShots,
      startTime,
    });

    await delay(2000);

    // Start ComfyUI
    setStatus({
      stage: 'comfyui',
      progress: 25,
      currentShot: 1,
      totalShots,
      startTime,
    });

    await delay(2000);

    // Error during ComfyUI
    setStatus({
      stage: 'error',
      progress: 25,
      currentShot: 1,
      totalShots,
      error: 'Failed to connect to ComfyUI server. The server may be offline or unreachable.',
      startTime,
    });
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    ;
    setIsModalOpen(false);
    setStatus({
      stage: 'idle',
      progress: 0,
    });
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    ;
    setIsModalOpen(false);
    setStatus({
      stage: 'idle',
      progress: 0,
    });
  };

  /**
   * Handle retry
   */
  const handleRetry = () => {
    ;
    simulateGeneration();
  };

  /**
   * Delay helper
   */
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="p-8 space-y-4">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">GenerationProgressModal Example</h1>
        <p className="text-muted-foreground mb-6">
          Demonstrates the generation progress modal with simulated pipeline execution.
        </p>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Successful Generation</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Simulates a complete generation through all pipeline stages (grid, ComfyUI,
              promotion, QA, export) with progress updates.
            </p>
            <Button onClick={simulateGeneration}>
              Start Generation (Success)
            </Button>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Generation with Error</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Simulates a generation that fails during the ComfyUI stage with an error
              message and retry option.
            </p>
            <Button onClick={simulateError} variant="destructive">
              Start Generation (Error)
            </Button>
          </div>

          <div className="p-4 border rounded-lg bg-muted">
            <h2 className="text-lg font-semibold mb-2">Current Status</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Stage:</span> {status.stage}
              </div>
              <div>
                <span className="font-medium">Progress:</span> {status.progress}%
              </div>
              {status.currentShot !== undefined && (
                <div>
                  <span className="font-medium">Shot:</span> {status.currentShot} /{' '}
                  {status.totalShots}
                </div>
              )}
              {status.error && (
                <div>
                  <span className="font-medium text-red-500">Error:</span> {status.error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <GenerationProgressModal
        isOpen={isModalOpen}
        status={status}
        onCancel={handleCancel}
        onClose={handleClose}
        onRetry={handleRetry}
      />
    </div>
  );
}

export default GenerationProgressModalExample;
