/**
 * Wizard Dialog Component
 * 
 * Multi-step form container with navigation
 * Step progress indicator
 * Back/Next/Generate button logic
 * Loading state with progress display
 * Success/error message display with retry option
 * 
 * Requirements: 2.1, 2.4, 2.6, 2.8, 2.9, 2.10
 */

import React, { useState, useCallback, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { WizardStepIndicator, WizardStep } from './WizardStepIndicator';
import { WizardNavigation } from './WizardNavigation';
import './WizardDialog.css';

export interface WizardDialogProps {
  isOpen: boolean;
  title: string;
  steps: WizardStep[];
  currentStep: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onGenerate: () => Promise<void>;
  canGoNext: boolean;
  canGoPrevious: boolean;
  children: React.ReactNode;
}

interface GenerationState {
  isGenerating: boolean;
  progress: number;
  stage: string;
  error: string | null;
  success: boolean;
}

export function WizardDialog({
  isOpen,
  title,
  steps,
  currentStep,
  onClose,
  onNext,
  onPrevious,
  onGenerate,
  canGoNext,
  canGoPrevious,
  children,
}: WizardDialogProps) {
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    stage: '',
    error: null,
    success: false,
  });

  const isLastStep = currentStep === steps.length - 1;

  const handleGenerate = useCallback(async () => {
    setGenerationState({
      isGenerating: true,
      progress: 0,
      stage: 'Initializing...',
      error: null,
      success: false,
    });

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
          stage: prev.progress < 30 ? 'Preparing request...' :
                 prev.progress < 60 ? 'Generating content...' :
                 'Finalizing...',
        }));
      }, 500);

      await onGenerate();

      clearInterval(progressInterval);

      setGenerationState({
        isGenerating: false,
        progress: 100,
        stage: 'Complete',
        error: null,
        success: true,
      });

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setGenerationState({
        isGenerating: false,
        progress: 0,
        stage: '',
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false,
      });
    }
  }, [onGenerate, onClose]);

  const handleRetry = useCallback(() => {
    setGenerationState({
      isGenerating: false,
      progress: 0,
      stage: '',
      error: null,
      success: false,
    });
  }, []);

  // Listen for wizard-submit event from WizardNavigation
  useEffect(() => {
    const handleSubmitEvent = () => {
      console.log('[WizardDialog] Received wizard-submit event, calling handleGenerate');
      handleGenerate();
    };

    window.addEventListener('wizard-submit', handleSubmitEvent);
    return () => {
      window.removeEventListener('wizard-submit', handleSubmitEvent);
    };
  }, [handleGenerate]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="wizard-dialog-overlay" onClick={onClose}>
      <div className="wizard-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wizard-dialog-header">
          <h2 className="wizard-dialog-title">{title}</h2>
          <button
            className="wizard-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="wizard-dialog-steps">
          <WizardStepIndicator
            steps={steps}
            currentStep={currentStep}
            allowJumpToStep={false}
          />
        </div>

        {/* Content */}
        <div className="wizard-dialog-content">
          {generationState.isGenerating && (
            <div className="generation-loading">
              <Loader2 className="loading-spinner" size={48} />
              <div className="loading-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${generationState.progress}%` }}
                  />
                </div>
                <p className="progress-text">{generationState.stage}</p>
                <p className="progress-percentage">{generationState.progress}%</p>
              </div>
            </div>
          )}

          {generationState.error && (
            <div className="generation-error">
              <AlertCircle className="error-icon" size={48} />
              <h3 className="error-title">Generation Failed</h3>
              <p className="error-message">{generationState.error}</p>
              <button className="retry-button" onClick={handleRetry}>
                Try Again
              </button>
            </div>
          )}

          {generationState.success && (
            <div className="generation-success">
              <CheckCircle className="success-icon" size={48} />
              <h3 className="success-title">Generation Complete!</h3>
              <p className="success-message">Your content has been generated successfully.</p>
            </div>
          )}

          {!generationState.isGenerating && !generationState.error && !generationState.success && (
            <div className="wizard-form-content">
              {children}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!generationState.isGenerating && !generationState.success && (
          <div className="wizard-dialog-footer">
            <WizardNavigation
              currentStep={currentStep}
              totalSteps={steps.length}
              onPrevious={onPrevious}
              onNext={onNext}
              onCancel={onClose}
              onSubmit={handleGenerate}
              isSubmitting={false}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
            />
          </div>
        )}
      </div>
    </div>
  );
}
