import React, { useState } from 'react';
import type { WizardDefinition, ProjectContext } from '../../electron/configurationTypes';
import { useConfiguration } from './ConfigurationContext';
import { availableWizards } from './wizardDefinitions';
import './WizardLauncher.css';

interface WizardLauncherProps {
  projectId: string;
  onLaunchWizard: (wizardId: string, projectContext: ProjectContext) => void;
  onReturnToWorkspace?: () => void;
}

interface WizardButtonProps {
  wizard: WizardDefinition;
  isEnabled: boolean;
  onLaunch: () => void;
  tooltip: string;
}

const WizardButton: React.FC<WizardButtonProps> = ({ wizard, isEnabled, onLaunch, tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="wizard-button-container">
      <button
        className={`wizard-button ${isEnabled ? 'enabled' : 'disabled'}`}
        onClick={isEnabled ? onLaunch : undefined}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        disabled={!isEnabled}
        aria-label={`${wizard.name}: ${wizard.description}`}
      >
        <div className="wizard-icon">
          {wizard.icon ? (
            <img src={wizard.icon} alt={`${wizard.name} icon`} />
          ) : (
            <div className="default-icon">✨</div>
          )}
        </div>
        <div className="wizard-name">{wizard.name}</div>
      </button>

      {showTooltip && (
        <div className="wizard-tooltip">
          <div className="tooltip-title">{wizard.name}</div>
          <div className="tooltip-description">{wizard.description}</div>
          {!isEnabled && (
            <div className="tooltip-requirements">
              <strong>Requirements not met:</strong> {tooltip}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WizardLauncher: React.FC<WizardLauncherProps> = ({
  projectId,
  onLaunchWizard,
  onReturnToWorkspace
}) => {
  const { projectConfig, activeProject } = useConfiguration();
  const [activeWizardId, setActiveWizardId] = useState<string | null>(null);

  const checkWizardRequirements = (wizard: WizardDefinition): { isEnabled: boolean; tooltip: string } => {
    if (!wizard.requiredConfig || wizard.requiredConfig.length === 0) {
      return { isEnabled: true, tooltip: wizard.description };
    }

    if (!projectConfig) {
      return {
        isEnabled: false,
        tooltip: 'Configuration not available'
      };
    }

    const missingRequirements: string[] = [];

    for (const requirement of wizard.requiredConfig) {
      const parts = requirement.split('.');
      let current: any = projectConfig;

      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }

      // Check if the required configuration value exists and is not empty
      if (!current || (typeof current === 'string' && current.trim() === '') ||
          (Array.isArray(current) && current.length === 0) ||
          (typeof current === 'object' && Object.keys(current).length === 0)) {
        missingRequirements.push(requirement);
      }
    }

    if (missingRequirements.length === 0) {
      return { isEnabled: true, tooltip: wizard.description };
    } else {
      return {
        isEnabled: false,
        tooltip: `Missing required configuration: ${missingRequirements.join(', ')}`
      };
    }
  };

  const handleLaunchWizard = (wizardId: string) => {
    if (!projectConfig || !activeProject) {
      console.error('Project configuration or metadata not available');
      return;
    }

    const projectContext: ProjectContext = {
      projectId: projectConfig.projectId,
      projectName: activeProject.name,
      projectConfig
    };

    onLaunchWizard(wizardId, projectContext);
    setActiveWizardId(wizardId);
  };

  const handleReturnToWorkspace = () => {
    setActiveWizardId(null);
    if (onReturnToWorkspace) {
      onReturnToWorkspace();
    }
  };

  if (activeWizardId) {
    const activeWizard = availableWizards.find(w => w.id === activeWizardId);
    return (
      <div className="wizard-launcher">
        <div className="wizard-active-state">
          <h3 className="wizard-launcher-title">Wizard Active</h3>
          <div className="active-wizard-info">
            <div className="wizard-icon">
              {activeWizard?.icon ? (
                <img src={activeWizard.icon} alt={`${activeWizard.name} icon`} />
              ) : (
                <div className="default-icon">✨</div>
              )}
            </div>
            <div className="active-wizard-details">
              <div className="wizard-name">{activeWizard?.name}</div>
              <div className="wizard-description">{activeWizard?.description}</div>
              <p>Wizard is running. Use the navigation to return to the workspace.</p>
            </div>
          </div>
          <button
            className="return-to-workspace-btn"
            onClick={handleReturnToWorkspace}
          >
            Return to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-launcher">
      <h3 className="wizard-launcher-title">Creative Wizards</h3>
      <div className="wizard-grid">
        {availableWizards.map((wizard) => {
          const { isEnabled, tooltip } = checkWizardRequirements(wizard);
          return (
            <WizardButton
              key={wizard.id}
              wizard={wizard}
              isEnabled={isEnabled}
              onLaunch={() => handleLaunchWizard(wizard.id)}
              tooltip={tooltip}
            />
          );
        })}
      </div>
    </div>
  );
};

export default WizardLauncher;