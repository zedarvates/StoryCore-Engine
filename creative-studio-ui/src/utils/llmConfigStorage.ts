/**
 * LLM Configuration Storage Utilities
 * 
 * Provides localStorage wrapper functions for LLM configuration with encryption support.
 * Implements requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7 from the LLM Chatbox Enhancement spec.
 */

import type { LLMProvider } from '@/services/llmService';

// ============================================================================
// Types
// ============================================================================

/**
 * Language codes supported by the chatbox
 */
export type LanguageCode = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ja' | 'zh' | 'ko';

/**
 * LLM configuration for chatbox (simplified from full LLMConfig)
 */
export interface ChatboxLLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number; // 0-2
  maxTokens: number; // 100-4000
  apiKey: string;
  streamingEnabled: boolean;
}

/**
 * Stored LLM configuration (without plain API key)
 */
export interface StoredLLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  streamingEnabled: boolean;
  lastValidated?: string; // ISO timestamp
}

/**
 * Language preference storage
 */
export interface StoredLanguagePreference {
  code: LanguageCode;
  setAt: string; // ISO timestamp
  autoDetected: boolean;
}



// ============================================================================
// Constants
// ============================================================================

/**
 * LocalStorage keys for chatbox configuration
 */
export const STORAGE_KEYS = {
  LLM_CONFIG: 'storycore_llm_config',
  LANGUAGE_PREF: 'storycore_language_preference',
  API_KEY_ENCRYPTED: 'storycore_api_key_enc',
} as const;

/**
 * Default LLM configuration
 */
export const DEFAULT_LLM_CONFIG: ChatboxLLMConfig = {
  provider: 'local',
  model: 'llama3.2:1b', // Modèle Ollama léger par défaut
  temperature: 0.7,
  maxTokens: 2000,
  apiKey: '',
  streamingEnabled: true,
};

/**
 * Default language (English)
 */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * Encryption algorithm and parameters
 */
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const ENCRYPTION_KEY_STORAGE = 'storycore_encryption_key';

// ============================================================================
// Encryption Key Management
// ============================================================================

/**
 * Generate or retrieve encryption key from session storage
 * Key is session-specific for security
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Check if key exists in session storage
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_STORAGE);
  
  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.warn('Failed to import stored encryption key, generating new one');
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  // Store key in session storage
  const exportedKey = await crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(exportedKey));

  return key;
}

// ============================================================================
// Encryption Functions
// ============================================================================

/**
 * Encrypt API key using Web Crypto API
 * Implements requirements 6.6, 6.7
 */
export async function encryptAPIKey(apiKey: string): Promise<string> {
  if (!apiKey) {
    return '';
  }

  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);

    const encrypted = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      data
    );

    // Convert to base64 for storage
    const encryptedArray = new Uint8Array(encrypted);
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    // Combine encrypted data and IV with separator
    return `${encryptedBase64}:${ivBase64}`;
  } catch (error) {
    console.error('API key encryption failed:', error);
    throw new Error('Failed to encrypt API key');
  }
}

/**
 * Decrypt API key using Web Crypto API
 * Implements requirements 6.6, 6.7
 */
export async function decryptAPIKey(encryptedData: string): Promise<string> {
  if (!encryptedData) {
    return '';
  }

  try {
    const key = await getEncryptionKey();
    
    // Split encrypted data and IV
    const [encryptedBase64, ivBase64] = encryptedData.split(':');
    if (!encryptedBase64 || !ivBase64) {
      throw new Error('Invalid encrypted data format');
    }

    // Convert from base64
    const encryptedArray = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const ivArray = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv: ivArray },
      key,
      encryptedArray
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('API key decryption failed:', error);
    throw new Error('Failed to decrypt API key');
  }
}

// ============================================================================
// Configuration Storage Functions
// ============================================================================

/**
 * Save LLM configuration to localStorage
 * Implements requirements 1.7, 6.4
 */
export async function saveConfiguration(config: ChatboxLLMConfig): Promise<void> {
  try {
    // Encrypt API key
    const encryptedApiKey = await encryptAPIKey(config.apiKey);

    // Store configuration without API key
    const storedConfig: StoredLLMConfig = {
      provider: config.provider,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streamingEnabled: config.streamingEnabled,
      lastValidated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.LLM_CONFIG, JSON.stringify(storedConfig));
    localStorage.setItem(STORAGE_KEYS.API_KEY_ENCRYPTED, encryptedApiKey);
  } catch (error) {
    console.error('Failed to save LLM configuration:', error);
    throw new Error('Failed to save configuration. Please try again.');
  }
}

/**
 * Load LLM configuration from localStorage
 * Implements requirements 6.1, 6.2
 */
export async function loadConfiguration(): Promise<ChatboxLLMConfig | null> {
  try {
    const configJson = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    const encryptedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY_ENCRYPTED);

    if (!configJson) {
      return null;
    }

    const storedConfig: StoredLLMConfig = JSON.parse(configJson);

    // Decrypt API key
    const apiKey = encryptedApiKey ? await decryptAPIKey(encryptedApiKey) : '';

    // Reconstruct full configuration
    return {
      provider: storedConfig.provider,
      model: storedConfig.model,
      temperature: storedConfig.temperature,
      maxTokens: storedConfig.maxTokens,
      apiKey,
      streamingEnabled: storedConfig.streamingEnabled,
    };
  } catch (error) {
    console.error('Failed to load LLM configuration:', error);
    return null;
  }
}

/**
 * Get default configuration
 * Implements requirement 6.3
 */
export function getDefaultConfiguration(): ChatboxLLMConfig {
  return { ...DEFAULT_LLM_CONFIG };
}

/**
 * Delete LLM configuration from localStorage
 */
export function deleteConfiguration(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.LLM_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.API_KEY_ENCRYPTED);
  } catch (error) {
    console.error('Failed to delete LLM configuration:', error);
    throw new Error('Failed to delete configuration');
  }
}

// ============================================================================
// Language Preference Functions
// ============================================================================

/**
 * Save language preference to localStorage
 * Implements requirements 2.4, 6.5
 */
export function saveLanguagePreference(language: LanguageCode, autoDetected: boolean = false): void {
  try {
    const preference: StoredLanguagePreference = {
      code: language,
      setAt: new Date().toISOString(),
      autoDetected,
    };

    localStorage.setItem(STORAGE_KEYS.LANGUAGE_PREF, JSON.stringify(preference));
  } catch (error) {
    console.error('Failed to save language preference:', error);
    throw new Error('Failed to save language preference');
  }
}

/**
 * Load language preference from localStorage
 * Implements requirements 6.1, 6.2
 */
export function loadLanguagePreference(): LanguageCode | null {
  try {
    const prefJson = localStorage.getItem(STORAGE_KEYS.LANGUAGE_PREF);

    if (!prefJson) {
      return null;
    }

    const preference: StoredLanguagePreference = JSON.parse(prefJson);
    return preference.code;
  } catch (error) {
    console.error('Failed to load language preference:', error);
    return null;
  }
}

/**
 * Detect browser language and map to supported language code
 * Implements requirement 2.3
 */
export function detectBrowserLanguage(): LanguageCode {
  try {
    const browserLang = navigator.language.toLowerCase();

    // Map browser language codes to supported languages
    if (browserLang.startsWith('fr')) return 'fr';
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('de')) return 'de';
    if (browserLang.startsWith('it')) return 'it';
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('ja')) return 'ja';
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('en')) return 'en';

    // Default to English for unsupported languages
    return DEFAULT_LANGUAGE;
  } catch (error) {
    console.error('Failed to detect browser language:', error);
    return DEFAULT_LANGUAGE;
  }
}

/**
 * Get language preference with auto-detection fallback
 * Implements requirements 2.3, 6.1, 6.2
 */
export function getLanguagePreference(): LanguageCode {
  const stored = loadLanguagePreference();
  if (stored) {
    return stored;
  }

  // Auto-detect and save
  const detected = detectBrowserLanguage();
  saveLanguagePreference(detected, true);
  return detected;
}

// ============================================================================
// Configuration Validation Functions
// ============================================================================

/**
 * Validate LLM configuration
 * Implements requirement 6.3
 */
export function validateConfiguration(config: Partial<ChatboxLLMConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate provider
  if (config.provider) {
    const validProviders: LLMProvider[] = ['openai', 'anthropic', 'local', 'custom'];
    if (!validProviders.includes(config.provider)) {
      errors.push(`Invalid provider: ${config.provider}`);
    }
  }

  // Validate model
  if (config.model !== undefined && typeof config.model !== 'string') {
    errors.push('Model must be a string');
  }

  // Validate temperature (0-2)
  if (config.temperature !== undefined) {
    if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
      errors.push('Temperature must be a number between 0 and 2');
    }
  }

  // Validate maxTokens (100-4000)
  if (config.maxTokens !== undefined) {
    if (typeof config.maxTokens !== 'number' || config.maxTokens < 100 || config.maxTokens > 4000) {
      errors.push('Max tokens must be a number between 100 and 4000');
    }
  }

  // Validate API key (if provided)
  if (config.apiKey !== undefined && typeof config.apiKey !== 'string') {
    errors.push('API key must be a string');
  }

  // Validate streaming enabled
  if (config.streamingEnabled !== undefined && typeof config.streamingEnabled !== 'boolean') {
    errors.push('Streaming enabled must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate language code
 */
export function validateLanguageCode(code: string): code is LanguageCode {
  const validCodes: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
  return validCodes.includes(code as LanguageCode);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.encrypt === 'function'
  );
}

/**
 * Check if configuration exists in localStorage
 */
export function hasStoredConfiguration(): boolean {
  return localStorage.getItem(STORAGE_KEYS.LLM_CONFIG) !== null;
}

/**
 * Check if language preference exists in localStorage
 */
export function hasStoredLanguagePreference(): boolean {
  return localStorage.getItem(STORAGE_KEYS.LANGUAGE_PREF) !== null;
}

/**
 * Get last validation timestamp
 */
export function getLastValidationTime(): Date | null {
  try {
    const configJson = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    if (!configJson) {
      return null;
    }

    const config: StoredLLMConfig = JSON.parse(configJson);
    return config.lastValidated ? new Date(config.lastValidated) : null;
  } catch (error) {
    console.error('Failed to get last validation time:', error);
    return null;
  }
}

/**
 * Clear all chatbox storage (configuration and language preference)
 */
export function clearAllStorage(): void {
  try {
    deleteConfiguration();
    localStorage.removeItem(STORAGE_KEYS.LANGUAGE_PREF);
    sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE);
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw new Error('Failed to clear storage');
  }
}
