/**
 * Enhanced LLM Hook
 * 
 * React hook for using the Confucian LLM Assistant services
 * across different wizard components.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MultiModelManager,
  PromptEngineeringEngine,
  ResponseParser,
  OllamaClient,
  type ReasoningResponse,
  type ModelMetadata,
  type TaskType,
} from '../services/llm';

export interface EnhancedLLMConfig {
  taskType?: TaskType;
  reasoningMode?: boolean;
  confucianPrinciples?: ('ren' | 'li' | 'yi' | 'zhi')[];
}

export interface UseEnhancedLLMReturn {
  // State
  isLoading: boolean;
  error: string | null;
  response: ReasoningResponse | null;
  availableModels: ModelMetadata[];
  currentModel: string;
  reasoningMode: boolean;
  
  // Actions
  generate: (prompt: string, systemPrompt?: string) => Promise<void>;
  setCurrentModel: (model: string) => void;
  setReasoningMode: (enabled: boolean) => void;
  clearResponse: () => void;
  clearError: () => void;
  
  // Services (for advanced usage)
  modelManager: MultiModelManager | null;
  promptEngine: PromptEngineeringEngine;
  parser: ResponseParser;
}

export function useEnhancedLLM(config: EnhancedLLMConfig = {}): UseEnhancedLLMReturn {
  const {
    taskType = 'general',
    reasoningMode: initialReasoningMode = true,
    confucianPrinciples = ['ren', 'li', 'yi', 'zhi'],
  } = config;

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ReasoningResponse | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelMetadata[]>([]);
  const [currentModel, setCurrentModel] = useState('gemma3:4b');
  const [reasoningMode, setReasoningMode] = useState(initialReasoningMode);

  // Services (stable references)
  const [modelManager, setModelManager] = useState<MultiModelManager | null>(null);
  const [promptEngine] = useState(() => new PromptEngineeringEngine());
  const [parser] = useState(() => new ResponseParser());
  const [ollamaClient] = useState(() => new OllamaClient());

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Check Ollama health
        const isHealthy = await ollamaClient.healthCheck();
        if (!isHealthy) {
          setError('Ollama is not running. Please start Ollama to use AI assistance.');
          return;
        }

        // Initialize model manager
        const llmConfig = {
          provider: 'local' as const,
          model: currentModel,
          apiEndpoint: 'http://localhost:11434',
          availableModels: {
            vision: ['qwen3-vl:8b'],
            storytelling: ['llama3.1:8b', 'mistral:7b'],
            quick: ['gemma3:4b', 'gemma3:1b'],
            default: 'gemma3:4b',
          },
        };

        const manager = new MultiModelManager(llmConfig);
        setModelManager(manager);

        // Detect available models
        const models = await manager.detectAvailableModels();
        setAvailableModels(models);

        // Select best model for task type
        const recommendedModel = manager.getModelForTask(taskType);
        setCurrentModel(recommendedModel);
      } catch (err) {
        console.error('[useEnhancedLLM] Initialization error:', err);
        setError('Failed to initialize AI assistant');
      }
    };

    initializeServices();
  }, [ollamaClient, taskType]);

  // Generate response
  const generate = useCallback(
    async (prompt: string, systemPrompt?: string) => {
      if (!prompt.trim() || !modelManager) {
        setError('Invalid prompt or model manager not initialized');
        return;
      }

      setIsLoading(true);
      setError(null);
      setResponse(null);

      try {
        // Build enhanced prompt if reasoning mode is enabled
        const finalPrompt = reasoningMode && systemPrompt
          ? promptEngine.buildEnhancedPrompt(
              systemPrompt,
              taskType === 'storytelling' ? 'story' : 'world',
              prompt,
              {
                showThinking: true,
                principles: confucianPrinciples,
                includeExamples: true,
              }
            )
          : systemPrompt
          ? `${systemPrompt}\n\nUser Request: ${prompt}`
          : prompt;

        // Generate response
        const rawResponse = await ollamaClient.generate(
          currentModel,
          finalPrompt,
          { temperature: 0.7, maxTokens: 2000 }
        );

        // Parse response
        const parsedResponse = reasoningMode
          ? parser.parseResponse(rawResponse, currentModel)
          : {
              thinking: undefined,
              summary: rawResponse,
              rawResponse,
              modelUsed: currentModel,
              formatValid: false,
              timestamp: Date.now(),
            };

        setResponse(parsedResponse);
      } catch (err) {
        console.error('[useEnhancedLLM] Generation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate response');
      } finally {
        setIsLoading(false);
      }
    },
    [
      modelManager,
      currentModel,
      reasoningMode,
      promptEngine,
      parser,
      ollamaClient,
      taskType,
      confucianPrinciples,
    ]
  );

  const clearResponse = useCallback(() => {
    setResponse(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    response,
    availableModels,
    currentModel,
    reasoningMode,

    // Actions
    generate,
    setCurrentModel,
    setReasoningMode,
    clearResponse,
    clearError,

    // Services
    modelManager,
    promptEngine,
    parser,
  };
}
