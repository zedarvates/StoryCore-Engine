import React from 'react';
import { useWorldBuilderSelectors } from '../../../stores/worldBuilderStore';

const TOTAL_STEPS = 5;

export const ProgressIndicator: React.FC = () => {
  const { completedSteps, currentStep, lastSaved } = useWorldBuilderSelectors();

  const progressPercentage = (completedSteps.size / TOTAL_STEPS) * 100;
  const currentStepIndex = ['foundations', 'rules', 'culture', 'locations', 'synthesis'].indexOf(currentStep) + 1;
  const roundedProgress = Math.round(progressPercentage);

  return (
    <div className="progress-indicator" role="progressbar" aria-valuenow={roundedProgress} aria-valuemax={100}>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progressPercentage}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="progress-text">
        <span className="progress-percentage">{Math.round(progressPercentage)}% Complete</span>
        <span className="progress-steps">
          Step {currentStepIndex} of {TOTAL_STEPS}
        </span>
      </div>
      {lastSaved && (
        <div className="last-saved">
          Last saved: {lastSaved.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};