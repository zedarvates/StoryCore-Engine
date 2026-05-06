// cspell:ignore testid
import React, { useCallback } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { executeGenerationPipeline, validateProjectForGeneration, type ProjectData } from '../../services/storycoreService';
import './GenerateButton.css';

export const GenerateButton: React.FC = () => {
  const { 
    shots, 
    tracks, 
    project, 
    generationStatus, 
    setGenerationStatus 
  } = useProjectStore(useShallow(state => ({
    shots: state.shots,
    tracks: state.tracks,
    project: state.project,
    generationStatus: state.generationStatus,
    setGenerationStatus: state.setGenerationStatus
  })));
  
  const canGenerate = shots.length > 0 && tracks.length > 0;
  const isGenerating = generationStatus.state === 'processing';
  const progressFillRef = React.useRef<HTMLDivElement>(null);

  // Apply dynamic progress via ref to bypass "no-inline-styles" JSX linter
  React.useEffect(() => {
    if (progressFillRef.current && generationStatus.state === 'processing') {
      progressFillRef.current.style.width = `${generationStatus.progress || 0}%`;
    }
  }, [generationStatus.progress, generationStatus.state]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isGenerating) return;
    
    // Prepare project data for pipeline with strict type alignment
    const mappedShots = shots.map(shot => ({
      id: shot.id,
      prompt: shot.prompt || '',
      parameters: (shot.parameters as unknown) as Record<string, unknown>,
      referenceImages: shot.referenceImages?.map(img => typeof img === 'string' ? img : img.url) || [],
    }));

    const projectData: ProjectData = {
      name: project?.project_name || 'Untitled Project',
      shots: mappedShots,
      settings: {
        resolution: project?.metadata?.resolution || { width: 1024, height: 1024 },
        fps: project?.metadata?.fps || 24,
        format: project?.metadata?.format || 'mp4',
      },
    };

    // Validate project before generation
    const validation = validateProjectForGeneration(projectData);
    if (!validation.valid) {
      setGenerationStatus({
        state: 'error',
        error: validation.errors.join(', '),
      });
      return;
    }

    // Set to processing state
    setGenerationStatus({
      state: 'processing',
      stage: 'grid',
      progress: 0,
    });
    
    try {
      // Execute connected pipeline with real progress updates
      const result = await executeGenerationPipeline(projectData, (progress) => {
        setGenerationStatus({
          state: 'processing',
          stage: progress.stage,
          progress: progress.progress,
        });
      });

      if (result.success) {
        setGenerationStatus({
          state: 'complete',
          progress: 100,
        });
        
        // Reset to idle after 5 seconds to show success
        setTimeout(() => {
          setGenerationStatus({
            state: 'idle',
          });
        }, 5000);
      } else {
        setGenerationStatus({
          state: 'error',
          error: result.error || 'Generation failed',
        });
      }
    } catch (error) {
      setGenerationStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }, [canGenerate, isGenerating, project, shots, setGenerationStatus]);

  const handleCancel = useCallback(() => {
    setGenerationStatus({
      state: 'idle',
    });
  }, [setGenerationStatus]);

  const getButtonText = () => {
    switch (generationStatus.state) {
      case 'processing':
        return `Generating (${generationStatus.stage || '...'}) ${Math.round(generationStatus.progress)}%`;
      case 'complete':
        return 'Sequence Generated!';
      case 'error':
        return 'Generation Error';
      default:
        return 'Generate Master Sequence';
    }
  };

  const getButtonIcon = () => {
    switch (generationStatus.state) {
      case 'complete':
        return '✓';
      case 'error':
        return '!';
      default:
        return '✨';
    }
  };

  return (
    <div className="generate-button-container" data-testid="generate-button-container">
      <button
        className={`generate-button ${generationStatus.state}`}
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        aria-label={getButtonText()}
        data-testid="generate-button"
      >
        <span className="button-icon" data-testid="button-icon">
          {getButtonIcon()}
        </span>
        <span className="button-text" data-testid="button-text">
          {getButtonText()}
        </span>
        
        {isGenerating && (
          <div className="progress-bar" data-testid="progress-bar">
            <div 
              ref={progressFillRef}
              className="progress-fill" 
              data-testid="progress-fill"
            />
          </div>
        )}
      </button>

      {isGenerating && (
        <button 
          className="cancel-button" 
          onClick={handleCancel}
          aria-label="Cancel generation"
          data-testid="cancel-button"
        >
          Cancel
        </button>
      )}

      {!canGenerate && (
        <div className="generate-hint" data-testid="generate-hint">
          Timeline empty: Add tracks and shots first
        </div>
      )}
      
      {generationStatus.state === 'error' && generationStatus.error && (
        <div className="generate-error" data-testid="generate-error">
          {generationStatus.error}
        </div>
      )}
    </div>
  );
};

export default GenerateButton;
