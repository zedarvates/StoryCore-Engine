/**
 * Service Status Banner Component
 * 
 * Displays connection status for Ollama (LLM) and ComfyUI services.
 * Provides clear feedback and quick configuration options when services are unavailable.
 * 
 * Requirements: Service availability check for wizards that require LLM/ComfyUI
 */

import React, { useState, useEffect } from 'react';
import { useServiceStatus, ServiceStatus } from '@/hooks/useServiceStatus';
import { AlertCircle, CheckCircle, Settings, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

export interface ServiceRequirement {
  service: 'ollama' | 'comfyui';
  required: boolean;
  description: string;
  configUrl?: string;
}

export interface ServiceStatusBannerProps {
  requirements: ServiceRequirement[];
  onConfigure?: (service: 'ollama' | 'comfyui') => void;
  onRetry?: () => void;
  showDetails?: boolean;
  variant?: 'banner' | 'card' | 'inline';
}

// Map service names to display names
const SERVICE_NAMES: Record<string, string> = {
  ollama: 'Ollama (LLM)',
  comfyui: 'ComfyUI',
};

// Map service names to setup instructions
const SERVICE_SETUP_INSTRUCTIONS: Record<string, string> = {
  ollama: 'Download Ollama from ollama.com and run: ollama serve',
  comfyui: 'Ensure ComfyUI is running and the server URL is configured in settings.',
};

/**
 * Get status icon and color based on service status
 */
function getStatusConfig(status: ServiceStatus): {
  icon: React.ReactNode;
  color: string;
  text: string;
} {
  switch (status) {
    case 'connected':
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-green-500',
        text: 'Connected',
      };
    case 'disconnected':
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'text-red-500',
        text: 'Not connected',
      };
    case 'checking':
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        color: 'text-yellow-500',
        text: 'Checking...',
      };
  }
}

/**
 * Service status badge component
 */
interface ServiceBadgeProps {
  service: string;
  status: ServiceStatus;
  required: boolean;
  onConfigure?: () => void;
  showDetails?: boolean;
}

function ServiceBadge({
  service,
  status,
  required,
  onConfigure,
  showDetails,
}: ServiceBadgeProps) {
  const { icon, color, text } = getStatusConfig(status);
  const isAvailable = status === 'connected';
  const showWarning = status === 'disconnected' && required;

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border
        ${showWarning 
          ? 'border-red-200 bg-red-50' 
          : 'border-gray-200 bg-white'
        }
      `}
    >
      <span className={color}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {SERVICE_NAMES[service]}
        </p>
        {showDetails && (
          <p className={`text-xs ${color}`}>{text}</p>
        )}
      </div>
      {showWarning && onConfigure && (
        <button
          onClick={onConfigure}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium
                   text-red-700 bg-red-100 rounded hover:bg-red-200
                   transition-colors"
        >
          <Settings className="w-3 h-3" />
          Configure
        </button>
      )}
    </div>
  );
}

/**
 * Service Status Banner Component
 */
export function ServiceStatusBanner({
  requirements,
  onConfigure,
  onRetry,
  showDetails = true,
  variant = 'banner',
}: ServiceStatusBannerProps) {
  const serviceStatus = useServiceStatus();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check all requirements
  const allConnected = requirements.every(req => 
    serviceStatus[req.service] === 'connected'
  );
  
  const missingRequired = requirements.filter(req => 
    req.required && serviceStatus[req.service] !== 'connected'
  );
  
  const isChecking = Object.values(serviceStatus).some(s => s === 'checking');

  // Auto-expand if there are missing required services
  useEffect(() => {
    if (missingRequired.length > 0) {
      setIsExpanded(true);
    }
  }, [missingRequired.length]);

  // Don't show anything if all services are connected and not checking
  if (allConnected && !isChecking) {
    return null;
  }

  const variantStyles = {
    banner: 'fixed bottom-4 right-4 z-50 max-w-md shadow-lg',
    card: 'border rounded-xl p-4',
    inline: 'inline-flex',
  };

  const content = (
    <div 
      className={`
        ${variantStyles[variant]}
        ${variant === 'banner' ? 'bg-white rounded-xl' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isChecking ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          ) : missingRequired.length > 0 ? (
            <AlertCircle className="w-5 h-5 text-amber-500" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          
          <div>
            <p className="text-sm font-medium text-gray-900">
              {isChecking 
                ? 'Checking services...' 
                : missingRequired.length > 0
                  ? `${missingRequired.length} service(s) unavailable`
                  : 'All services connected'
              }
            </p>
            {variant !== 'inline' && (
              <p className="text-xs text-gray-500">
                {missingRequired.length > 0
                  ? 'Some features may be limited'
                  : 'Ready to use AI-powered features'
                }
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-2 text-gray-500 hover:text-gray-700 
                       hover:bg-gray-100 rounded-lg transition-colors"
              title="Retry connection check"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          
          {variant !== 'inline' && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-700 
                       font-medium transition-colors"
            >
              {isExpanded ? 'Hide details' : 'Show details'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && variant !== 'inline' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {/* Service badges */}
          <div className="grid gap-3">
            {requirements.map(req => (
              <ServiceBadge
                key={req.service}
                service={req.service}
                status={serviceStatus[req.service]}
                required={req.required}
                onConfigure={onConfigure ? () => onConfigure(req.service) : undefined}
                showDetails={showDetails}
              />
            ))}
          </div>

          {/* Missing services info */}
          {missingRequired.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg">
              <p className="text-sm font-medium text-amber-900">
                Missing required services
              </p>
              <ul className="mt-2 space-y-1">
                {missingRequired.map(req => (
                  <li key={req.service} className="text-sm text-amber-800">
                    • {SERVICE_NAMES[req.service]}: {req.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Setup instructions link */}
          {missingRequired.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 
                         hover:text-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                Download Ollama
              </a>
              <span className="text-gray-300">|</span>
              <a
                href="https://github.com/comfyanonymous/ComfyUI"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-600 
                         hover:text-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                Get ComfyUI
              </a>
            </div>
          )}
        </div>
      )}

      {/* Inline variant: simple indicator */}
      {variant === 'inline' && missingRequired.length > 0 && (
        <div className="mt-2 text-xs text-amber-600">
          {missingRequired.map(r => SERVICE_NAMES[r.service]).join(', ')} unavailable
        </div>
      )}
    </div>
  );

  // For banner variant, add backdrop
  if (variant === 'banner') {
    return (
      <>
        {content}
      </>
    );
  }

  return content;
}

/**
 * Wizard-specific service requirements helper
 */
export function getWizardServiceRequirements(wizardId: string): ServiceRequirement[] {
  const requirementsMap: Record<string, ServiceRequirement[]> = {
    'project-init': [
      { service: 'ollama', required: false, description: 'For AI story generation' },
    ],
    'world-building': [
      { service: 'ollama', required: true, description: 'Required for world generation' },
    ],
    'character-creation': [
      { service: 'ollama', required: true, description: 'Required for character generation' },
      { service: 'comfyui', required: false, description: 'For image tile generation' },
    ],
    'storyteller-wizard': [
      { service: 'ollama', required: true, description: 'Required for story generation' },
    ],
    'shot-planning': [
      { service: 'ollama', required: false, description: 'For shot suggestions' },
    ],
    'shot-reference-wizard': [
      { service: 'comfyui', required: true, description: 'Required for image generation' },
    ],
    'dialogue-wizard': [
      { service: 'ollama', required: true, description: 'Required for dialogue generation' },
    ],
    'scene-generator': [
      { service: 'ollama', required: true, description: 'Required for scene generation' },
      { service: 'comfyui', required: true, description: 'Required for image generation' },
    ],
    'storyboard-creator': [
      { service: 'ollama', required: true, description: 'Required for storyboard generation' },
      { service: 'comfyui', required: true, description: 'Required for panel images' },
    ],
    'style-transfer': [
      { service: 'comfyui', required: true, description: 'Required for style transfer' },
    ],
    'marketing-wizard': [
      { service: 'ollama', required: false, description: 'For content suggestions' },
      { service: 'comfyui', required: false, description: 'For thumbnail generation' },
    ],
  };

  return requirementsMap[wizardId] || [];
}

/**
 * Component to show service status in wizard header
 */
export function WizardServiceIndicator({
  wizardId,
  onConfigure,
}: {
  wizardId: string;
  onConfigure?: (service: 'ollama' | 'comfyui') => void;
}) {
  const requirements = getWizardServiceRequirements(wizardId);
  const serviceStatus = useServiceStatus();
  
  const missingRequired = requirements.filter(req => 
    req.required && serviceStatus[req.service] !== 'connected'
  );

  if (missingRequired.length === 0) {
    return null;
  }

  return (
    <ServiceStatusBanner
      requirements={requirements}
      onConfigure={onConfigure}
      variant="inline"
    />
  );
}

