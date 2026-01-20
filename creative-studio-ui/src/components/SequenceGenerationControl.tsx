/**
 * SequenceGenerationControl Component
 * 
 * Controls sequence generation pipeline execution with a "Generate Sequence" button
 * that is enabled only when all shots have valid prompts. Displays GenerationProgressModal
 * during generation to show detailed progress through the StoryCore pipeline.
 * 
 * Requirements: 2.3, 2.4, 3.1, 3.2
 */

import React, { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Sparkles, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { GenerationProgressModal } from './GenerationProgressModal';
import { useProject } from '../contexts/ProjectContext';
import type { GenerationResults } from '../types/projectDashboard';

// ============================================================================
// Component Props
// ============================================================================

export interface SequenceGenerationControlProps {
  /** Optional CSS class name */
  className?: string;
  /** Callback when generation completes successfully */
  onGenerationComplete?: (results: GenerationResults) => void;
  /** Callback when generation is cancelled */
  onGenerationCancel?: () => void;
}

// ============================================================================
// SequenceGenerationControl Component
// ============================================================================

/**
 * SequenceGenerationControl Component
 * 
 * Provides a control interface for triggering sequence generation through the
 * StoryCore pipeline. The "Generate Sequence" button is enabled only when all
 * shots have valid prompts (non-empty, 10-500 characters). During generation,
 * displays a progress modal with stage-by-stage indicators.
 * 
 * Requirements: 2.3, 2.4, 3.1, 3.2
 */
export const SequenceGenerationControl: React.FC<SequenceGenerationControlProps> = ({
  className = '',
  onGenerationComplete,
  onGenerationCancel,
}) => {
  // ============================================================================
  // Context
  // ============================================================================

  const {
    validateAllShots,
    getPromptCompletionStatus,
    generateSequence,
    cancelGeneration,
    generationStatus,
    isGenerating,
  } = useProject();

  // ============================================================================
  // Local State
  // ============================================================================

  const [showProgressModal, setShowProgressModal] = useState(false);

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Validate all shots to determine if generation can proceed
  // Requirements: 2.3, 2.4
  const validation = validateAllShots();
  const canGenerate = validation.valid && !isGenerating;
  
  // Get prompt completion status for display
  const completionStatus = getPromptCompletionStatus();

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Handle generate button click
   * Triggers the generation pipeline and shows progress modal
   * Requirements: 3.1, 3.2
   */
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    try {
      // Show progress modal
      setShowProgressModal(true);

      // Trigger generation through context
      const results = await generateSequence();

      if (results) {
        // Generation completed successfully
        onGenerationComplete?.(results);
      }
    } catch (error) {
      console.error('Generation error:', error);
    }
  }, [canGenerate, generateSequence, onGenerationComplete]);

  /**
   * Handle cancel button click in progress modal
   * Requirements: 8.5
   */
  const handleCancel = useCallback(() => {
    cancelGeneration();
    onGenerationCancel?.();
  }, [cancelGeneration, onGenerationCancel]);

  /**
   * Handle retry button click after error
   * Requirements: 3.7
   */
  const handleRetry = useCallback(() => {
    // Reset modal state and trigger generation again
    setShowProgressModal(false);
    setTimeout(() => {
      handleGenerate();
    }, 100);
  }, [handleGenerate]);

  /**
   * Handle close button click in progress modal
   */
  const handleCloseModal = useCallback(() => {
    setShowProgressModal(false);
  }, []);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  /**
   * Get button text based on generation state
   */
  const getButtonText = (): string => {
    if (isGenerating) {
      return 'Generating...';
    }
    if (!validation.valid) {
      return 'Fix Prompts to Generate';
    }
    return 'Generate Sequence';
  };

  /**
   * Get button icon based on generation state
   */
  const getButtonIcon = () => {
    if (isGenerating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return <Sparkles className="h-4 w-4" />;
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Sequence Generation
          </CardTitle>
          <CardDescription>
            Generate your complete sequence through the StoryCore pipeline
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Prompt Completion Status */}
          {/* Requirements: 2.4 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Prompt Status</p>
            <div className="flex items-center gap-2">
              <Badge
                variant={completionStatus.complete === completionStatus.total ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-3 w-3" />
                {completionStatus.complete} / {completionStatus.total} Complete
              </Badge>
              
              {completionStatus.incomplete > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {completionStatus.incomplete} Incomplete
                </Badge>
              )}
            </div>
          </div>

          {/* Validation Errors Alert */}
          {/* Requirements: 2.4 */}
          {!validation.valid && validation.invalidShots.length > 0 && (
            <Alert variant="destructive" role="alert" aria-live="polite">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                <p className="font-medium mb-2">
                  Cannot generate: {validation.invalidShots.length} shot(s) have invalid prompts
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {validation.invalidShots.slice(0, 3).map((shot) => (
                    <li key={shot.id}>
                      Shot {shot.id.slice(0, 8)}: {
                        shot.promptValidation?.errors[0]?.message || 'Invalid prompt'
                      }
                    </li>
                  ))}
                  {validation.invalidShots.length > 3 && (
                    <li className="text-muted-foreground">
                      ...and {validation.invalidShots.length - 3} more
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {validation.valid && completionStatus.total > 0 && !isGenerating && (
            <Alert role="status" aria-live="polite">
              <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
              <AlertDescription>
                All prompts are valid. Ready to generate sequence!
              </AlertDescription>
            </Alert>
          )}

          {/* Empty Project Alert */}
          {completionStatus.total === 0 && (
            <Alert role="status">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                No shots in project. Add shots to begin generation.
              </AlertDescription>
            </Alert>
          )}

          {/* Pipeline Information */}
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Pipeline Stages</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎨</span>
                <span>Master Coherence Sheet (3x3 grid)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span>ComfyUI Image Generation</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                <span>Promotion Engine Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <span>QA Analysis & Autofix</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <span>Export Package Creation</span>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          {/* Requirements: 2.3, 3.1 */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || completionStatus.total === 0}
            className="w-full"
            size="lg"
            aria-label={getButtonText()}
            aria-disabled={!canGenerate || completionStatus.total === 0}
          >
            {getButtonIcon()}
            <span className="ml-2">{getButtonText()}</span>
          </Button>

          {/* Generation Info */}
          {completionStatus.total > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              {validation.valid
                ? `Ready to generate ${completionStatus.total} shot${completionStatus.total !== 1 ? 's' : ''}`
                : 'Fix invalid prompts to enable generation'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generation Progress Modal */}
      {/* Requirements: 3.2, 8.1, 8.2, 8.3, 8.4, 8.5 */}
      <GenerationProgressModal
        isOpen={showProgressModal}
        status={generationStatus}
        onCancel={handleCancel}
        onClose={handleCloseModal}
        onRetry={handleRetry}
      />
    </>
  );
};

/**
 * Default export
 */
export default SequenceGenerationControl;
