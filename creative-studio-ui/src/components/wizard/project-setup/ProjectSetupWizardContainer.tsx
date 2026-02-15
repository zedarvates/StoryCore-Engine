/**
 * Project Setup Wizard Container
 * 
 * Specialized container for the Project Setup wizard with 2 steps only.
 * Handles navigation, validation, and step rendering for project setup.
 */

import React, { useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import { validateString, validateNonEmptyArray, validateArray, validateReactNode, validateFunction } from '@/utils/propValidator';
import { logger as Logger } from '@/utils/logger';
import type { ProjectSetupData } from './Step1ProjectInfo';
import './ProjectSetupWizardContainer.css';

interface ProjectSetupWizardContainerProps {
  title: string;
  steps: Array<{ id: string; title: string; description?: string }>;
  children: React.ReactNode;
  onCancel: () => void;
  onComplete?: () => void;
}

export function ProjectSetupWizardContainer({
  title,
  steps,
  children,
  onCancel,
  onComplete,
}: Readonly<ProjectSetupWizardContainerProps>) {
  // Validate props
  try {
    validateString(title, 'title');
    validateNonEmptyArray(validateArray(steps, 'steps'), 'steps');
    validateReactNode(children, 'children');
    validateFunction(onCancel, 'onCancel');
    if (onComplete) {
      validateFunction(onComplete, 'onComplete');
    }
  } catch (error) {
    Logger.error('ProjectSetupWizardContainer prop validation failed:', error);
    throw error;
  }

  const { currentStep, nextStep, previousStep } = useWizard<ProjectSetupData>();

  // Calculate progress
  const progress = (currentStep / steps.length) * 100;

  // Check if we can go to next step or complete
  const canGoNext = currentStep <= steps.length;
  const canGoPrevious = currentStep > 1;

  // Handle next step
  const handleNext = useCallback(() => {
    if (currentStep === steps.length) {
      // Last step - complete wizard
      onComplete?.();
    } else {
      nextStep();
    }
  }, [currentStep, steps.length, nextStep, onComplete]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (canGoPrevious) {
      previousStep();
    }
  }, [canGoPrevious, previousStep]);

  // Get current step info
  const currentStepInfo = useMemo(() => {
    return steps[currentStep - 1] || steps[0];
  }, [currentStep, steps]);

  return (
    <div className="project-setup-wizard-container">
      {/* Header */}
      <div className="project-setup-wizard-header">
        <div className="project-setup-wizard-header__content">
          <h1 className="project-setup-wizard-header__title">{title}</h1>
          <p className="project-setup-wizard-header__step-info">
            {currentStepInfo.title}
          </p>
          {currentStepInfo.description && (
            <p className="project-setup-wizard-header__description">
              {currentStepInfo.description}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="project-setup-wizard-header__progress">
          <div className="project-setup-wizard-header__progress-bar">
            {/* eslint-disable-next-line no-inline-styles -- CSS custom property requires inline style for dynamic value */}
            <div
              className="project-setup-wizard-header__progress-fill"
              style={{ '--progress-width': `${progress}%` } as React.CSSProperties}
            />
          </div>
          <p className="project-setup-wizard-header__progress-text">
            Step {currentStep} of {steps.length}
          </p>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="project-setup-wizard-steps" role="tablist" aria-label="Wizard steps">
        {steps.map((step, index) => {
          const isSelected = index + 1 === currentStep;
          const isCompleted = index + 1 < currentStep;
          return (
            <div
              key={step.id}
              role="tab"
              aria-label={`Step ${index + 1}: ${step.title}${isCompleted ? ' (completed)' : ''}`}
              className={`project-setup-wizard-step ${
                isSelected ? 'project-setup-wizard-step--active' : ''
              } ${isCompleted ? 'project-setup-wizard-step--completed' : ''}`}
            >
              <div className="project-setup-wizard-step__indicator">
                {isCompleted ? (
                  <Check className="project-setup-wizard-step__icon" aria-hidden="true" />
                ) : (
                  <span className="project-setup-wizard-step__number">{index + 1}</span>
                )}
              </div>
              <span className="project-setup-wizard-step__label">{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="project-setup-wizard-content">
        {children}
      </div>

      {/* Navigation */}
      <div className="project-setup-wizard-footer">
        <button
          className="project-setup-wizard-button project-setup-wizard-button--secondary"
          onClick={onCancel}
          aria-label="Cancel wizard"
          title="Cancel and close the wizard"
        >
          Cancel
        </button>

        <div className="project-setup-wizard-footer__spacer" />

        <button
          className="project-setup-wizard-button project-setup-wizard-button--secondary"
          onClick={handlePrevious}
          disabled={!canGoPrevious}
          aria-label={`Go to previous step (Step ${currentStep - 1} of ${steps.length})`}
          title={canGoPrevious ? `Go to step ${currentStep - 1}` : 'No previous step'}
        >
          <ChevronLeft className="project-setup-wizard-button__icon" aria-hidden="true" />
          Previous
        </button>

        <button
          className="project-setup-wizard-button project-setup-wizard-button--primary"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label={
            currentStep === steps.length
              ? 'Complete wizard'
              : `Go to next step (Step ${currentStep + 1} of ${steps.length})`
          }
          title={
            currentStep === steps.length
              ? 'Complete the wizard'
              : `Go to step ${currentStep + 1}`
          }
        >
          {currentStep === steps.length ? (
            <>
              Complete
              <Check className="project-setup-wizard-button__icon" aria-hidden="true" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="project-setup-wizard-button__icon" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
