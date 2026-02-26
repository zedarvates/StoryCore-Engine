import React from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../stores/worldBuilderStore';

interface StepValidatorProps {
  step: string;
  showErrors?: boolean;
}

export const StepValidator: React.FC<StepValidatorProps> = ({ step, showErrors = true }) => {
  const { validateStep } = useWorldBuilderActions();

  const isValid = validateStep(step);

  if (!showErrors || isValid) {
    return null;
  }

  const getValidationMessage = (step: string): string => {
    switch (step) {
      case 'foundations':
        return 'Please provide world name, genre, and setting.';
      case 'rules':
        return 'Please define at least one physics rule.';
      case 'culture':
        return 'Please add at least one society.';
      case 'locations':
        return 'Please add at least one location.';
      case 'synthesis':
        return 'Please provide a summary and at least one theme.';
      default:
        return 'This step is incomplete.';
    }
  };

  return (
    <div className="step-validator error" role="alert">
      <span className="error-icon">⚠</span>
      <span className="error-message">{getValidationMessage(step)}</span>
    </div>
  );
};