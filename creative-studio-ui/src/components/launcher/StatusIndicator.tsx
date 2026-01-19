import React, { useState, memo } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'fallback';

export interface StatusIndicatorProps {
  status: ConnectionStatus;
  providerName?: string;
  modelName?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  dotClass: string;
  tooltip: string;
}

// ============================================================================
// Status Configurations
// ============================================================================

const STATUS_CONFIGS: Record<ConnectionStatus, StatusConfig> = {
  online: {
    label: 'En ligne',
    color: 'text-green-500',
    dotClass: 'bg-green-500 animate-pulse',
    tooltip: 'Connected to {provider} ({model})',
  },
  offline: {
    label: 'Hors ligne',
    color: 'text-red-500',
    dotClass: 'bg-red-500',
    tooltip: 'LLM service unavailable',
  },
  connecting: {
    label: 'Connexion...',
    color: 'text-yellow-500',
    dotClass: 'bg-yellow-500 animate-pulse',
    tooltip: 'Connecting to LLM service...',
  },
  fallback: {
    label: 'Mode hors ligne',
    color: 'text-orange-500',
    dotClass: 'bg-orange-500',
    tooltip: 'Using pre-configured responses',
  },
};

// ============================================================================
// StatusIndicator Component
// ============================================================================

export const StatusIndicator = memo(function StatusIndicator({
  status,
  providerName,
  modelName,
}: StatusIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const config = STATUS_CONFIGS[status];
  
  // Build tooltip text with provider and model info if available
  const getTooltipText = (): string => {
    let tooltip = config.tooltip;
    
    if (status === 'online' && providerName && modelName) {
      tooltip = tooltip
        .replace('{provider}', providerName)
        .replace('{model}', modelName);
    }
    
    return tooltip;
  };

  return (
    <div className="relative ml-auto flex items-center gap-1">
      <div
        className="flex items-center gap-1 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        role="status"
        aria-label={`Connection status: ${config.label}`}
      >
        <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
        <span className={`text-xs ${config.color}`}>{config.label}</span>
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-950 text-white text-xs rounded-md shadow-lg border border-gray-700 whitespace-nowrap z-50"
          role="tooltip"
        >
          {getTooltipText()}
          <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-950 border-l border-t border-gray-700 transform rotate-45" />
        </div>
      )}
    </div>
  );
});
