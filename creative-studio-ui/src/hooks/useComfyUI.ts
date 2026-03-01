/**
 * ComfyUI React Hook
 * 
 * Provides UI integration with ComfyUI services for connection management and generation.
 */

import { useState, useCallback } from 'react';
import { getComfyUIServersService } from '@/services/comfyuiServersService';

export interface UseComfyUIResult {
  isConnected: boolean;
  isGenerating: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  generate: (prompt: string) => Promise<void>;
}

export function useComfyUI(): UseComfyUIResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      const service = getComfyUIServersService();
      const activeServer = service.getActiveServer();
      if (activeServer) {
        setIsConnected(true);
        setError(null);
      } else {
        throw new Error('No active ComfyUI server configured');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setError(null);
  }, []);

  const generate = useCallback(async (prompt: string) => {
    if (!isConnected) {
      setError('Not connected to ComfyUI server');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const service = getComfyUIServersService();
      const activeServer = service.getActiveServer();
      
      if (!activeServer) {
        throw new Error('No active ComfyUI server configured');
      }

      // Simple real integration with ComfyUI /prompt endpoint
      const response = await fetch(`${activeServer.url}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`ComfyUI generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ComfyUI Generation started, prompt ID:', result.prompt_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [isConnected]);

  return {
    isConnected,
    isGenerating,
    error,
    connect,
    disconnect,
    generate,
  };
}
