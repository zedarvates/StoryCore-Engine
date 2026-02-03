/**
 * WizardHeader Component
 * 
 * Displays wizard header information including:
 * - Progress indicator (current step / total steps)
 * - Step title and description
 * - Mode toggle (Beginner/Advanced)
 * 
 * Requirements: 9.1, 13.4, 13.5
 */

import React from 'react';

export interface WizardHeaderProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription?: string;
  mode: 'beginner' | 'advanced';
  onModeToggle: (mode: 'beginner' | 'advanced') => void;
}

/**
 * WizardHeader Component
 * Renders the wizard header with progress and mode controls
 */
export const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentStep,
  totalSteps,
  stepTitle,
  stepDescription,
  mode,
  onModeToggle,
}) => {
  // Calculate progress percentage
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="wizard-header">
      <div className="wizard-header__container">
        {/* Progress Section */}
        <div className="wizard-header__progress-section">
          <div className="wizard-header__progress-info">
            <span className="wizard-header__step-counter" aria-label={`Step ${currentStep} of ${totalSteps}`}>
              Step {currentStep} of {totalSteps}
            </span>
            <span className="wizard-header__progress-percentage">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>

          <div className="wizard-header__progress-bar" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="wizard-header__progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Title Section */}
        <div className="wizard-header__title-section">
          <h1 className="wizard-header__title">{stepTitle}</h1>
          {stepDescription && (
            <p className="wizard-header__description">{stepDescription}</p>
          )}
        </div>

        {/* Mode Toggle Section */}
        <div className="wizard-header__mode-section">
          <span className="wizard-header__mode-label">Mode:</span>
          <div className="wizard-header__mode-toggle" role="group" aria-label="Wizard mode selection">
            <button
              type="button"
              className={`wizard-header__mode-button ${mode === 'beginner' ? 'wizard-header__mode-button--active' : ''}`}
              onClick={() => onModeToggle('beginner')}
              aria-pressed={mode === 'beginner'}
            >
              <svg
                className="wizard-header__mode-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 2L10.5 6.5L15 7L11.5 10.5L12.5 15L8 12.5L3.5 15L4.5 10.5L1 7L5.5 6.5L8 2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Beginner
            </button>
            <button
              type="button"
              className={`wizard-header__mode-button ${mode === 'advanced' ? 'wizard-header__mode-button--active' : ''}`}
              onClick={() => onModeToggle('advanced')}
              aria-pressed={mode === 'advanced'}
            >
              <svg
                className="wizard-header__mode-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 1V15M1 8H15M3 3L13 13M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Advanced
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .wizard-header {
          width: 100%;
          padding: 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .wizard-header__container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Progress Section */
        .wizard-header__progress-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .wizard-header__progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .wizard-header__step-counter {
          opacity: 0.9;
        }

        .wizard-header__progress-percentage {
          opacity: 0.9;
        }

        .wizard-header__progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
        }

        .wizard-header__progress-fill {
          height: 100%;
          background: #ffffff;
          border-radius: 4px;
          transition: width 0.3s ease;
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
        }

        /* Title Section */
        .wizard-header__title-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .wizard-header__title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
        }

        .wizard-header__description {
          font-size: 1rem;
          margin: 0;
          opacity: 0.9;
          line-height: 1.5;
        }

        /* Mode Section */
        .wizard-header__mode-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .wizard-header__mode-label {
          font-size: 0.875rem;
          font-weight: 500;
          opacity: 0.9;
        }

        .wizard-header__mode-toggle {
          display: flex;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 0.5rem;
          padding: 0.25rem;
          gap: 0.25rem;
        }

        .wizard-header__mode-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #ffffff;
          background: transparent;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .wizard-header__mode-button:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .wizard-header__mode-button:focus-visible {
          outline: 3px solid rgba(255, 255, 255, 0.8);
          outline-offset: 3px;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2);
        }

        .wizard-header__mode-button--active {
          background: #ffffff;
          color: #667eea;
        }

        .wizard-header__mode-button--active:hover {
          background: #ffffff;
        }

        .wizard-header__mode-icon {
          flex-shrink: 0;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .wizard-header {
            padding: 1.5rem 1rem;
          }

          .wizard-header__title {
            font-size: 1.5rem;
          }

          .wizard-header__description {
            font-size: 0.875rem;
          }

          .wizard-header__mode-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .wizard-header__mode-toggle {
            width: 100%;
          }

          .wizard-header__mode-button {
            flex: 1;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .wizard-header__progress-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default WizardHeader;
