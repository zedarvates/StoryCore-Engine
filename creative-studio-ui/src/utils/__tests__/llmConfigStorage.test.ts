/**
 * Tests for LLM Configuration Storage Utilities
 * 
 * Validates configuration storage, encryption, and language preference management
 * Tests Requirements: 1.7, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encryptAPIKey,
  decryptAPIKey,
  saveConfiguration,
  loadConfiguration,
  getDefaultConfiguration,
  deleteConfiguration,
  saveLanguagePreference,
  loadLanguagePreference,
  detectBrowserLanguage,
  getLanguagePreference,
  validateConfiguration,
  validateLanguageCode,
  isCryptoAvailable,
  hasStoredConfiguration,
  hasStoredLanguagePreference,
  getLastValidationTime,
  clearAllStorage,
  DEFAULT_LLM_CONFIG,
  DEFAULT_LANGUAGE,
  STORAGE_KEYS,
  type ChatboxLLMConfig,
  type LanguageCode,
} from '../llmConfigStorage';

// ============================================================================
// Test Setup
// ============================================================================

// Mock crypto.subtle for testing
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    importKey: vi.fn(),
    exportKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    // Fill with predictable values for testing
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i;
    }
    return arr;
  }),
};

// Mock navigator.language
const mockNavigator = {
  language: 'en-US',
};

// Setup global mocks
beforeEach(() => {
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();

  // Mock crypto API
  global.crypto = mockCrypto as any;

  // Mock navigator
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true,
  });

  // Mock crypto.subtle methods
  mockCrypto.subtle.generateKey.mockResolvedValue({
    type: 'secret',
    algorithm: { name: 'AES-GCM', length: 256 },
  } as any);

  mockCrypto.subtle.importKey.mockResolvedValue({
    type: 'secret',
    algorithm: { name: 'AES-GCM', length: 256 },
  } as any);

  mockCrypto.subtle.exportKey.mockResolvedValue({
    kty: 'oct',
    k: 'test-key',
    alg: 'A256GCM',
  } as any);

  mockCrypto.subtle.encrypt.mockImplementation(async (_algorithm, _key, data) => {
    // Simple mock encryption: just return the data
    return data.buffer;
  });

  mockCrypto.subtle.decrypt.mockImplementation(async (_algorithm, _key, data) => {
    // Simple mock decryption: just return the data
    return data;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Sample Data
// ============================================================================

const sampleConfig: ChatboxLLMConfig = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  apiKey: 'sk-test-key-12345',
  streamingEnabled: true,
};

// ============================================================================
// API Key Encryption Tests (Requirements 6.6, 6.7)
// ============================================================================

describe('API Key Encryption', () => {
  it('should encrypt an API key', async () => {
    const apiKey = 'sk-test-key-12345';
    const encrypted = await encryptAPIKey(apiKey);

    expect(encrypted).toBeTruthy();
    expect(typeof encrypted).toBe('string');
    expect(encrypted).toContain(':'); // Should have encrypted:iv format
  });

  it('should decrypt an encrypted API key', async () => {
    const apiKey = 'sk-test-key-12345';
    const encrypted = await encryptAPIKey(apiKey);
    const decrypted = await decryptAPIKey(encrypted);

    expect(decrypted).toBe(apiKey);
  });

  it('should handle empty API key', async () => {
    const encrypted = await encryptAPIKey('');
    expect(encrypted).toBe('');

    const decrypted = await decryptAPIKey('');
    expect(decrypted).toBe('');
  });

  it('should handle special characters in API key', async () => {
    const apiKey = 'sk-!@#$%^&*()_+-=[]{}|;:,.<>?';
    const encrypted = await encryptAPIKey(apiKey);
    const decrypted = await decryptAPIKey(encrypted);

    expect(decrypted).toBe(apiKey);
  });

  it('should throw error on encryption failure', async () => {
    mockCrypto.subtle.encrypt.mockRejectedValueOnce(new Error('Encryption failed'));

    await expect(encryptAPIKey('test-key')).rejects.toThrow('Failed to encrypt API key');
  });

  it('should throw error on decryption failure', async () => {
    mockCrypto.subtle.decrypt.mockRejectedValueOnce(new Error('Decryption failed'));

    await expect(decryptAPIKey('encrypted:iv')).rejects.toThrow('Failed to decrypt API key');
  });

  it('should throw error on invalid encrypted data format', async () => {
    await expect(decryptAPIKey('invalid-format')).rejects.toThrow('Failed to decrypt API key');
  });
});

// ============================================================================
// Configuration Storage Tests (Requirements 1.7, 6.4)
// ============================================================================

describe('Configuration Storage', () => {
  it('should save configuration with encrypted API key', async () => {
    await saveConfiguration(sampleConfig);

    const storedConfig = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    const storedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY_ENCRYPTED);

    expect(storedConfig).toBeTruthy();
    expect(storedApiKey).toBeTruthy();

    const parsed = JSON.parse(storedConfig!);
    expect(parsed.provider).toBe(sampleConfig.provider);
    expect(parsed.model).toBe(sampleConfig.model);
    expect(parsed.temperature).toBe(sampleConfig.temperature);
    expect(parsed.maxTokens).toBe(sampleConfig.maxTokens);
    expect(parsed.streamingEnabled).toBe(sampleConfig.streamingEnabled);
    expect(parsed.lastValidated).toBeTruthy();
    
    // API key should not be in config
    expect(parsed.apiKey).toBeUndefined();
  });

  it('should not store API key in plaintext', async () => {
    await saveConfiguration(sampleConfig);

    const storedConfig = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    const storedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY_ENCRYPTED);

    expect(storedConfig).not.toContain(sampleConfig.apiKey);
    expect(storedApiKey).toBeTruthy();
  });

  it('should load configuration and decrypt API key', async () => {
    await saveConfiguration(sampleConfig);
    const loaded = await loadConfiguration();

    expect(loaded).toBeTruthy();
    expect(loaded?.provider).toBe(sampleConfig.provider);
    expect(loaded?.model).toBe(sampleConfig.model);
    expect(loaded?.temperature).toBe(sampleConfig.temperature);
    expect(loaded?.maxTokens).toBe(sampleConfig.maxTokens);
    expect(loaded?.apiKey).toBe(sampleConfig.apiKey);
    expect(loaded?.streamingEnabled).toBe(sampleConfig.streamingEnabled);
  });

  it('should return null when no configuration exists', async () => {
    const loaded = await loadConfiguration();
    expect(loaded).toBeNull();
  });

  it('should delete configuration', async () => {
    await saveConfiguration(sampleConfig);
    deleteConfiguration();

    const loaded = await loadConfiguration();
    expect(loaded).toBeNull();
  });

  it('should get default configuration', () => {
    const defaultConfig = getDefaultConfiguration();

    expect(defaultConfig).toEqual(DEFAULT_LLM_CONFIG);
    expect(defaultConfig.provider).toBe('openai');
    expect(defaultConfig.model).toBe('gpt-4');
    expect(defaultConfig.temperature).toBe(0.7);
    expect(defaultConfig.maxTokens).toBe(2000);
    expect(defaultConfig.apiKey).toBe('');
    expect(defaultConfig.streamingEnabled).toBe(true);
  });

  it('should store last validation timestamp', async () => {
    const beforeSave = new Date();
    await saveConfiguration(sampleConfig);
    const afterSave = new Date();

    const lastValidated = getLastValidationTime();
    expect(lastValidated).toBeTruthy();
    expect(lastValidated!.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
    expect(lastValidated!.getTime()).toBeLessThanOrEqual(afterSave.getTime());
  });

  it('should handle corrupted storage data', async () => {
    localStorage.setItem(STORAGE_KEYS.LLM_CONFIG, 'invalid json');

    const loaded = await loadConfiguration();
    expect(loaded).toBeNull();
  });

  it('should handle missing encrypted API key', async () => {
    const storedConfig = {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      streamingEnabled: true,
    };
    localStorage.setItem(STORAGE_KEYS.LLM_CONFIG, JSON.stringify(storedConfig));

    const loaded = await loadConfiguration();
    expect(loaded?.apiKey).toBe('');
  });

  it('should throw error on save failure', async () => {
    mockCrypto.subtle.encrypt.mockRejectedValueOnce(new Error('Encryption failed'));

    await expect(saveConfiguration(sampleConfig)).rejects.toThrow('Failed to save configuration');
  });
});

// ============================================================================
// Language Preference Tests (Requirements 2.3, 2.4, 6.5)
// ============================================================================

describe('Language Preference', () => {
  it('should save language preference', () => {
    saveLanguagePreference('fr');

    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE_PREF);
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.code).toBe('fr');
    expect(parsed.setAt).toBeTruthy();
    expect(parsed.autoDetected).toBe(false);
  });

  it('should save language preference with auto-detected flag', () => {
    saveLanguagePreference('en', true);

    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE_PREF);
    const parsed = JSON.parse(stored!);
    
    expect(parsed.code).toBe('en');
    expect(parsed.autoDetected).toBe(true);
  });

  it('should load language preference', () => {
    saveLanguagePreference('es');
    const loaded = loadLanguagePreference();

    expect(loaded).toBe('es');
  });

  it('should return null when no language preference exists', () => {
    const loaded = loadLanguagePreference();
    expect(loaded).toBeNull();
  });

  it('should detect browser language - French', () => {
    mockNavigator.language = 'fr-FR';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('fr');
  });

  it('should detect browser language - English', () => {
    mockNavigator.language = 'en-US';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('en');
  });

  it('should detect browser language - Spanish', () => {
    mockNavigator.language = 'es-ES';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('es');
  });

  it('should detect browser language - German', () => {
    mockNavigator.language = 'de-DE';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('de');
  });

  it('should detect browser language - Italian', () => {
    mockNavigator.language = 'it-IT';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('it');
  });

  it('should detect browser language - Portuguese', () => {
    mockNavigator.language = 'pt-BR';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('pt');
  });

  it('should detect browser language - Japanese', () => {
    mockNavigator.language = 'ja-JP';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('ja');
  });

  it('should detect browser language - Chinese', () => {
    mockNavigator.language = 'zh-CN';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('zh');
  });

  it('should detect browser language - Korean', () => {
    mockNavigator.language = 'ko-KR';
    const detected = detectBrowserLanguage();
    expect(detected).toBe('ko');
  });

  it('should default to English for unsupported language', () => {
    mockNavigator.language = 'ru-RU';
    const detected = detectBrowserLanguage();
    expect(detected).toBe(DEFAULT_LANGUAGE);
  });

  it('should get language preference with auto-detection fallback', () => {
    mockNavigator.language = 'fr-FR';
    const language = getLanguagePreference();

    expect(language).toBe('fr');

    // Should have saved the auto-detected preference
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE_PREF);
    const parsed = JSON.parse(stored!);
    expect(parsed.autoDetected).toBe(true);
  });

  it('should return stored preference over auto-detection', () => {
    mockNavigator.language = 'fr-FR';
    saveLanguagePreference('es', false);

    const language = getLanguagePreference();
    expect(language).toBe('es'); // Should return stored, not detected
  });

  it('should handle corrupted language preference data', () => {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE_PREF, 'invalid json');

    const loaded = loadLanguagePreference();
    expect(loaded).toBeNull();
  });
});

// ============================================================================
// Configuration Validation Tests (Requirement 6.3)
// ============================================================================

describe('Configuration Validation', () => {
  it('should validate valid configuration', () => {
    const result = validateConfiguration(sampleConfig);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate partial configuration', () => {
    const result = validateConfiguration({
      provider: 'anthropic',
      temperature: 0.5,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid provider', () => {
    const result = validateConfiguration({
      provider: 'invalid' as any,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid provider: invalid');
  });

  it('should reject invalid model type', () => {
    const result = validateConfiguration({
      model: 123 as any,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Model must be a string');
  });

  it('should reject temperature below 0', () => {
    const result = validateConfiguration({
      temperature: -0.1,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Temperature must be a number between 0 and 2');
  });

  it('should reject temperature above 2', () => {
    const result = validateConfiguration({
      temperature: 2.1,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Temperature must be a number between 0 and 2');
  });

  it('should accept temperature at boundaries', () => {
    const result1 = validateConfiguration({ temperature: 0 });
    const result2 = validateConfiguration({ temperature: 2 });

    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
  });

  it('should reject maxTokens below 100', () => {
    const result = validateConfiguration({
      maxTokens: 99,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Max tokens must be a number between 100 and 4000');
  });

  it('should reject maxTokens above 4000', () => {
    const result = validateConfiguration({
      maxTokens: 4001,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Max tokens must be a number between 100 and 4000');
  });

  it('should accept maxTokens at boundaries', () => {
    const result1 = validateConfiguration({ maxTokens: 100 });
    const result2 = validateConfiguration({ maxTokens: 4000 });

    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
  });

  it('should reject invalid API key type', () => {
    const result = validateConfiguration({
      apiKey: 123 as any,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('API key must be a string');
  });

  it('should reject invalid streamingEnabled type', () => {
    const result = validateConfiguration({
      streamingEnabled: 'true' as any,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Streaming enabled must be a boolean');
  });

  it('should accumulate multiple errors', () => {
    const result = validateConfiguration({
      provider: 'invalid' as any,
      temperature: 3,
      maxTokens: 50,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should validate language code - valid codes', () => {
    const validCodes: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];

    validCodes.forEach(code => {
      expect(validateLanguageCode(code)).toBe(true);
    });
  });

  it('should validate language code - invalid codes', () => {
    expect(validateLanguageCode('ru')).toBe(false);
    expect(validateLanguageCode('invalid')).toBe(false);
    expect(validateLanguageCode('')).toBe(false);
  });
});

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('Utility Functions', () => {
  it('should detect crypto availability', () => {
    const available = isCryptoAvailable();
    expect(typeof available).toBe('boolean');
    expect(available).toBe(true); // Should be true with our mock
  });

  it('should detect stored configuration', async () => {
    expect(hasStoredConfiguration()).toBe(false);

    await saveConfiguration(sampleConfig);
    expect(hasStoredConfiguration()).toBe(true);

    deleteConfiguration();
    expect(hasStoredConfiguration()).toBe(false);
  });

  it('should detect stored language preference', () => {
    expect(hasStoredLanguagePreference()).toBe(false);

    saveLanguagePreference('fr');
    expect(hasStoredLanguagePreference()).toBe(true);

    localStorage.removeItem(STORAGE_KEYS.LANGUAGE_PREF);
    expect(hasStoredLanguagePreference()).toBe(false);
  });

  it('should get last validation time', async () => {
    expect(getLastValidationTime()).toBeNull();

    await saveConfiguration(sampleConfig);
    const lastValidated = getLastValidationTime();
    
    expect(lastValidated).toBeTruthy();
    expect(lastValidated).toBeInstanceOf(Date);
  });

  it('should return null for last validation time when no config exists', () => {
    const lastValidated = getLastValidationTime();
    expect(lastValidated).toBeNull();
  });

  it('should clear all storage', async () => {
    await saveConfiguration(sampleConfig);
    saveLanguagePreference('fr');
    sessionStorage.setItem('storycore_encryption_key', 'test');

    clearAllStorage();

    expect(localStorage.getItem(STORAGE_KEYS.LLM_CONFIG)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.API_KEY_ENCRYPTED)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.LANGUAGE_PREF)).toBeNull();
    expect(sessionStorage.getItem('storycore_encryption_key')).toBeNull();
  });
});

// ============================================================================
// Integration Tests (Requirements 6.1, 6.2, 6.4, 6.5)
// ============================================================================

describe('Integration Tests', () => {
  it('should handle complete configuration lifecycle', async () => {
    // Save
    await saveConfiguration(sampleConfig);
    expect(hasStoredConfiguration()).toBe(true);

    // Load
    const loaded = await loadConfiguration();
    expect(loaded).toEqual(sampleConfig);

    // Delete
    deleteConfiguration();
    expect(hasStoredConfiguration()).toBe(false);

    // Verify deleted
    const afterDelete = await loadConfiguration();
    expect(afterDelete).toBeNull();
  });

  it('should handle complete language preference lifecycle', () => {
    // Save
    saveLanguagePreference('fr');
    expect(hasStoredLanguagePreference()).toBe(true);

    // Load
    const loaded = loadLanguagePreference();
    expect(loaded).toBe('fr');

    // Clear
    localStorage.removeItem(STORAGE_KEYS.LANGUAGE_PREF);
    expect(hasStoredLanguagePreference()).toBe(false);

    // Verify cleared
    const afterClear = loadLanguagePreference();
    expect(afterClear).toBeNull();
  });

  it('should handle multiple save operations', async () => {
    // Save first config
    await saveConfiguration(sampleConfig);

    // Save updated config
    const updatedConfig: ChatboxLLMConfig = {
      ...sampleConfig,
      apiKey: 'sk-new-key',
      temperature: 0.9,
    };
    await saveConfiguration(updatedConfig);

    // Load should return latest
    const loaded = await loadConfiguration();
    expect(loaded?.apiKey).toBe('sk-new-key');
    expect(loaded?.temperature).toBe(0.9);
  });

  it('should handle configuration and language preference independently', async () => {
    // Save both
    await saveConfiguration(sampleConfig);
    saveLanguagePreference('fr');

    // Delete configuration
    deleteConfiguration();

    // Language preference should still exist
    expect(hasStoredLanguagePreference()).toBe(true);
    expect(loadLanguagePreference()).toBe('fr');

    // Configuration should be gone
    expect(hasStoredConfiguration()).toBe(false);
    expect(await loadConfiguration()).toBeNull();
  });

  it('should handle auto-detection and manual override', () => {
    mockNavigator.language = 'fr-FR';

    // First call should auto-detect
    const detected = getLanguagePreference();
    expect(detected).toBe('fr');

    // Manual override
    saveLanguagePreference('es', false);

    // Should return manual preference
    const manual = getLanguagePreference();
    expect(manual).toBe('es');
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  it('should have correct storage keys', () => {
    expect(STORAGE_KEYS.LLM_CONFIG).toBe('storycore_llm_config');
    expect(STORAGE_KEYS.LANGUAGE_PREF).toBe('storycore_language_preference');
    expect(STORAGE_KEYS.API_KEY_ENCRYPTED).toBe('storycore_api_key_enc');
  });

  it('should have correct default configuration', () => {
    expect(DEFAULT_LLM_CONFIG.provider).toBe('openai');
    expect(DEFAULT_LLM_CONFIG.model).toBe('gpt-4');
    expect(DEFAULT_LLM_CONFIG.temperature).toBe(0.7);
    expect(DEFAULT_LLM_CONFIG.maxTokens).toBe(2000);
    expect(DEFAULT_LLM_CONFIG.apiKey).toBe('');
    expect(DEFAULT_LLM_CONFIG.streamingEnabled).toBe(true);
  });

  it('should have correct default language', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });
});
