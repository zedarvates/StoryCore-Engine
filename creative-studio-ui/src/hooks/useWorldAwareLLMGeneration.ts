/**
 * World-Aware LLM Generation Hook
 * 
 * Wraps useLLMGeneration with automatic world context integration
 * Ensures all LLM generations include world-specific context
 * 
 * Validates Requirements: 7.7
 */

import { useCallback } from 'react';
import { useLLMGeneration, type UseLLMGenerationOptions } from './useLLMGeneration';
import { useStore } from '@/store';
import type { LLMRequest } from '@/services/llmService';
import {
  enhancePromptWithWorldContext,
  generateWorldAwareSystemPrompt,
  getImageGenerationContext,
} from '@/services/worldContextIntegration';

// ============================================================================
// World-Aware LLM Generation Options
// ============================================================================

export interface UseWorldAwareLLMGenerationOptions extends UseLLMGenerationOptions {
  /**
   * Whether to include full world context (default: true)
   */
  includeFullContext?: boolean;

  /**
   * Specific location name to focus on
   */
  locationName?: string;

  /**
   * Whether to include style guidance (default: true)
   */
  includeStyleGuidance?: boolean;

  /**
   * Whether to enhance system prompt with world context (default: true)
   */
  enhanceSystemPrompt?: boolean;
}

// ============================================================================
// useWorldAwareLLMGeneration Hook
// ============================================================================

export function useWorldAwareLLMGeneration(
  options: UseWorldAwareLLMGenerationOptions = {}
) {
  const {
    includeFullContext = true,
    locationName,
    includeStyleGuidance = true,
    enhanceSystemPrompt = true,
    ...llmOptions
  } = options;

  // Get current world from store
  const currentWorld = useStore((state) => state.worlds[0] || null);

  // Use base LLM generation hook
  const generation = useLLMGeneration(llmOptions);

  // ============================================================================
  // Enhanced Generate with World Context
  // ============================================================================

  const generateWithWorldContext = useCallback(
    async (request: LLMRequest) => {
      // Enhance prompt with world context
      const enhancedPrompt = enhancePromptWithWorldContext(
        request.prompt,
        currentWorld,
        {
          includeFullContext,
          locationName,
          includeStyleGuidance,
        }
      );

      // Enhance system prompt if requested
      let enhancedSystemPrompt = request.systemPrompt;
      if (enhanceSystemPrompt && request.systemPrompt) {
        enhancedSystemPrompt = generateWorldAwareSystemPrompt(
          request.systemPrompt,
          currentWorld
        );
      }

      // Create enhanced request
      const enhancedRequest: LLMRequest = {
        ...request,
        prompt: enhancedPrompt,
        systemPrompt: enhancedSystemPrompt,
        context: {
          ...request.context,
          world: currentWorld,
          locationName,
        },
      };

      // Generate with enhanced request
      return generation.generate(enhancedRequest);
    },
    [
      generation,
      currentWorld,
      includeFullContext,
      locationName,
      includeStyleGuidance,
      enhanceSystemPrompt,
    ]
  );

  // ============================================================================
  // Enhanced Streaming Generate with World Context
  // ============================================================================

  const generateStreamingWithWorldContext = useCallback(
    async (request: LLMRequest) => {
      // Enhance prompt with world context
      const enhancedPrompt = enhancePromptWithWorldContext(
        request.prompt,
        currentWorld,
        {
          includeFullContext,
          locationName,
          includeStyleGuidance,
        }
      );

      // Enhance system prompt if requested
      let enhancedSystemPrompt = request.systemPrompt;
      if (enhanceSystemPrompt && request.systemPrompt) {
        enhancedSystemPrompt = generateWorldAwareSystemPrompt(
          request.systemPrompt,
          currentWorld
        );
      }

      // Create enhanced request
      const enhancedRequest: LLMRequest = {
        ...request,
        prompt: enhancedPrompt,
        systemPrompt: enhancedSystemPrompt,
        context: {
          ...request.context,
          world: currentWorld,
          locationName,
        },
      };

      // Generate with enhanced request
      return generation.generateStreaming(enhancedRequest);
    },
    [
      generation,
      currentWorld,
      includeFullContext,
      locationName,
      includeStyleGuidance,
      enhanceSystemPrompt,
    ]
  );

  // ============================================================================
  // Get Image Generation Context
  // ============================================================================

  const getImageContext = useCallback(() => {
    return getImageGenerationContext(currentWorld, locationName);
  }, [currentWorld, locationName]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    ...generation,
    generate: generateWithWorldContext,
    generateStreaming: generateStreamingWithWorldContext,
    getImageContext,
    currentWorld,
  };
}

// ============================================================================
// Simplified Hook for Non-Streaming Generation
// ============================================================================

export function useSimpleWorldAwareLLMGeneration(
  options: UseWorldAwareLLMGenerationOptions = {}
) {
  const generation = useWorldAwareLLMGeneration(options);

  return {
    isLoading: generation.isLoading,
    error: generation.error,
    data: generation.data,
    generate: generation.generate,
    retry: generation.retry,
    cancel: generation.cancel,
    clearError: generation.clearError,
    reset: generation.reset,
    getImageContext: generation.getImageContext,
    currentWorld: generation.currentWorld,
  };
}
