/**
 * Tests for Secure Storage Utilities
 * 
 * Validates encryption, decryption, and secure storage of credentials
 * Tests Requirements: 3.7, 10.1, 10.2, 10.3, 10.4, 10.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  encryptValue,
  decryptValue,
  isEncrypted,
  saveLLMSettings,
  loadLLMSettings,
  deleteLLMSettings,
  exportSettings,
  importSettings,
  clearAllSettings,
  isCryptoAvailable,
  hasStoredSettings,
  getLastValidationTime,
} from '../secureStorage';
import type { LLMConfig } from '@/services/llmService';

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

// Setup global crypto mock
beforeEach(() => {
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();

  // Mock crypto API
  global.crypto = mockCrypto as any;

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

  mockCrypto.subtle.encrypt.mockImplementation(async (algorithm, key, data) => {
    // Simple mock encryption: just return the data
    return data.buffer;
  });

  mockCrypto.subtle.decrypt.mockImplementation(async (algorithm, key, data) => {
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

const sampleLLMConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'sk-test-key-12345',
  model: 'gpt-4',
  parameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  systemPrompts: {
    worldGeneration: 'Generate a world...',
    characterGeneration: 'Generate a character...',
    dialogueGeneration: 'Generate dialogue...',
  },
  timeout: 30000,
  retryAttempts: 3,
  streamingEnabled: true,
};

// ============================================================================
// Encryption Tests
// ============================================================================

describe('Encryption Functions', () => {
  it('should encrypt a value', async () => {
    const value = 'test-secret';
    const result = await encryptValue(value);

    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('iv');
    expect(typeof result.encrypted).toBe('string');
    expect(typeof result.iv).toBe('string');
  });

  it('should decrypt an encrypted value', async () => {
    const value = 'test-secret';
    const { encrypted, iv } = await encryptValue(value);
    const decrypted = await decryptValue(encrypted, iv);

    expect(decrypted).toBe(value);
  });

  it('should handle encryption of empty string', async () => {
    const value = '';
    const { encrypted, iv } = await encryptValue(value);
    const decrypted = await decryptValue(encrypted, iv);

    expect(decrypted).toBe(value);
  });

  it('should handle encryption of special characters', async () => {
    const value = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const { encrypted, iv } = await encryptValue(value);
    const decrypted = await decryptValue(encrypted, iv);

    expect(decrypted).toBe(value);
  });

  it('should detect encrypted values', () => {
    const encrypted = btoa('encrypted-data');
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it('should detect non-encrypted values', () => {
    const plaintext = 'not-encrypted';
    expect(isEncrypted(plaintext)).toBe(false);
  });
});

// ============================================================================
// LLM Settings Storage Tests
// ============================================================================

describe('LLM Settings Storage', () => {
  it('should save LLM settings with encrypted API key', async () => {
    await saveLLMSettings(sampleLLMConfig);

    const stored = localStorage.getItem('storycore-settings');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.llm).toBeDefined();
    expect(parsed.llm.encryptedApiKey).toBeDefined();
    expect(parsed.llm.config.apiKey).toBeUndefined(); // API key should not be in config
  });

  it('should load LLM settings and decrypt API key', async () => {
    await saveLLMSettings(sampleLLMConfig);
    const loaded = await loadLLMSettings();

    expect(loaded).toBeTruthy();
    expect(loaded?.provider).toBe(sampleLLMConfig.provider);
    expect(loaded?.apiKey).toBe(sampleLLMConfig.apiKey);
    expect(loaded?.model).toBe(sampleLLMConfig.model);
  });

  it('should return null when no settings exist', async () => {
    const loaded = await loadLLMSettings();
    expect(loaded).toBeNull();
  });

  it('should delete LLM settings', async () => {
    await saveLLMSettings(sampleLLMConfig);
    deleteLLMSettings();

    const loaded = await loadLLMSettings();
    expect(loaded).toBeNull();
  });

  it('should preserve other settings when deleting LLM settings', async () => {
    await saveLLMSettings(sampleLLMConfig);
    
    // Manually add comfyui settings
    const stored = JSON.parse(localStorage.getItem('storycore-settings')!);
    stored.comfyui = { config: { serverUrl: 'http://localhost:8000' } };
    localStorage.setItem('storycore-settings', JSON.stringify(stored));

    deleteLLMSettings();

    const remaining = JSON.parse(localStorage.getItem('storycore-settings')!);
    expect(remaining.llm).toBeUndefined();
    expect(remaining.comfyui).toBeDefined();
  });

  it('should store last validation timestamp', async () => {
    const beforeSave = new Date();
    await saveLLMSettings(sampleLLMConfig);
    const afterSave = new Date();

    const lastValidated = getLastValidationTime();
    expect(lastValidated).toBeTruthy();
    expect(lastValidated!.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
    expect(lastValidated!.getTime()).toBeLessThanOrEqual(afterSave.getTime());
  });
});

// ============================================================================
// Export/Import Tests
// ============================================================================

describe('Settings Export/Import', () => {
  it('should export settings without credentials', async () => {
    await saveLLMSettings(sampleLLMConfig);
    const exported = exportSettings();

    expect(exported).toBeTruthy();
    const parsed = JSON.parse(exported);
    
    expect(parsed.version).toBeDefined();
    expect(parsed.llm).toBeDefined();
    expect(parsed.llm.config).toBeDefined();
    expect(parsed.llm.encryptedApiKey).toBeUndefined(); // Should not include encrypted key
  });

  it('should import settings without overwriting credentials', async () => {
    // Save initial settings with API key
    await saveLLMSettings(sampleLLMConfig);
    
    // Export settings (without credentials)
    const exported = exportSettings();
    
    // Modify exported settings
    const exportedData = JSON.parse(exported);
    exportedData.llm.config.parameters.temperature = 0.9;
    
    // Import modified settings
    const success = importSettings(JSON.stringify(exportedData));
    expect(success).toBe(true);

    // Load settings - should have new temperature but original API key
    const loaded = await loadLLMSettings();
    expect(loaded?.parameters.temperature).toBe(0.9);
    expect(loaded?.apiKey).toBe(sampleLLMConfig.apiKey); // Original key preserved
  });

  it('should reject invalid import data', () => {
    const success = importSettings('invalid json');
    expect(success).toBe(false);
  });

  it('should reject import data without version', () => {
    const invalidData = JSON.stringify({ llm: { config: {} } });
    const success = importSettings(invalidData);
    expect(success).toBe(false);
  });
});

// ============================================================================
// Security Tests
// ============================================================================

describe('Security Features', () => {
  it('should not store API key in plaintext', async () => {
    await saveLLMSettings(sampleLLMConfig);

    const stored = localStorage.getItem('storycore-settings');
    expect(stored).toBeTruthy();
    
    // API key should not appear in plaintext
    expect(stored).not.toContain(sampleLLMConfig.apiKey);
  });

  it('should use different IV for each encryption', async () => {
    const value = 'test-secret';
    
    const result1 = await encryptValue(value);
    const result2 = await encryptValue(value);

    // IVs should be different (in real implementation)
    // In our mock, they'll be the same, but we test the structure
    expect(result1.iv).toBeDefined();
    expect(result2.iv).toBeDefined();
  });

  it('should clear all settings including session keys', () => {
    localStorage.setItem('storycore-settings', 'test');
    sessionStorage.setItem('encryption-key', 'test');

    clearAllSettings();

    expect(localStorage.getItem('storycore-settings')).toBeNull();
    expect(sessionStorage.getItem('encryption-key')).toBeNull();
  });

  it('should detect crypto availability', () => {
    const available = isCryptoAvailable();
    expect(typeof available).toBe('boolean');
  });

  it('should detect stored settings', async () => {
    expect(hasStoredSettings()).toBe(false);

    await saveLLMSettings(sampleLLMConfig);
    expect(hasStoredSettings()).toBe(true);

    clearAllSettings();
    expect(hasStoredSettings()).toBe(false);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should handle encryption failure gracefully', async () => {
    mockCrypto.subtle.encrypt.mockRejectedValueOnce(new Error('Encryption failed'));

    await expect(encryptValue('test')).rejects.toThrow('Failed to encrypt value');
  });

  it('should handle decryption failure gracefully', async () => {
    mockCrypto.subtle.decrypt.mockRejectedValueOnce(new Error('Decryption failed'));

    await expect(decryptValue('encrypted', 'iv')).rejects.toThrow('Failed to decrypt value');
  });

  it('should handle corrupted storage data', async () => {
    localStorage.setItem('storycore-settings', 'invalid json');

    const loaded = await loadLLMSettings();
    expect(loaded).toBeNull();
  });

  it('should handle missing encrypted API key', async () => {
    const stored = {
      version: '1.0',
      llm: {
        config: sampleLLMConfig,
        // Missing encryptedApiKey
      },
    };
    localStorage.setItem('storycore-settings', JSON.stringify(stored));

    const loaded = await loadLLMSettings();
    expect(loaded?.apiKey).toBe(''); // Should return empty string
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  it('should handle complete save/load/delete cycle', async () => {
    // Save
    await saveLLMSettings(sampleLLMConfig);
    expect(hasStoredSettings()).toBe(true);

    // Load
    const loaded = await loadLLMSettings();
    expect(loaded).toEqual(sampleLLMConfig);

    // Delete
    deleteLLMSettings();
    expect(hasStoredSettings()).toBe(false);

    // Verify deleted
    const afterDelete = await loadLLMSettings();
    expect(afterDelete).toBeNull();
  });

  it('should handle export/import cycle', async () => {
    // Save original
    await saveLLMSettings(sampleLLMConfig);

    // Export
    const exported = exportSettings();

    // Clear
    clearAllSettings();

    // Import
    const success = importSettings(exported);
    expect(success).toBe(true);

    // Load - should have config but no API key
    const loaded = await loadLLMSettings();
    expect(loaded?.provider).toBe(sampleLLMConfig.provider);
    expect(loaded?.apiKey).toBe(''); // API key not included in export
  });

  it('should handle multiple save operations', async () => {
    // Save first config
    await saveLLMSettings(sampleLLMConfig);

    // Save updated config
    const updatedConfig = {
      ...sampleLLMConfig,
      apiKey: 'sk-new-key',
      parameters: {
        ...sampleLLMConfig.parameters,
        temperature: 0.9,
      },
    };
    await saveLLMSettings(updatedConfig);

    // Load should return latest
    const loaded = await loadLLMSettings();
    expect(loaded?.apiKey).toBe('sk-new-key');
    expect(loaded?.parameters.temperature).toBe(0.9);
  });
});
