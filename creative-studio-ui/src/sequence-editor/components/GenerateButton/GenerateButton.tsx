/**
 * GenerateButton Component
 * Button to generate sequence from timeline with status feedback.
 * Requirements: 7.1, 7.6
 */

import React, { useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { setGenerationStatus } from '../../store/slices/projectSlice';
import { executeGenerationPipeline, validateProjectForGeneration, type ProjectData } from '../../services/storycoreService';
import './GenerateButton.css';

export const GenerateButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const { shots, tracks } = useAppSelector((state) => state.timeline);
  const { generationStatus, metadata, settings } = useAppSelector((state) => state.project);
  
  const canGenerate = shots.length > 0 && tracks.length > 0;
  const isGenerating = generationStatus.state === 'processing';
  
  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isGenerating) return;
    
    // Prepare project data
    const projectData: ProjectData = {
      name: metadata?.name || 'Untitled Project',
      shots: shots.map(shot => ({
        id: shot.id,
        prompt: shot.prompt,
        parameters: shot.parameters,
        referenceImages: shot.referenceImages.map(img => img.url),
      })),
      settings: {
        resolution: settings.resolution,
        fps: settings.fps,
        format: settings.format,
      },
    };

    // Validate project before generation
    const validation = validateProjectForGeneration(projectData);
    if (!validation.valid) {
      dispatch(setGenerationStatus({
        state: 'error',
        error: validation.errors.join(', '),
      }));
      return;
    }

    // Set to processing state
    dispatch(setGenerationStatus({
      state: 'processing',
      stage: 'grid',
      progress: 0,
    }));
    
    try {
      // Execute pipeline with progress updates
      const result = await executeGenerationPipeline(projectData, (progress) => {
        dispatch(setGenerationStatus({
          state: 'processing',
          stage: progress.stage,
          progress: progress.progress,
        }));
      });

      if (result.success) {
        dispatch(setGenerationStatus({
          state: 'complete',
          progress: 100,
        }));
        
        // Reset to idle after 3 seconds
        setTimeout(() => {
          dispatch(setGenerationStatus({
            state: 'idle',
          }));
        }, 3000);
      } else {
        dispatch(setGenerationStatus({
          state: 'error',
          error: result.error || 'Generation failed',
        }));
      }
    } catch (error) {
      dispatch(setGenerationStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [canGenerate, isGenerating, dispatch, shots, metadata, settings]);

  const handleCancel = useCallback(() => {
    dispatch(setGenerationStatus({
      state: 'idle',
    }));
  }, [dispatch]);

  const getButtonText = () => {
    switch (generationStatus.state) {
      case 'processing':
        return `Generating (${generationStatus.stage})...`;
      case 'complete':
        return 'Generated!';
      case 'error':
        return 'Error';
      default:
        return 'Generate Sequence';
    }
  };

  const getButtonIcon = () => {
    switch (generationStatus.state) {
      case 'complete':
        return '✓';
      case 'error':
        return '!';
      default:
        return '▶';
    }
  };

  return (
    <div className="generate-button-container" data-testid="generate-button-container">
      <button
        className={`generate-button ${generationStatus.state}`}
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        aria-busy={isGenerating}
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
              className="progress-fill" 
              style={{ width: `${generationStatus.progress || 0}%` }}
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
          Add shots and tracks to generate
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
