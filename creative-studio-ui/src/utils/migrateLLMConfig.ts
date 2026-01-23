/**
 * LLM Configuration Migration Utility
 * 
 * Migrates LLM configuration from old storage systems to the new unified system.
 * Handles three legacy storage formats:
 * 1. llmConfigStorage (storycore_llm_config)
 * 2. settingsPropagation (llm-config)
 * 3. Partial secureStorage (storycore-settings without LLM)
 */

import { loadLLMSettings, saveLLMSettings } from './secureStorage';
import type { LLMConfig } from '@/services/llmService';

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Migrate LLM configuration from legacy storage systems
 * Returns true if migration was performed
 */
export async function migrateLLMConfig(): Promise<boolean> {
  try {

    // Check if new system already has configuration
    const newConfig = await loadLLMSettings();
    if (newConfig) {
      return false;
    }

    // Try to find configuration in legacy systems
    const migratedConfig = await findLegacyConfig();
    
    if (!migratedConfig) {
      return false;
    }

    // Save to new system
    await saveLLMSettings(migratedConfig);

    // Clean up legacy storage
    cleanupLegacyStorage();

    return true;
  } catch (error) {
    console.error('[Migration] Failed to migrate LLM config:', error);
    return false;
  }
}

/**
 * Find configuration in legacy storage systems
 * Priority: llmConfigStorage > settingsPropagation > default
 */
async function findLegacyConfig(): Promise<LLMConfig | null> {
  // Try llmConfigStorage (System 1)
  const config1 = await loadFromLLMConfigStorage();
  if (config1) {
    return config1;
  }

  // Try settingsPropagation (System 3)
  const config3 = loadFromSettingsPropagation();
  if (config3) {
    return config3;
  }

  return null;
}

/**
 * Load configuration from llmConfigStorage (System 1)
 */
async function loadFromLLMConfigStorage(): Promise<LLMConfig | null> {
  try {
    const configJson = localStorage.getItem('storycore_llm_config');
    const encryptedApiKey = localStorage.getItem('storycore_api_key_enc');

    if (!configJson) {
      return null;
    }

    const stored = JSON.parse(configJson);
    
    // Decrypt API key if present
    let apiKey = '';
    if (encryptedApiKey) {
      try {
        // Try to decrypt using the old system
        apiKey = await decryptLegacyAPIKey(encryptedApiKey);
      } catch (error) {
        console.warn('[Migration] Failed to decrypt API key:', error);
        // Continue without API key - user will need to re-enter
      }
    }

    // Convert to full LLMConfig
    return {
      provider: stored.provider || 'local',
      model: stored.model || 'gemma2:2b',
      apiKey,
      apiEndpoint: stored.provider === 'local' ? 'http://localhost:11434' : undefined,
      parameters: {
        temperature: stored.temperature || 0.7,
        maxTokens: stored.maxTokens || 2000,
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
      streamingEnabled: stored.streamingEnabled !== false,
    };
  } catch (error) {
    console.error('[Migration] Error loading from llmConfigStorage:', error);
    return null;
  }
}

/**
 * Load configuration from settingsPropagation (System 3)
 */
function loadFromSettingsPropagation(): LLMConfig | null {
  try {
    const configJson = localStorage.getItem('llm-config');
    if (!configJson) {
      return null;
    }

    const stored = JSON.parse(configJson);
    
    // Ensure all required fields are present
    if (!stored.provider || !stored.model) {
      return null;
    }

    return stored as LLMConfig;
  } catch (error) {
    console.error('[Migration] Error loading from settingsPropagation:', error);
    return null;
  }
}

/**
 * Decrypt API key from legacy llmConfigStorage system
 */
async function decryptLegacyAPIKey(encryptedData: string): Promise<string> {
  if (!encryptedData) {
    return '';
  }

  try {
    // Get encryption key from session storage
    const encKeyJson = sessionStorage.getItem('storycore_encryption_key');
    if (!encKeyJson) {
      throw new Error('Encryption key not found');
    }

    const keyData = JSON.parse(encKeyJson);
    const key = await crypto.subtle.importKey(
      'jwk',
      keyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Split encrypted data and IV
    const [encryptedBase64, ivBase64] = encryptedData.split(':');
    if (!encryptedBase64 || !ivBase64) {
      throw new Error('Invalid encrypted data format');
    }

    // Convert from base64
    const encryptedArray = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const ivArray = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      key,
      encryptedArray
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[Migration] Failed to decrypt legacy API key:', error);
    throw error;
  }
}

/**
 * Clean up legacy storage keys
 */
function cleanupLegacyStorage(): void {
  // System 1: llmConfigStorage
  localStorage.removeItem('storycore_llm_config');
  localStorage.removeItem('storycore_api_key_enc');
  sessionStorage.removeItem('storycore_encryption_key');

  // System 3: settingsPropagation
  localStorage.removeItem('llm-config');

}

/**
 * Initialize LLM configuration with migration
 * Call this once during application startup
 */
export async function initializeLLMConfig(): Promise<void> {

  const migrated = await migrateLLMConfig();
  
  if (migrated) {
    
    // Show notification to user (optional)
    if (typeof window !== 'undefined') {
      // Could emit an event or show a toast here
      console.info('Your LLM configuration has been migrated to the new system');
    }
  } else {
  }
}

/**
 * Check if migration is needed
 * Useful for showing migration status in UI
 */
export function needsMigration(): boolean {
  const hasLegacyConfig1 = localStorage.getItem('storycore_llm_config') !== null;
  const hasLegacyConfig3 = localStorage.getItem('llm-config') !== null;
  
  return hasLegacyConfig1 || hasLegacyConfig3;
}

/**
 * Get migration status information
 */
export interface MigrationStatus {
  needed: boolean;
  sources: string[];
  hasNewConfig: boolean;
}

export async function getMigrationStatus(): Promise<MigrationStatus> {
  const sources: string[] = [];
  
  if (localStorage.getItem('storycore_llm_config')) {
    sources.push('llmConfigStorage');
  }
  if (localStorage.getItem('llm-config')) {
    sources.push('settingsPropagation');
  }

  const newConfig = await loadLLMSettings();
  
  return {
    needed: sources.length > 0 && !newConfig,
    sources,
    hasNewConfig: !!newConfig,
  };
}
