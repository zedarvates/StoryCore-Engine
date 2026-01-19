/**
 * Service Status Indicator
 * 
 * Shows connection status for backend services (Ollama, ComfyUI)
 * Implements graceful degradation when services are unavailable
 * 
 * Requirements: 1.3, 1.4, 1.5
 */

import { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ConnectionStatus } from '@/services/wizard/types';

interface ServiceStatusIndicatorProps {
  service: 'ollama' | 'comfyui' | 'both';
  showDetails?: boolean;
  autoCheck?: boolean;
  onStatusChange?: (connected: boolean) => void;
}

export function ServiceStatusIndicator({
  service,
  showDetails = false,
  autoCheck = false,
  onStatusChange,
}: ServiceStatusIndicatorProps) {
  const { checkOllamaConnection, checkComfyUIConnection, checkAllConnections } = useEditorStore();
  const [ollamaStatus, setOllamaStatus] = useState<ConnectionStatus | null>(null);
  const [comfyuiStatus, setComfyuiStatus] = useState<ConnectionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      handleCheckStatus();
    }
  }, [autoCheck]);

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange) {
      if (service === 'both') {
        onStatusChange(
          ollamaStatus?.connected === true && comfyuiStatus?.connected === true
        );
      } else if (service === 'ollama') {
        onStatusChange(ollamaStatus?.connected === true);
      } else {
        onStatusChange(comfyuiStatus?.connected === true);
      }
    }
  }, [ollamaStatus, comfyuiStatus, service, onStatusChange]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      if (service === 'both') {
        const { ollama, comfyui } = await checkAllConnections();
        setOllamaStatus(ollama);
        setComfyuiStatus(comfyui);
      } else if (service === 'ollama') {
        const status = await checkOllamaConnection();
        setOllamaStatus(status);
      } else {
        const status = await checkComfyUIConnection();
        setComfyuiStatus(status);
      }
    } catch (error) {
      console.error('Failed to check service status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const renderStatusIcon = (status: ConnectionStatus | null) => {
    if (isChecking) {
      return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    }

    if (!status) {
      return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }

    if (status.connected) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }

    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const renderStatusText = (status: ConnectionStatus | null, serviceName: string) => {
    if (isChecking) {
      return 'Checking...';
    }

    if (!status) {
      return 'Not checked';
    }

    if (status.connected) {
      return `${serviceName} connected`;
    }

    return `${serviceName} unavailable`;
  };

  const renderStatusDetails = (status: ConnectionStatus | null) => {
    if (!status || !showDetails) return null;

    return (
      <div className="mt-2 text-xs text-muted-foreground space-y-1">
        <div>Endpoint: {status.endpoint}</div>
        {status.latency !== undefined && (
          <div>Latency: {status.latency}ms</div>
        )}
        {status.error && (
          <div className="text-red-500">Error: {status.error}</div>
        )}
      </div>
    );
  };

  if (service === 'both') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Service Status</h4>
          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {/* Ollama Status */}
        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
          {renderStatusIcon(ollamaStatus)}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {renderStatusText(ollamaStatus, 'Ollama')}
            </div>
            {renderStatusDetails(ollamaStatus)}
          </div>
        </div>

        {/* ComfyUI Status */}
        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
          {renderStatusIcon(comfyuiStatus)}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {renderStatusText(comfyuiStatus, 'ComfyUI')}
            </div>
            {renderStatusDetails(comfyuiStatus)}
          </div>
        </div>

        {/* Instructions for unavailable services */}
        {(ollamaStatus && !ollamaStatus.connected) || (comfyuiStatus && !comfyuiStatus.connected) ? (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-2 font-medium">
              Some services are unavailable
            </p>
            {ollamaStatus && !ollamaStatus.connected && (
              <p className="text-xs text-muted-foreground mb-1">
                • Start Ollama: <code className="bg-muted px-1 py-0.5 rounded">ollama serve</code>
              </p>
            )}
            {comfyuiStatus && !comfyuiStatus.connected && (
              <p className="text-xs text-muted-foreground">
                • Start ComfyUI and ensure it's running on port 8188
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // Single service display
  const status = service === 'ollama' ? ollamaStatus : comfyuiStatus;
  const serviceName = service === 'ollama' ? 'Ollama' : 'ComfyUI';

  return (
    <div className="flex items-center gap-2">
      {renderStatusIcon(status)}
      <span className="text-sm">{renderStatusText(status, serviceName)}</span>
      {!isChecking && (
        <button
          onClick={handleCheckStatus}
          className="text-xs text-primary hover:underline ml-auto"
        >
          Check
        </button>
      )}
    </div>
  );
}

/**
 * Compact service status badge
 */
export function ServiceStatusBadge({
  service,
  status,
}: {
  service: 'ollama' | 'comfyui';
  status: ConnectionStatus | null;
}) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
        <AlertCircle className="w-3 h-3" />
        {service}
      </span>
    );
  }

  if (status.connected) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        {service}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
      <XCircle className="w-3 h-3" />
      {service}
    </span>
  );
}
