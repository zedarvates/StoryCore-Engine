/**
 * WizardNavigation Component
 * 
 * Provides navigation controls for the wizard including:
 * - Back/Next buttons with validation-based enabled/disabled states
 * - Skip button for optional steps
 * - Save Draft button with last saved timestamp
 * - Navigation action triggers
 * 
 * Requirements: 9.2, 9.4, 9.5, 9.7
 */

import React from 'react';
import type { WizardNavigationProps } from '../../types/wizard';

/**
 * WizardNavigation Component
 * Renders navigation buttons and handles wizard step navigation
 */
export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  totalSteps,
  canGoNext,
  canGoBack,
  canSkip,
  onNext,
  onBack,
  onSkip,
  onSaveDraft,
  onSubmit,
  onCancel,
  lastSaved,
}) => {
  // Format last saved timestamp
  const formatLastSaved = (date?: Date): string => {
    if (!date) return 'Not saved yet';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="wizard-navigation">
      <div className="wizard-navigation__container">
        {/* Left side: Back button */}
        <div className="wizard-navigation__left">
          {canGoBack && (
            <button
              type="button"
              className="wizard-navigation__button wizard-navigation__button--back"
              onClick={onBack}
              aria-label="Go to previous step"
            >
              <svg
                className="wizard-navigation__icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12.5 15L7.5 10L12.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
          )}
        </div>

        {/* Center: Save Draft button and status */}
        <div className="wizard-navigation__center">
          <button
            type="button"
            className="wizard-navigation__button wizard-navigation__button--save"
            onClick={onSaveDraft}
            aria-label="Save current progress as draft"
          >
            <svg
              className="wizard-navigation__icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 17H5C4.46957 17 3.96086 16.7893 3.58579 16.4142C3.21071 16.0391 3 15.5304 3 15V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H12L17 8V15C17 15.5304 16.7893 16.0391 16.4142 16.4142C16.0391 16.7893 15.5304 17 15 17Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 17V11H7V17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 3V8H12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Save Draft
          </button>
          
          <span className="wizard-navigation__save-status" aria-live="polite">
            {formatLastSaved(lastSaved)}
          </span>
        </div>

        {/* Right side: Skip and Next buttons */}
        <div className="wizard-navigation__right">
          {canSkip && (
            <button
              type="button"
              className="wizard-navigation__button wizard-navigation__button--skip"
              onClick={onSkip}
              aria-label="Skip this optional step"
            >
              Skip
            </button>
          )}
          
          <button
            type="button"
            className="wizard-navigation__button wizard-navigation__button--next"
            onClick={() => {
              if (currentStep < totalSteps) {
                onNext?.();
              } else {
                // Call onSubmit at the last step
                const submitEvent = new CustomEvent('wizard-submit');
                window.dispatchEvent(submitEvent);
              }
            }}
            disabled={!canGoNext}
            aria-label={currentStep < totalSteps ? 'Go to next step' : 'Complete wizard'}
          >
            {currentStep < totalSteps ? 'Next' : 'Complete'}
            {currentStep < totalSteps && (
              <svg
                className="wizard-navigation__icon"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.5 15L12.5 10L7.5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .wizard-navigation {
          width: 100%;
          padding: 1.5rem 2rem;
          background: #ffffff;
          border-top: 1px solid #e5e7eb;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
        }

        .wizard-navigation__container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .wizard-navigation__left,
        .wizard-navigation__right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .wizard-navigation__left {
          justify-content: flex-start;
        }

        .wizard-navigation__right {
          justify-content: flex-end;
        }

        .wizard-navigation__center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          flex: 0 0 auto;
        }

        .wizard-navigation__button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          font-weight: 500;
          border-radius: 0.5rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .wizard-navigation__button:focus-visible {
          outline: 3px solid #3b82f6;
          outline-offset: 3px;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
        }

        .wizard-navigation__button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .wizard-navigation__button--back {
          background: #f3f4f6;
          color: #374151;
        }

        .wizard-navigation__button--back:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .wizard-navigation__button--save {
          background: #f9fafb;
          color: #6b7280;
          border: 1px solid #e5e7eb;
        }

        .wizard-navigation__button--save:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .wizard-navigation__button--skip {
          background: transparent;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .wizard-navigation__button--skip:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .wizard-navigation__button--next {
          background: #3b82f6;
          color: #ffffff;
        }

        .wizard-navigation__button--next:hover:not(:disabled) {
          background: #2563eb;
        }

        .wizard-navigation__button--next:disabled {
          background: #93c5fd;
        }

        .wizard-navigation__icon {
          flex-shrink: 0;
        }

        .wizard-navigation__save-status {
          font-size: 0.875rem;
          color: #6b7280;
          text-align: center;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .wizard-navigation {
            padding: 1rem;
          }

          .wizard-navigation__container {
            flex-direction: column;
            gap: 1rem;
          }

          .wizard-navigation__left,
          .wizard-navigation__right,
          .wizard-navigation__center {
            width: 100%;
            justify-content: center;
          }

          .wizard-navigation__button {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default WizardNavigation;
