/**
 * Wizard Launcher Component
 * 
 * Displays grid of wizard cards with icons and descriptions
 * Shows service requirements (LLM, ComfyUI) for each wizard
 * Implements wizard selection handler
 * Adds connection status indicators
 * 
 * Requirements: 1.5
 */

import { useMemo, useEffect, useState } from 'react';
import type { WizardLauncherProps, WizardDefinition } from '../../types/configuration';
import { checkWizardRequirements, getWizardDependencies } from '../../data/wizardDefinitions';
import { WizardService } from '../../services/wizard/WizardService';
import { useAppStore } from '../../stores/useAppStore';
import { logger } from '../../utils/logging';
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
      
      // Silently check connections - errors are expected when services aren't running
      const [ollamaStatus, comfyuiStatus] = await Promise.all([
        wizardService.checkOllamaConnection().catch((error) => {
          logger.error("OLLAMA_CONNECTION_ERROR:", error.message);
          return {
            connected: false,
            service: 'ollama' as const,
            endpoint: 'http://localhost:11434',
            error: 'Service not available'
          };
        }),
        wizardService.checkComfyUIConnection().catch((error) => {
          logger.error("COMFYUI_CONNECTION_ERROR:", error.message);
          return {
            connected: false,
            service: 'comfyui' as const,
            endpoint: 'http://localhost:8188',
            error: 'Service not available'
          };
        }),
      ]);
      
      setConnectionStatus({
        ollama: ollamaStatus.connected,
        comfyui: comfyuiStatus.connected,
        checking: false,
      });
    };
    
    checkConnections();
    
    // Recheck every 60 seconds (reduced frequency to minimize console noise)
    const interval = setInterval(checkConnections, 60000);
    return () => clearInterval(interval);
  }, []);

  // Determine which configurations are available based on connection status
  const availableConfig = useMemo(() => {
    const configs: string[] = [];
    
    if (connectionStatus.ollama) {
      configs.push('llm');
    }
    
    if (connectionStatus.comfyui) {
      configs.push('comfyui');
    }
    
    return configs;
  }, [connectionStatus]);

  // Check if wizard can be launched based on config and connection status (Requirement 4.4, 4.5)
  const canLaunchWizard = (wizard: WizardDefinition): boolean => {
    if (!wizard.enabled) {
      return false;
    }
    
    // Use the enhanced checkWizardRequirements function that includes project data validation
    return checkWizardRequirements(wizard, availableConfig, project);
  };

  // Get tooltip message for wizard (Requirement 9.2)
  const getTooltipMessage = (wizard: WizardDefinition): string => {
    if (!wizard.enabled) {
      return 'This wizard is currently disabled';
    }
    
    // Get wizard dependencies
    const dependencies = getWizardDependencies(wizard);
    
    // Check configuration dependencies
    const missingConfig = dependencies.config.filter(
      req => !availableConfig.includes(req)
    );
    
    if (missingConfig.length > 0) {
      return `Missing required configuration: ${missingConfig.join(', ')}. ${wizard.description}`;
    }
    
    // Check connection status
    const connectionIssues: string[] = [];
    if (dependencies.config.includes('llm') && !connectionStatus.ollama) {
      connectionIssues.push('Ollama not connected');
    }
    if (dependencies.config.includes('comfyui') && !connectionStatus.comfyui) {
      connectionIssues.push('ComfyUI not connected');
    }
    
    if (connectionIssues.length > 0) {
      return `${connectionIssues.join(', ')}. ${wizard.description}`;
    }
    
    // Check data requirements (Requirement 8.4, 9.2)
    const dataIssues: string[] = [];
    if (dependencies.characters) {
      const hasCharacters = project?.characters && project.characters.length > 0;
      if (!hasCharacters) {
        dataIssues.push('No characters available. Create characters first using the Character Wizard.');
      }
    }
    if (dependencies.shots) {
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

    // Use the callback provided by parent component
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
          <div 
            className={`status-indicator ${connectionStatus.checking ? 'checking' : connectionStatus.ollama ? 'connected' : 'disconnected'}`}
            title="Ollama provides AI text generation capabilities"
          >
            <span className="status-dot"></span>
            <span className="status-label">Ollama</span>
          </div>
          <div 
            className={`status-indicator ${connectionStatus.checking ? 'checking' : connectionStatus.comfyui ? 'connected' : 'disconnected'}`}
            title="ComfyUI is optional - app works in fallback mode without it"
          >
            <span className="status-dot"></span>
            <span className="status-label">ComfyUI (Optional)</span>
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
