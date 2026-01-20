import { useState, useCallback, useRef, useEffect } from 'react';
import { LLMService, LLMError } from '@/services/llmService';
import { llmConfigService } from '@/services/llmConfigService';
import type {
  LLMRequest,
  LLMResponse,
  ErrorRecoveryOptions,
} from '@/services/llmService';

// ============================================================================
// LLM Generation State
// ============================================================================

export interface LLMGenerationState {
  isLoading: boolean;
  isStreaming: boolean;
  error: ErrorRecoveryOptions | null;
  data: LLMResponse | null;
  streamedContent: string;
  requestId: string | null;
}

export interface UseLLMGenerationOptions {
  onSuccess?: (data: LLMResponse) => void;
  onError?: (error: ErrorRecoveryOptions) => void;
  onManualEntry?: () => void;
  autoRetry?: boolean;
  maxRetries?: number;
  llmService?: LLMService;
}

// ============================================================================
// useLLMGeneration Hook
// ============================================================================

export function useLLMGeneration(options: UseLLMGenerationOptions = {}) {
  const {
    onSuccess,
    onError,
    onManualEntry,
    autoRetry = false,
    maxRetries = 1,
  } = options;

  // Get LLM service from llmConfigService (always up-to-date)
  const [llmService, setLLMService] = useState<LLMService | null>(() => 
    options.llmService || llmConfigService.getService()
  );

  // Subscribe to configuration changes
  useEffect(() => {
    if (options.llmService) {
      // If a custom service is provided, use it
      return;
    }

    // Subscribe to config changes
    const unsubscribe = llmConfigService.subscribe(() => {
      const newService = llmConfigService.getService();
      console.log('[useLLMGeneration] LLM service updated');
      setLLMService(newService);
    });

    return unsubscribe;
  }, [options.llmService]);

  const [state, setState] = useState<LLMGenerationState>({
    isLoading: false,
    isStreaming: false,
    error: null,
    data: null,
    streamedContent: '',
    requestId: null,
  });

  const retryCountRef = useRef(0);
  const lastRequestRef = useRef<LLMRequest | null>(null);

  // ============================================================================
  // Generate Completion
  // ============================================================================

  const generate = useCallback(
    async (request: LLMRequest) => {
      if (!llmService) {
        console.error('[useLLMGeneration] No LLM service available');
        return;
      }

      // Store request for retry
      lastRequestRef.current = request;
      retryCountRef.current = 0;

      // Reset state
      setState({
        isLoading: true,
        isStreaming: false,
        error: null,
        data: null,
        streamedContent: '',
        requestId: `req_${Date.now()}`,
      });

      try {
        const response = await llmService.generateCompletion(request, state.requestId || undefined);

        if (response.success && response.data) {
          console.log('✅ LLM GENERATION SUCCESS - Content length:', response.data.content.length);
          console.log('✅ LLM GENERATION SUCCESS - Content preview:', response.data.content.substring(0, 300));
          setState((prev) => ({
            ...prev,
            isLoading: false,
            data: response.data!,
          }));
          onSuccess?.(response.data);
        } else {
          console.error('❌ LLM GENERATION FAILED - Error:', response.error, 'Code:', response.code);
          throw new LLMError(
            response.error || 'Generation failed',
            response.code || 'unknown',
            false
          );
        }
      } catch (error) {
        handleError(error as Error);
      }
    },
    [llmService, onSuccess, state.requestId]
  );

  // ============================================================================
  // Generate Streaming Completion
  // ============================================================================

  const generateStreaming = useCallback(
    async (request: LLMRequest) => {
      if (!llmService) {
        console.error('[useLLMGeneration] No LLM service available');
        return;
      }

      // Store request for retry
      lastRequestRef.current = request;
      retryCountRef.current = 0;

      // Reset state
      setState({
        isLoading: true,
        isStreaming: true,
        error: null,
        data: null,
        streamedContent: '',
        requestId: `req_${Date.now()}`,
      });

      try {
        const response = await llmService.generateStreamingCompletion(
          request,
          (chunk) => {
            setState((prev) => ({
              ...prev,
              streamedContent: prev.streamedContent + chunk,
            }));
          },
          state.requestId || undefined
        );

        if (response.success && response.data) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isStreaming: false,
            data: response.data!,
          }));
          onSuccess?.(response.data);
        } else {
          throw new LLMError(
            response.error || 'Generation failed',
            response.code || 'unknown',
            false
          );
        }
      } catch (error) {
        handleError(error as Error);
      }
    },
    [llmService, onSuccess, state.requestId]
  );

  // ============================================================================
  // Error Handling
  // ============================================================================

  const handleError = useCallback(
    (error: Error) => {
      if (!llmService) {
        console.error('[useLLMGeneration] No LLM service available for error handling');
        return;
      }

      const recoveryOptions = llmService.createRecoveryOptions(
        error,
        () => retry(),
        onManualEntry,
        () => cancel()
      );

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isStreaming: false,
        error: recoveryOptions,
      }));

      onError?.(recoveryOptions);

      // Auto-retry if enabled and error is retryable
      if (autoRetry && recoveryOptions.retryable && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        setTimeout(() => {
          if (lastRequestRef.current) {
            if (state.isStreaming) {
              generateStreaming(lastRequestRef.current);
            } else {
              generate(lastRequestRef.current);
            }
          }
        }, 1000 * retryCountRef.current); // Exponential backoff
      }
    },
    [llmService, onManualEntry, onError, autoRetry, maxRetries, state.isStreaming]
  );

  // ============================================================================
  // Retry
  // ============================================================================

  const retry = useCallback(() => {
    if (!lastRequestRef.current) return;

    if (state.isStreaming) {
      generateStreaming(lastRequestRef.current);
    } else {
      generate(lastRequestRef.current);
    }
  }, [generate, generateStreaming, state.isStreaming]);

  // ============================================================================
  // Cancel
  // ============================================================================

  const cancel = useCallback(() => {
    if (!llmService) return;
    
    if (state.requestId) {
      llmService.cancelRequest(state.requestId);
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
      error: null,
    }));
  }, [llmService, state.requestId]);

  // ============================================================================
  // Clear Error
  // ============================================================================

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  // ============================================================================
  // Reset
  // ============================================================================

  const reset = useCallback(() => {
    cancel();
    lastRequestRef.current = null;
    retryCountRef.current = 0;
    setState({
      isLoading: false,
      isStreaming: false,
      error: null,
      data: null,
      streamedContent: '',
      requestId: null,
    });
  }, [cancel]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    ...state,
    generate,
    generateStreaming,
    retry,
    cancel,
    clearError,
    reset,
  };
}

// ============================================================================
// Simplified Hook for Non-Streaming Generation
// ============================================================================

export function useSimpleLLMGeneration(options: UseLLMGenerationOptions = {}) {
  const generation = useLLMGeneration(options);

  return {
    isLoading: generation.isLoading,
    error: generation.error,
    data: generation.data,
    generate: generation.generate,
    retry: generation.retry,
    cancel: generation.cancel,
    clearError: generation.clearError,
    reset: generation.reset,
  };
}
