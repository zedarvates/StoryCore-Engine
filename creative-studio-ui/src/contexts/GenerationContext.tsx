/**
 * GenerationContext
 * Manages the state and logic for media generation sequences including
 * grid generation, ComfyUI processing, QA checks, and export operations.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type GenerationPhase = 'idle' | 'running' | 'complete' | 'error';

export interface GenerationStatus {
  grid: GenerationPhase;
  comfyui: GenerationPhase;
  promotion: GenerationPhase;
  qa: GenerationPhase;
  export: GenerationPhase;
}

export interface GenerationContextType {
  generationStatus: GenerationStatus;
  generationProgress: number;
  isGenerating: boolean;
  generationError: string | null;
  generateSequence: () => Promise<void>;
  cancelGeneration: () => void;
  resetGeneration: () => void;
  updateStatus: (phase: keyof GenerationStatus, status: GenerationPhase) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

const INITIAL_STATUS: GenerationStatus = {
  grid: 'idle',
  comfyui: 'idle',
  promotion: 'idle',
  qa: 'idle',
  export: 'idle'
};

export const GenerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(INITIAL_STATUS);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStatus = useCallback((phase: keyof GenerationStatus, status: GenerationPhase) => {
    setGenerationStatus(prev => ({
      ...prev,
      [phase]: status
    }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setGenerationProgress(Math.min(100, Math.max(0, progress)));
  }, []);

  const setError = useCallback((error: string | null) => {
    setGenerationError(error);
  }, []);

  const generateSequence = useCallback(async () => {
    if (isGenerating) {
      console.warn('Generation already in progress');
      return;
    }

    // Reset state for new generation
    setGenerationStatus(INITIAL_STATUS);
    setGenerationProgress(0);
    setGenerationError(null);
    setIsGenerating(true);
    
    // Create abort controller for cancellation support
    abortControllerRef.current = new AbortController();

    try {
      // Phase 1: Grid Generation (0-20%)
      updateStatus('grid', 'running');
      setProgress(0);
      
      // Simulate grid generation - in production, this would call the grid generation API
      await simulateGenerationStep('grid', 0, 20, abortControllerRef.current.signal);
      
      updateStatus('grid', 'complete');
      setProgress(20);

      // Phase 2: ComfyUI Processing (20-50%)
      updateStatus('comfyui', 'running');
      
      await simulateGenerationStep('comfyui', 20, 50, abortControllerRef.current.signal);
      
      updateStatus('comfyui', 'complete');
      setProgress(50);

      // Phase 3: Promotion/Enhancement (50-70%)
      updateStatus('promotion', 'running');
      
      await simulateGenerationStep('promotion', 50, 70, abortControllerRef.current.signal);
      
      updateStatus('promotion', 'complete');
      setProgress(70);

      // Phase 4: QA Checks (70-85%)
      updateStatus('qa', 'running');
      
      await simulateGenerationStep('qa', 70, 85, abortControllerRef.current.signal);
      
      updateStatus('qa', 'complete');
      setProgress(85);

      // Phase 5: Export (85-100%)
      updateStatus('export', 'running');
      
      await simulateGenerationStep('export', 85, 100, abortControllerRef.current.signal);
      
      updateStatus('export', 'complete');
      setProgress(100);

      // Generation complete
      setIsGenerating(false);
      console.log('Generation sequence completed successfully');
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Generation was cancelled');
        setGenerationError(null);
      } else {
        console.error('Generation failed:', error);
        setGenerationError(error instanceof Error ? error.message : 'Unknown error occurred');
        
        // Mark the current phase as errored
        const currentPhase = getCurrentPhase(generationStatus);
        if (currentPhase) {
          updateStatus(currentPhase, 'error');
        }
      }
      setIsGenerating(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, [isGenerating, generationStatus, updateStatus]);

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setGenerationError(null);
    console.log('Generation cancelled');
  }, []);

  const resetGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = null;
    setGenerationStatus(INITIAL_STATUS);
    setGenerationProgress(0);
    setIsGenerating(false);
    setGenerationError(null);
  }, []);

  return (
    <GenerationContext.Provider value={{
      generationStatus,
      generationProgress,
      isGenerating,
      generationError,
      generateSequence,
      cancelGeneration,
      resetGeneration,
      updateStatus,
      setProgress,
      setError
    }}>
      {children}
    </GenerationContext.Provider>
  );
};

// Helper function to simulate generation steps
// In production, this would be replaced with actual API calls
async function simulateGenerationStep(
  _phase: keyof GenerationStatus,
  startProgress: number,
  endProgress: number,
  signal: AbortSignal
): Promise<void> {
  const steps = 10;
  const stepDuration = 100; // ms per step
  const progressRange = endProgress - startProgress;
  const progressPerStep = progressRange / steps;

  for (let i = 0; i < steps; i++) {
    // Check for cancellation
    if (signal.aborted) {
      throw new Error('Aborted');
    }

    // Simulate async work
    await new Promise(resolve => setTimeout(resolve, stepDuration));
    
    // Progress update would be handled by the component using setProgress
  }
}

// Helper to determine current active phase
function getCurrentPhase(status: GenerationStatus): keyof GenerationStatus | null {
  if (status.grid === 'running') return 'grid';
  if (status.comfyui === 'running') return 'comfyui';
  if (status.promotion === 'running') return 'promotion';
  if (status.qa === 'running') return 'qa';
  if (status.export === 'running') return 'export';
  return null;
}

export const useGeneration = () => {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
};

export default GenerationContext;
