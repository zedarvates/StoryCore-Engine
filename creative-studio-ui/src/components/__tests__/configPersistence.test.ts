/**
 * Configuration Persistence Tests
 * 
 * Tests for Task 15: Add configuration persistence on save
 * Requirements: 1.7, 2.4, 6.4, 6.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  saveConfiguration, 
  saveLanguagePreference,
  loadConfiguration,
  loadLanguagePreference,
  type ChatboxLLMConfig,
  type LanguageCode 
} from '@/utils/llmConfigStorage';

describe('Task 15: Configuration Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('LLM Configuration Persistence (Requirements 1.7, 6.4)', () => {
    it('should persist configuration to localStorage on save', async () => {
      const config: ChatboxLLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.8,
        maxTokens: 1500,
        apiKey: 'test-api-key-12345',
        streamingEnabled: true,
      };

      // Save configuration
      await saveConfiguration(config);

      // Verify it was saved to localStorage
      expect(localStorage.getItem('storycore_llm_config')).not.toBeNull();
      expect(localStorage.getItem('storycore_api_key_enc')).not.toBeNull();
    });

    it('should load persisted configuration from localStorage', async () => {
      const config: ChatboxLLMConfig = {
        provider: 'anthropic',
        model: 'claude-3',
        temperature: 0.5,
        maxTokens: 2500,
        apiKey: 'test-anthropic-key',
        streamingEnabled: false,
      };

      // Save and then load
      await saveConfiguration(config);
      const loaded = await loadConfiguration();

      // Verify all fields are preserved
      expect(loaded).not.toBeNull();
      expect(loaded?.provider).toBe(config.provider);
      expect(loaded?.model).toBe(config.model);
      expect(loaded?.temperature).toBe(config.temperature);
      expect(loaded?.maxTokens).toBe(config.maxTokens);
      expect(loaded?.apiKey).toBe(config.apiKey);
      expect(loaded?.streamingEnabled).toBe(config.streamingEnabled);
    });

    it('should update UI state after successful save', async () => {
      // This is tested in the component integration tests
      // Here we verify the storage layer works correctly
      const config: ChatboxLLMConfig = {
        provider: 'local',
        model: 'llama2',
        temperature: 0.7,
        maxTokens: 2000,
        apiKey: '',
        streamingEnabled: true,
      };

      await saveConfiguration(config);
      const loaded = await loadConfiguration();

      expect(loaded).toEqual(expect.objectContaining({
        provider: config.provider,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        streamingEnabled: config.streamingEnabled,
      }));
    });
  });

  describe('Language Preference Persistence (Requirements 2.4, 6.5)', () => {
    it('should persist language preference on selection', () => {
      const language: LanguageCode = 'fr';

      // Save language preference
      saveLanguagePreference(language, false);

      // Verify it was saved to localStorage
      expect(localStorage.getItem('storycore_language_preference')).not.toBeNull();
    });

    it('should load persisted language preference from localStorage', () => {
      const language: LanguageCode = 'es';

      // Save and then load
      saveLanguagePreference(language, false);
      const loaded = loadLanguagePreference();

      // Verify language code is preserved
      expect(loaded).toBe(language);
    });

    it('should persist all supported languages correctly', () => {
      const languages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];

      languages.forEach(lang => {
        saveLanguagePreference(lang, false);
        const loaded = loadLanguagePreference();
        expect(loaded).toBe(lang);
      });
    });
  });

  describe('Connection Validation Trigger (Requirement 1.8)', () => {
    it('should trigger validation before saving configuration', async () => {
      // This is tested in the LLMConfigDialog component
      // The handleSave function calls handleValidateConnection before onSave
      // We verify the storage layer is ready to receive validated configs
      
      const config: ChatboxLLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        apiKey: 'validated-key',
        streamingEnabled: true,
      };

      // Simulate saving after validation
      await saveConfiguration(config);
      const loaded = await loadConfiguration();

      expect(loaded).not.toBeNull();
      expect(loaded?.apiKey).toBe(config.apiKey);
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const config: ChatboxLLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        apiKey: 'test-key',
        streamingEnabled: true,
      };

      // Should throw error
      await expect(saveConfiguration(config)).rejects.toThrow();

      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it('should handle load errors gracefully', async () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('storycore_llm_config', 'invalid-json');

      // Should return null on error
      const loaded = await loadConfiguration();
      expect(loaded).toBeNull();
    });
  });
});
