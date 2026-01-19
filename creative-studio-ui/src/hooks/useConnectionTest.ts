/**
 * useConnectionTest Hook
 * 
 * Custom hook for testing connections with state management
 */

import { useState, useCallback } from 'react';
import type {
  ConnectionTestResult,
  RetryOptions,
} from '../services/connectionManager';
import {
  testConnection,
  testConnectionWithRetry,
  testAPIEndpoint,
  testOllamaConnection,
  testComfyUIConnection,
  logConnectionError,
} from '../services/connectionManager';
import type { ConnectionState } from '../components/ui/ConnectionStatus';

export interface UseConnectionTestResult {
  state: ConnectionState;
  message: string;
  latency?: number;
  testConnection: (url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  }) => Promise<void>;
  testWithRetry: (url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  }, retryOptions?: RetryOptions) => Promise<void>;
  testAPI: (url: string, apiKey?: string, retryOptions?: RetryOptions) => Promise<void>;
  testOllama: (baseUrl: string, retryOptions?: RetryOptions) => Promise<void>;
  testComfyUI: (serverUrl: string, retryOptions?: RetryOptions) => Promise<void>;
  reset: () => void;
}

export function useConnectionTest(serviceName?: string): UseConnectionTestResult {
  const [state, setState] = useState<ConnectionState>('idle');
  const [message, setMessage] = useState<string>('');
  const [latency, setLatency] = useState<number | undefined>(undefined);

  const handleResult = useCallback((result: ConnectionTestResult, url: string) => {
    if (result.success) {
      setState('connected');
      setMessage(result.message);
      setLatency(result.latency);
    } else {
      setState('error');
      setMessage(result.message);
      setLatency(result.latency);
      
      if (serviceName && result.error) {
        logConnectionError(serviceName, url, result.error);
      }
    }
  }, [serviceName]);

  const testConnectionFn = useCallback(async (
    url: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      timeout?: number;
    }
  ) => {
    setState('connecting');
    setMessage('Testing connection...');
    setLatency(undefined);

    const result = await testConnection(url, options);
    handleResult(result, url);
  }, [handleResult]);

  const testWithRetry = useCallback(async (
    url: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      timeout?: number;
    },
    retryOptions?: RetryOptions
  ) => {
    setState('connecting');
    setMessage('Testing connection...');
    setLatency(undefined);

    const result = await testConnectionWithRetry(url, options, retryOptions);
    handleResult(result, url);
  }, [handleResult]);

  const testAPI = useCallback(async (
    url: string,
    apiKey?: string,
    retryOptions?: RetryOptions
  ) => {
    setState('connecting');
    setMessage('Testing API connection...');
    setLatency(undefined);

    const result = await testAPIEndpoint(url, apiKey, retryOptions);
    handleResult(result, url);
  }, [handleResult]);

  const testOllama = useCallback(async (
    baseUrl: string,
    retryOptions?: RetryOptions
  ) => {
    setState('connecting');
    setMessage('Testing Ollama connection...');
    setLatency(undefined);

    const result = await testOllamaConnection(baseUrl, retryOptions);
    handleResult(result, baseUrl);
  }, [handleResult]);

  const testComfyUI = useCallback(async (
    serverUrl: string,
    retryOptions?: RetryOptions
  ) => {
    setState('connecting');
    setMessage('Testing ComfyUI connection...');
    setLatency(undefined);

    const result = await testComfyUIConnection(serverUrl, retryOptions);
    handleResult(result, serverUrl);
  }, [handleResult]);

  const reset = useCallback(() => {
    setState('idle');
    setMessage('');
    setLatency(undefined);
  }, []);

  return {
    state,
    message,
    latency,
    testConnection: testConnectionFn,
    testWithRetry,
    testAPI,
    testOllama,
    testComfyUI,
    reset,
  };
}
