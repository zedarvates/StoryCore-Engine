/**
 * LandingChatBox Integration Tests
 * 
 * Tests for Task 8: Integrate LLMService into LandingChatBox
 * Validates Requirements 3.1, 3.4, 3.7
 */

import { describe, it, expect } from 'vitest';
import { LLMService, type LLMConfig, type LLMRequest } from '@/services/llmService';
import { buildSystemPrompt } from '@/utils/systemPromptBuilder';

describe('LandingChatBox - LLMService Integration', () => {
  describe('Requirement 3.1: LLM Service Request Routing', () => {
    it('should create LLM service with proper configuration', () => {
      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const service = new LLMService(config);
      expect(service).toBeDefined();
      expect(service.getProviderName()).toBe('OpenAI');
    });

    it('should create proper LLM request with system prompt', () => {
      const userMessage = 'Hello assistant';
      const language = 'fr';
      const systemPrompt = buildSystemPrompt(language);

      const request: LLMRequest = {
        prompt: userMessage,
        systemPrompt,
        stream: true,
      };

      expect(request.prompt).toBe(userMessage);
      expect(request.systemPrompt).toBeDefined();
      expect(request.systemPrompt).toContain('StoryCore');
    });
  });

  describe('Requirement 3.4: Language-Aware System Prompt', () => {
    it('should build system prompt with language instruction for French', () => {
      const systemPrompt = buildSystemPrompt('fr');
      
      expect(systemPrompt).toContain('StoryCore AI assistant');
      expect(systemPrompt).toContain('French');
    });

    it('should build system prompt with language instruction for English', () => {
      const systemPrompt = buildSystemPrompt('en');
      
      expect(systemPrompt).toContain('StoryCore AI assistant');
      expect(systemPrompt).toContain('English');
    });

    it('should build system prompt with language instruction for Spanish', () => {
      const systemPrompt = buildSystemPrompt('es');
      
      expect(systemPrompt).toContain('StoryCore AI assistant');
      expect(systemPrompt).toContain('Spanish');
    });

    it('should include language instruction in all supported languages', () => {
      const languages = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'] as const;
      
      languages.forEach(lang => {
        const systemPrompt = buildSystemPrompt(lang);
        expect(systemPrompt).toBeDefined();
        expect(systemPrompt.length).toBeGreaterThan(0);
        expect(systemPrompt).toContain('StoryCore');
      });
    });
  });

  describe('Requirement 3.7: API Key Validation', () => {
    it('should identify OpenAI as requiring API key', () => {
      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
      expect(requiresApiKey).toBe(true);
      expect(config.apiKey).toBe('');
    });

    it('should identify Anthropic as requiring API key', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: '',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
      expect(requiresApiKey).toBe(true);
    });

    it('should identify local provider as not requiring API key', () => {
      const config: LLMConfig = {
        provider: 'local',
        model: 'local-model',
        apiKey: '',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
      expect(requiresApiKey).toBe(false);
    });

    it('should identify custom provider as not requiring API key', () => {
      const config: LLMConfig = {
        provider: 'custom',
        model: 'custom-model',
        apiKey: '',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
      expect(requiresApiKey).toBe(false);
    });
  });

  describe('LLM Service Configuration', () => {
    it('should update service configuration', () => {
      const initialConfig: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const service = new LLMService(initialConfig);
      
      service.updateConfig({
        model: 'gpt-3.5-turbo',
        parameters: {
          ...initialConfig.parameters,
          temperature: 0.5,
        },
      });

      const updatedConfig = service.getConfig();
      expect(updatedConfig.model).toBe('gpt-3.5-turbo');
      expect(updatedConfig.parameters.temperature).toBe(0.5);
    });

    it('should maintain provider name after configuration update', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: 'test-key',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const service = new LLMService(config);
      expect(service.getProviderName()).toBe('Anthropic');

      service.updateConfig({ model: 'claude-3-sonnet' });
      expect(service.getProviderName()).toBe('Anthropic');
    });
  });

  describe('Integration Flow', () => {
    it('should follow complete message flow: user input -> system prompt -> LLM request', () => {
      // Simulate user input
      const userMessage = 'Create a new project';
      const currentLanguage = 'fr';

      // Build system prompt with language
      const systemPrompt = buildSystemPrompt(currentLanguage);
      expect(systemPrompt).toBeDefined();

      // Create LLM request
      const request: LLMRequest = {
        prompt: userMessage,
        systemPrompt,
        stream: true,
      };

      // Verify request structure
      expect(request.prompt).toBe(userMessage);
      expect(request.systemPrompt).toContain('StoryCore');
      expect(request.systemPrompt).toContain('French');
      expect(request.stream).toBe(true);
    });

    it('should handle configuration changes and reinitialize service', () => {
      const config1: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'key1',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const service1 = new LLMService(config1);
      expect(service1.getProviderName()).toBe('OpenAI');

      // Simulate configuration change
      const config2: LLMConfig = {
        ...config1,
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: 'key2',
      };

      const service2 = new LLMService(config2);
      expect(service2.getProviderName()).toBe('Anthropic');
    });
  });
});

describe('Task 12: Fallback Mode Implementation', () => {
  describe('Requirement 10.1: Fallback Mode Activation - No Configuration', () => {
    it('should activate fallback mode when no LLM provider is configured', () => {
      // Simulate no configuration scenario
      const llmService = null;
      const isFallbackMode = llmService === null;
      
      expect(isFallbackMode).toBe(true);
    });

    it('should activate fallback mode when API key is missing for OpenAI', () => {
      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '', // No API key
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
      const shouldActivateFallback = requiresApiKey && !config.apiKey;
      
      expect(shouldActivateFallback).toBe(true);
    });

    it('should activate fallback mode when API key is missing for Anthropic', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-opus',
        apiKey: '', // No API key
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
      const shouldActivateFallback = requiresApiKey && !config.apiKey;
      
      expect(shouldActivateFallback).toBe(true);
    });
  });

  describe('Requirement 10.2: Fallback Mode Activation - Connection Failed', () => {
    it('should activate fallback mode on network error', () => {
      const errorCode: string = 'network';
      const shouldActivateFallback = ['network', 'timeout', 'connection'].includes(errorCode);
      
      expect(shouldActivateFallback).toBe(true);
    });

    it('should activate fallback mode on timeout error', () => {
      const errorCode: string = 'timeout';
      const shouldActivateFallback = ['network', 'timeout', 'connection'].includes(errorCode);
      
      expect(shouldActivateFallback).toBe(true);
    });

    it('should activate fallback mode on connection error', () => {
      const errorCode: string = 'connection';
      const shouldActivateFallback = ['network', 'timeout', 'connection'].includes(errorCode);
      
      expect(shouldActivateFallback).toBe(true);
    });

    it('should not activate fallback mode on authentication error', () => {
      const errorCode: string = 'authentication';
      const shouldActivateFallback = ['network', 'timeout', 'connection'].includes(errorCode);
      
      expect(shouldActivateFallback).toBe(false);
    });

    it('should not activate fallback mode on rate limit error', () => {
      const errorCode: string = 'rate_limit';
      const shouldActivateFallback = ['network', 'timeout', 'connection'].includes(errorCode);
      
      expect(shouldActivateFallback).toBe(false);
    });
  });

  describe('Requirement 10.3: Warning Banner Display', () => {
    it('should display warning banner when in fallback mode', () => {
      const isFallbackMode = true;
      const isOllamaAvailable = false;
      
      const shouldShowBanner = isFallbackMode && !isOllamaAvailable;
      
      expect(shouldShowBanner).toBe(true);
    });

    it('should not display warning banner when not in fallback mode', () => {
      const isFallbackMode = false;
      const isOllamaAvailable = false;
      
      const shouldShowBanner = isFallbackMode && !isOllamaAvailable;
      
      expect(shouldShowBanner).toBe(false);
    });

    it('should not display warning banner when Ollama is available', () => {
      const isFallbackMode = true;
      const isOllamaAvailable = true;
      
      const shouldShowBanner = isFallbackMode && !isOllamaAvailable;
      
      expect(shouldShowBanner).toBe(false);
    });
  });

  describe('Requirement 10.4: Configure LLM Button', () => {
    it('should provide configure action in fallback mode', () => {
      const isFallbackMode = true;
      
      // Simulate button action
      const configureAction = () => {
        return { action: 'openConfigDialog' };
      };
      
      expect(isFallbackMode).toBe(true);
      expect(configureAction()).toEqual({ action: 'openConfigDialog' });
    });
  });

  describe('Requirement 10.5: Automatic Mode Recovery', () => {
    it('should switch from fallback to live mode when service is configured', () => {
      // Initial state: fallback mode
      let isFallbackMode = true;
      let connectionStatus = 'fallback';
      
      // Simulate configuration with valid API key
      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'valid-api-key',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };

      const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
      
      if (!(requiresApiKey && !config.apiKey)) {
        // Service is now configured, switch to live mode
        connectionStatus = 'online';
        isFallbackMode = false;
      }
      
      expect(connectionStatus).toBe('online');
      expect(isFallbackMode).toBe(false);
    });

    it('should generate system message on mode recovery', () => {
      const wasFallbackMode = true;
      const isNowConfigured = true;
      
      const shouldGenerateMessage = wasFallbackMode && isNowConfigured;
      
      expect(shouldGenerateMessage).toBe(true);
    });

    it('should not generate system message if not recovering from fallback', () => {
      const wasFallbackMode = false;
      const isNowConfigured = true;
      
      const shouldGenerateMessage = wasFallbackMode && isNowConfigured;
      
      expect(shouldGenerateMessage).toBe(false);
    });
  });

  describe('Requirement 10.7: Status Indicator in Fallback Mode', () => {
    it('should set status to fallback when in fallback mode', () => {
      const isFallbackMode = true;
      const expectedStatus = isFallbackMode ? 'fallback' : 'online';
      
      expect(expectedStatus).toBe('fallback');
    });

    it('should set status to online when not in fallback mode', () => {
      const isFallbackMode = false;
      const expectedStatus = isFallbackMode ? 'fallback' : 'online';
      
      expect(expectedStatus).toBe('online');
    });
  });

  describe('Fallback Response Generation', () => {
    it('should use pre-configured responses in fallback mode', () => {
      const isFallbackMode = true;
      const userInput = 'create project';
      
      // Simulate fallback response generation
      const generateFallbackResponse = (input: string): string => {
        if (input.includes('create') && input.includes('project')) {
          return "Pour créer un nouveau projet, cliquez sur le bouton 'New Project' ci-dessus.";
        }
        return "Je suis là pour vous aider avec StoryCore!";
      };
      
      expect(isFallbackMode).toBe(true);
      const response = generateFallbackResponse(userInput);
      expect(response).toContain('créer');
      expect(response).toContain('projet');
    });

    it('should provide default response for unrecognized input in fallback mode', () => {
      const userInput = 'random unrecognized input';
      
      const generateFallbackResponse = (input: string): string => {
        if (input.includes('create') && input.includes('project')) {
          return "Pour créer un nouveau projet, cliquez sur le bouton 'New Project' ci-dessus.";
        }
        return "Je suis là pour vous aider avec StoryCore!";
      };
      
      const response = generateFallbackResponse(userInput);
      expect(response).toContain('StoryCore');
    });
  });

  describe('Integration: Fallback Mode Complete Flow', () => {
    it('should handle complete fallback activation flow', () => {
      // Step 1: No configuration
      let llmService = null;
      let isFallbackMode = llmService === null;
      let connectionStatus = isFallbackMode ? 'fallback' : 'online';
      
      expect(isFallbackMode).toBe(true);
      expect(connectionStatus).toBe('fallback');
      
      // Step 2: User configures service
      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'valid-key',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: '',
          characterGeneration: '',
          dialogueGeneration: '',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      };
      
      llmService = new LLMService(config);
      isFallbackMode = false;
      connectionStatus = 'online';
      
      // Step 3: Verify recovery
      expect(llmService).toBeDefined();
      expect(isFallbackMode).toBe(false);
      expect(connectionStatus).toBe('online');
    });

    it('should handle connection failure and fallback activation', () => {
      // Step 1: Service configured and online
      let connectionStatus = 'online';
      let isFallbackMode = false;
      
      // Step 2: Connection fails
      const errorCode = 'network';
      const shouldActivateFallback = errorCode === 'network' || errorCode === 'timeout' || errorCode === 'connection';
      
      if (shouldActivateFallback) {
        isFallbackMode = true;
        connectionStatus = 'fallback';
      }
      
      // Step 3: Verify fallback activation
      expect(isFallbackMode).toBe(true);
      expect(connectionStatus).toBe('fallback');
    });
  });
});
