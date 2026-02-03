/**
 * Service Status Hook
 * 
 * Shared hook for checking Ollama and ComfyUI service connection status
 * Polls services every 30 seconds to keep status updated
 */

import { useState, useEffect } from 'react';

export type ServiceStatus = 'connected' | 'disconnected' | 'checking';

export interface ServiceState {
  ollama: ServiceStatus;
  comfyui: ServiceStatus;
}

/**
 * Hook to check and monitor service connection status
 * @returns Current status of Ollama and ComfyUI services
 */
export function useServiceStatus(): ServiceState {
  const [status, setStatus] = useState<ServiceState>({
    ollama: 'checking',
    comfyui: 'checking',
  });

  useEffect(() => {
    const checkServices = async () => {
      // Check Ollama status
      try {
        const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        setStatus(prev => ({
          ...prev,
          ollama: ollamaResponse.ok ? 'connected' : 'disconnected',
        }));
      } catch (error) {
        // Silent failure - service not available
        setStatus(prev => ({ ...prev, ollama: 'disconnected' }));
      }

      // Check ComfyUI status
      try {
        // Import service dynamically to avoid circular dependencies
        const { getComfyUIServersService } = await import('@/services/comfyuiServersService');
        const service = getComfyUIServersService();
        const activeServer = service.getActiveServer();
        
        // Only check if a server is configured
        if (!activeServer) {
          setStatus(prev => ({ ...prev, comfyui: 'disconnected' }));
          return;
        }
        
        const serverUrl = activeServer.serverUrl.replace(/\/$/, '');

        const comfyResponse = await fetch(`${serverUrl}/system_stats`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        setStatus(prev => ({
          ...prev,
          comfyui: comfyResponse.ok ? 'connected' : 'disconnected',
        }));
      } catch (error) {
        // Silent failure - service not available
        setStatus(prev => ({ ...prev, comfyui: 'disconnected' }));
      }
    };

    // Check immediately on mount
    checkServices();

    // Check every 30 seconds
    const interval = setInterval(checkServices, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  return status;
}
