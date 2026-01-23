import React from 'react';
import { useWorldBuilderSelectors, useWorldBuilderActions } from '../../../stores/worldBuilderStore';

const STEPS = [
  { id: 'foundations', label: 'Foundations', description: 'Basic world setup' },
  { id: 'rules', label: 'Rules', description: 'Physics, magic, technology' },
  { id: 'culture', label: 'Culture', description: 'Societies and conflicts' },
  { id: 'locations', label: 'Locations', description: 'Places and geography' },
  { id: 'synthesis', label: 'Synthesis', description: 'Final world summary' },
] as const;

interface StepNavigatorProps {
  onStepChange?: (step: string) => void;
}

export const StepNavigator: React.FC<StepNavigatorProps> = ({ onStepChange }) => {
  const { currentStep, completedSteps, isStepCompleted, canNavigateToStep } =
    useWorldBuilderSelectors();
  const { navigateToStep, validateStep } = useWorldBuilderActions();

  const handleStepClick = (stepId: string) => {
    if (canNavigateToStep(stepId)) {
      navigateToStep(stepId);
      onStepChange?.(stepId);
    }
  };

  return (
    <nav className="step-navigator" role="navigation" aria-label="World builder steps">
      <ul className="step-list">
        {STEPS.map((step, index) => {
          const isCompleted = isStepCompleted(step.id);
          const isCurrent = currentStep === step.id;
          const isAccessible = canNavigateToStep(step.id);
          const isValid = validateStep(step.id);

          return (
            <li key={step.id} className="step-item">
              <button
                className={`step-button ${isCompleted ? 'completed' : ''} ${
                  isCurrent ? 'current' : ''
                } ${!isAccessible ? 'disabled' : ''} ${!isValid ? 'invalid' : ''}`}
                onClick={() => handleStepClick(step.id)}
                disabled={!isAccessible}
                aria-current={isCurrent ? 'step' : undefined}
                aria-describedby={`step-${step.id}-description`}
              >
                <span className="step-number">{index + 1}</span>
                <span className="step-label">{step.label}</span>
                {isCompleted && <span className="step-checkmark">✓</span>}
                {!isValid && isCurrent && <span className="step-warning">⚠</span>}
              </button>
              <div id={`step-${step.id}-description`} className="step-description">
                {step.description}
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};