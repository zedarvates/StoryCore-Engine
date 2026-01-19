/**
 * Wizard Launcher Component
 * 
 * Displays grid of 6 wizard cards with icons and descriptions
 * Shows service requirements (LLM, ComfyUI) for each wizard
 * Implements wizard selection handler
 * Adds connection status indicators
 * 
 * Requirements: 1.5
 */

import { useMemo, useEffect, useState } from 'react';
import type { WizardLauncherProps, WizardDefinition } from '../../types/configuration';
import { useProjectConfig } from '../../hooks/useConfigurationHooks';
import { checkWizardRequirements } from '../../data/wizardDefinitions';
import { WizardService } from '../../services/wizard/WizardService';
import { useAppStore } from '../../stores/useAppStore';
import './WizardLauncher.css';

interface ConnectionStatus {
  ollama: boolean;
  comfyui: boolean;
  checking: boolean;
}

export function WizardLauncher({
  availableWizards,
  onLaunchWizard,
}: WizardLauncherProps) {
  const projectConfig = useProjectConfig();
  const project = useAppStore((state) => state.project); // Get project data (Requirement 8.1, 8.2, 8.3)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    ollama: false,
    comfyui: false,
    checking: true,
  });

  // Check backend service connections on mount
  useEffect(() => {
    const checkConnections = async () => {
      setConnectionStatus(prev => ({ ...prev, checking: true }));
      
      const wizardService = new WizardService();
      
      const [ollamaStatus, comfyuiStatus] = await Promise.all([
        wizardService.checkOllamaConnection().catch(() => ({ connected: false })),
        wizardService.checkComfyUIConnection().catch(() => ({ connected: false })),
      ]);
      
      setConnectionStatus({
        ollama: ollamaStatus.connected,
        comfyui: comfyuiStatus.connected,
        checking: false,
      });
    };
    
    checkConnections();
    
    // Recheck every 30 seconds
    const interval = setInterval(checkConnections, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine which configurations are available
  const availableConfig = useMemo(() => {
    const configs: string[] = [];
    
    if (projectConfig?.llm) {
      configs.push('llm');
    }
    
    if (projectConfig?.comfyui) {
      configs.push('comfyui');
    }
    
    if (projectConfig?.api) {
      configs.push('api');
    }
    
    return configs;
  }, [projectConfig]);

  // Check if wizard can be launched based on config and connection status (Requirement 4.4, 4.5)
  const canLaunchWizard = (wizard: WizardDefinition): boolean => {
    if (!wizard.enabled) {
      return false;
    }
    
    // Check configuration requirements
    if (!checkWizardRequirements(wizard, availableConfig)) {
      return false;
    }
    
    // Check connection status for required services
    if (wizard.requiredConfig?.includes('llm') && !connectionStatus.ollama) {
      return false;
    }
    
    if (wizard.requiredConfig?.includes('comfyui') && !connectionStatus.comfyui) {
      return false;
    }
    
    // Check project data requirements (Requirement 4.4, 8.4)
    if (wizard.requiresCharacters) {
      const hasCharacters = project?.characters && project.characters.length > 0;
      if (!hasCharacters) {
        return false;
      }
    }
    
    if (wizard.requiresShots) {
      const hasShots = project?.shots && project.shots.length > 0;
      if (!hasShots) {
        return false;
      }
    }
    
    return true;
  };

  // Get tooltip message for wizard (Requirement 9.2)
  const getTooltipMessage = (wizard: WizardDefinition): string => {
    if (!wizard.enabled) {
      return 'This wizard is currently disabled';
    }
    
    if (!wizard.requiredConfig || wizard.requiredConfig.length === 0) {
      return wizard.description;
    }
    
    const missingConfig = wizard.requiredConfig.filter(
      req => !availableConfig.includes(req)
    );
    
    if (missingConfig.length > 0) {
      return `Missing required configuration: ${missingConfig.join(', ')}. ${wizard.description}`;
    }
    
    // Check connection status
    const connectionIssues: string[] = [];
    if (wizard.requiredConfig.includes('llm') && !connectionStatus.ollama) {
      connectionIssues.push('Ollama not connected');
    }
    if (wizard.requiredConfig.includes('comfyui') && !connectionStatus.comfyui) {
      connectionIssues.push('ComfyUI not connected');
    }
    
    if (connectionIssues.length > 0) {
      return `${connectionIssues.join(', ')}. ${wizard.description}`;
    }
    
    // Check data requirements (Requirement 8.4, 9.2)
    const dataIssues: string[] = [];
    if (wizard.requiresCharacters) {
      const hasCharacters = project?.characters && project.characters.length > 0;
      if (!hasCharacters) {
        dataIssues.push('No characters available. Create characters first using the Character Wizard.');
      }
    }
    if (wizard.requiresShots) {
      const hasShots = project?.shots && project.shots.length > 0;
      if (!hasShots) {
        dataIssues.push('No shots available. Create shots first.');
      }
    }
    
    if (dataIssues.length > 0) {
      return `${dataIssues.join(' ')} ${wizard.description}`;
    }
    
    return wizard.description;
  };

  // Get service requirements display
  const getServiceRequirements = (wizard: WizardDefinition): string[] => {
    const requirements: string[] = [];
    
    if (wizard.requiredConfig?.includes('llm')) {
      requirements.push('LLM');
    }
    
    if (wizard.requiredConfig?.includes('comfyui')) {
      requirements.push('ComfyUI');
    }
    
    return requirements;
  };

  // Handle wizard launch
  const handleLaunchWizard = (wizard: WizardDefinition) => {
    if (!canLaunchWizard(wizard)) {
      return;
    }
    
    onLaunchWizard(wizard.id);
  };

  return (
    <div className="wizard-launcher">
      <div className="wizard-launcher-header">
        <div>
          <h3 className="wizard-launcher-title">Creative Wizards</h3>
          <p className="wizard-launcher-description">
            Quick access to AI-powered creative tools
          </p>
        </div>
        
        {/* Connection Status Indicators */}
        <div className="connection-status">
          <div className={`status-indicator ${connectionStatus.checking ? 'checking' : connectionStatus.ollama ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-label">Ollama</span>
          </div>
          <div className={`status-indicator ${connectionStatus.checking ? 'checking' : connectionStatus.comfyui ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-label">ComfyUI</span>
          </div>
        </div>
      </div>
      
      <div className="wizard-grid">
        {availableWizards.map(wizard => {
          const canLaunch = canLaunchWizard(wizard);
          const tooltip = getTooltipMessage(wizard);
          const requirements = getServiceRequirements(wizard);
          
          return (
            <button
              key={wizard.id}
              className={`wizard-card ${!canLaunch ? 'disabled' : ''}`}
              onClick={() => handleLaunchWizard(wizard)}
              disabled={!canLaunch}
              title={tooltip}
            >
              <div className="wizard-icon">{wizard.icon}</div>
              <div className="wizard-info">
                <h4 className="wizard-name">{wizard.name}</h4>
                <p className="wizard-description">{wizard.description}</p>
                
                {/* Service Requirements */}
                {requirements.length > 0 && (
                  <div className="wizard-requirements">
                    <span className="requirements-label">Requires:</span>
                    <div className="requirements-badges">
                      {requirements.map(req => (
                        <span 
                          key={req} 
                          className={`requirement-badge ${
                            req === 'LLM' && connectionStatus.ollama ? 'connected' :
                            req === 'ComfyUI' && connectionStatus.comfyui ? 'connected' :
                            'disconnected'
                          }`}
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {canLaunch && (
                <div className="wizard-launch-icon">→</div>
              )}
            </button>
          );
        })}
      </div>
      
      {availableWizards.length === 0 && (
        <div className="empty-state">
          No wizards available
        </div>
      )}
    </div>
  );
}
