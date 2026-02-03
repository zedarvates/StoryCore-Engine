/**
 * Generation Progress Component
 * 
 * Detailed progress display with step-by-step tracking,
 * time estimation, and cancellation support.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { setGenerationStatus } from '../../store/slices/projectSlice';
import type { GenerationStatus } from '../../types';
import './GenerationProgress.css';

// ============================================================================
// Constants - Using existing stage types from project
// ============================================================================

const STAGES: { 
  id: GenerationStatus['stage']; 
  name: string; 
  icon: string;
  description: string;
  weight: number;
}[] = [
  { id: 'grid', name: 'Grid Generation', icon: '🖼️', description: 'Generating image grid', weight: 0.35 },
  { id: 'promotion', name: 'Video Promotion', icon: '🎬', description: 'Converting to video', weight: 0.45 },
  { id: 'qa', name: 'Quality Check', icon: '🔍', description: 'Validating quality', weight: 0.10 },
  { id: 'export', name: 'Exporting', icon: '📤', description: 'Encoding final output', weight: 0.10 },
];

// ============================================================================
// Utility Functions
// ============================================================================

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================================================
// Component
// ============================================================================

export const GenerationProgress: React.FC = () => {
  const dispatch = useAppDispatch();
  const { generationStatus } = useAppSelector((state) => state.project);
  const [expanded, setExpanded] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Track elapsed time during generation
  useEffect(() => {
    if (generationStatus.state === 'processing') {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      const updateTime = () => {
        if (startTimeRef.current) {
          setElapsedTime((Date.now() - startTimeRef.current) / 1000);
        }
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      updateTime();
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      setElapsedTime(0);
      startTimeRef.current = null;
    }
  }, [generationStatus.state]);

  // Calculate overall progress
  const calculateOverallProgress = useCallback((): number => {
    if (generationStatus.state !== 'processing') {
      return generationStatus.progress || 0;
    }
    const currentStageIndex = STAGES.findIndex(s => s.id === generationStatus.stage);
    if (currentStageIndex === -1) return 0;
    const completedWeight = STAGES.slice(0, currentStageIndex).reduce((sum, stage) => sum + stage.weight, 0);
    const currentStageWeight = STAGES[currentStageIndex].weight;
    const currentProgress = (generationStatus.progress || 0) / 100;
    return Math.round((completedWeight + currentStageWeight * currentProgress) * 100);
  }, [generationStatus]);

  // Calculate estimated time remaining
  const estimateTimeRemaining = useCallback((): number => {
    if (generationStatus.state !== 'processing' || elapsedTime === 0) return 0;
    const overallProgress = calculateOverallProgress() / 100;
    if (overallProgress <= 0) return 0;
    const totalEstimated = elapsedTime / overallProgress;
    return Math.max(0, totalEstimated - elapsedTime);
  }, [generationStatus.state, elapsedTime, calculateOverallProgress]);

  // Handle cancellation - just set state to idle
  const handleCancel = useCallback(() => {
    dispatch(setGenerationStatus({ state: 'idle' }));
  }, [dispatch]);

  // Handle retry
  const handleRetry = useCallback(() => {
    dispatch(setGenerationStatus({ state: 'idle' }));
  }, [dispatch]);

  if (generationStatus.state === 'idle' && !expanded) {
    return null;
  }

  const overallProgress = calculateOverallProgress();
  const timeRemaining = estimateTimeRemaining();
  const currentStage = STAGES.find(s => s.id === generationStatus.stage);

  return (
    <div className={`generation-progress ${generationStatus.state}`}>
      {/* Header */}
      <div className="progress-header" onClick={() => setExpanded(!expanded)} role="button" tabIndex={0}>
        <div className="progress-title">
          <span className="progress-icon">
            {generationStatus.state === 'complete' && '✅'}
            {generationStatus.state === 'error' && '❌'}
            {generationStatus.state === 'processing' && '⚙️'}
            {generationStatus.state === 'idle' && '📽️'}
          </span>
          <span className="progress-label">
            {generationStatus.state === 'complete' && 'Generation Complete'}
            {generationStatus.state === 'error' && 'Generation Failed'}
            {generationStatus.state === 'processing' && 'Generating Sequence...'}
            {generationStatus.state === 'idle' && 'Generation Pipeline'}
          </span>
        </div>
        <div className="progress-meta">
          {generationStatus.state === 'processing' && (
            <><span className="progress-percentage">{overallProgress}%</span><span className="expand-icon">{expanded ? '▼' : '▶'}</span></>
          )}
          {generationStatus.state === 'complete' && <span className="completion-time">{formatTime(elapsedTime)}</span>}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="progress-content">
          {/* Overall Progress Bar */}
          <div className="overall-progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${overallProgress}%`, backgroundColor: generationStatus.state === 'error' ? '#e74c3c' : undefined }} />
            </div>
          </div>

          {/* Processing State Details */}
          {generationStatus.state === 'processing' && (
            <>
              <div className="current-stage">
                <div className="stage-icon">{currentStage?.icon}</div>
                <div className="stage-info">
                  <div className="stage-name">{currentStage?.name || 'Processing'}</div>
                  <div className="stage-description">{currentStage?.description}</div>
                </div>
                <div className="stage-progress">{generationStatus.progress}%</div>
              </div>
              <div className="stage-progress-bar">
                <div className="stage-progress-fill" style={{ width: `${generationStatus.progress}%` }} />
              </div>
              <div className="time-stats">
                <div className="time-stat"><span className="time-label">Elapsed</span><span className="time-value">{formatTime(elapsedTime)}</span></div>
                <div className="time-stat"><span className="time-label">Remaining</span><span className="time-value">{formatTime(timeRemaining)}</span></div>
                <div className="time-stat"><span className="time-label">Total</span><span className="time-value">{formatTime(elapsedTime + timeRemaining)}</span></div>
              </div>
              <div className="stages-timeline">
                {STAGES.map((stage) => {
                  const stageIndex = STAGES.findIndex(s => s.id === stage.id);
                  const currentIndex = STAGES.findIndex(s => s.id === generationStatus.stage);
                  const isComplete = stageIndex < currentIndex;
                  const isCurrent = stage.id === generationStatus.stage;
                  return (
                    <div key={stage.id} className={`timeline-stage ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
                      <div className="timeline-dot">{isComplete ? '✓' : isCurrent ? '●' : '○'}</div>
                      <div className="timeline-label">{stage.name}</div>
                    </div>
                  );
                })}
              </div>
              <div className="progress-actions">
                <button className="cancel-button" onClick={handleCancel} aria-label="Cancel generation">Cancel</button>
              </div>
            </>
          )}

          {/* Complete State */}
          {generationStatus.state === 'complete' && (
            <div className="complete-state">
              <div className="complete-icon">🎉</div>
              <div className="complete-message">Sequence generated successfully!</div>
              <div className="complete-stats">
                <div className="stat"><span className="stat-label">Duration</span><span className="stat-value">{formatTime(elapsedTime)}</span></div>
              </div>
            </div>
          )}

          {/* Error State */}
          {generationStatus.state === 'error' && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <div className="error-message">{generationStatus.error || 'An unknown error occurred'}</div>
              <div className="error-actions">
                <button className="retry-button" onClick={handleRetry} aria-label="Retry generation">Try Again</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GenerationProgress;

