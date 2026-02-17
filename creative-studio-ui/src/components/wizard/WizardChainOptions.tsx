/**
 * WizardChainOptions Component
 * 
 * Displays wizard chain options in the completion step allowing users to:
 * - See upcoming wizards in the chain
 * - Launch the next wizard in the chain
 * - Skip or continue the chain
 * 
 * Part of the Dashboard Wizards & Addons Enhancement
 */

import React, { useState, useCallback } from 'react';

export interface WizardChainOption {
  wizardType: string;
  label: string;
  description?: string;
  icon?: string;
  autoTrigger?: boolean;
}

export interface WizardChainOptionsProps {
  isChained: boolean;
  triggeredWizards: WizardChainOption[];
  currentChainIndex: number;
  onLaunchNext?: (wizard: WizardChainOption) => void;
  onSkipChain?: () => void;
  onContinue?: () => void;
  isLoading?: boolean;
}

export const WizardChainOptions: React.FC<WizardChainOptionsProps> = ({
  isChained,
  triggeredWizards,
  currentChainIndex,
  onLaunchNext,
  onSkipChain,
  onContinue,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const remainingWizards = triggeredWizards.slice(currentChainIndex);
  const nextWizard = remainingWizards[0];

  if (!isChained || remainingWizards.length === 0) {
    return null;
  }

  const handleLaunchNext = useCallback(() => {
    if (nextWizard && onLaunchNext) {
      onLaunchNext(nextWizard);
    }
  }, [nextWizard, onLaunchNext]);

  return (
    <div className="wizard-chain-options">
      <div className="wizard-chain-options__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="wizard-chain-options__title">
          <span>Continue with More Wizards</span>
        </div>
        <button
          type="button"
          className="wizard-chain-options__toggle"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="wizard-chain-options__content">
          {nextWizard && (
            <div className="wizard-chain-options__next">
              <span className="wizard-chain-options__label">Next:</span>
              <div className="wizard-chain-options__wizard-card">
                <div className="wizard-chain-options__wizard-label">{nextWizard.label}</div>
                {nextWizard.description && (
                  <div className="wizard-chain-options__wizard-desc">{nextWizard.description}</div>
                )}
              </div>
            </div>
          )}

          <div className="wizard-chain-options__progress">
            <span className="wizard-chain-options__progress-text">
              {remainingWizards.length} wizard{remainingWizards.length > 1 ? 's' : ''} remaining
            </span>
          </div>

          <div className="wizard-chain-options__actions">
            <button
              type="button"
              className="wizard-chain-options__button wizard-chain-options__button--primary"
              onClick={handleLaunchNext}
              disabled={isLoading || !nextWizard}
            >
              {isLoading ? 'Loading...' : `Launch ${nextWizard?.label || 'Next Wizard'}`}
            </button>
            <button
              type="button"
              className="wizard-chain-options__button wizard-chain-options__button--secondary"
              onClick={onSkipChain}
              disabled={isLoading}
            >
              Skip Chain
            </button>
            <button
              type="button"
              className="wizard-chain-options__button wizard-chain-options__button--text"
              onClick={onContinue}
              disabled={isLoading}
            >
              Finish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WizardChainOptions;