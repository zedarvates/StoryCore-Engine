/**
 * ComfyUI React Hook
 * 
 * Provides UI integration with ComfyUI services for connection management and generation.
 */

import { useState, useEffect, useCallback } from 'react';
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
      // TODO: Implement actual generation logic
      console.log('Generating with prompt:', prompt);
      await new Promise(resolve => setTimeout(resolve, 1000));
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
