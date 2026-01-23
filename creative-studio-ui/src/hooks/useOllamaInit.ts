/**
 * useOllamaInit Hook
 * 
 * Automatically initializes Ollama configuration on app startup
 */

import { useEffect, useState } from 'react';
import { createLLMService, setDefaultLLMService } from '@/services/llmService';
import {
  getOllamaLLMConfig,
  checkOllamaStatus,
  getModelRecommendation,
  type ModelRecommendation,
} from '@/services/ollamaConfig';

export interface OllamaInitState {
  isInitialized: boolean;
  isLoading: boolean;
  isOllamaAvailable: boolean;
  recommendation: ModelRecommendation | null;
  error: string | null;
}

export function useOllamaInit() {
  const [state, setState] = useState<OllamaInitState>({
    isInitialized: false,
    isLoading: true,
    isOllamaAvailable: false,
    recommendation: null,
    error: null,
  });

  useEffect(() => {
    async function initializeOllama() {
      try {
        // Get model recommendation based on system
        const recommendation = await getModelRecommendation();
        
        // Get Ollama configuration
        const ollamaConfig = await getOllamaLLMConfig();
        
        // Check if Ollama is running
        const isRunning = await checkOllamaStatus(ollamaConfig.apiEndpoint);
        
        if (isRunning) {
          // Create LLM service with Ollama configuration
          const llmService = createLLMService({
            provider: 'local',
            apiEndpoint: ollamaConfig.apiEndpoint,
            model: ollamaConfig.model,
            apiKey: '',
            parameters: {
              temperature: 0.7,
              maxTokens: 2000,
              topP: 1.0,
              frequencyPenalty: 0,
              presencePenalty: 0,
            },
            systemPrompts: {
              worldGeneration: 'You are a creative world-building assistant...',
              characterGeneration: 'You are a character development expert...',
              dialogueGeneration: 'You are a dialogue writing specialist...',
            },
            timeout: 60000, // 60 seconds for local models
            retryAttempts: 2,
            streamingEnabled: true,
          });

          // Set as default service
          setDefaultLLMService(llmService);

        } else {
          console.warn('⚠️ Ollama is not running. LLM features will be limited.');
        }

        setState({
          isInitialized: true,
          isLoading: false,
          isOllamaAvailable: isRunning,
          recommendation,
          error: null,
        });
      } catch (error) {
        console.error('❌ Failed to initialize Ollama:', error);
        setState({
          isInitialized: false,
          isLoading: false,
          isOllamaAvailable: false,
          recommendation: null,
          error: error instanceof Error ? error.message : 'Failed to initialize Ollama',
        });
      }
    }

    initializeOllama();
  }, []);

  return state;
}
