/**
 * Secure Storage Utilities
 * 
 * Provides encryption and secure storage for sensitive credentials using Web Crypto API.
 * Implements requirements for credential security (10.1, 10.2, 10.3, 10.4, 10.6).
 */

import type { LLMConfig } from '@/services/llmService';

// ============================================================================
// Types
// ============================================================================

/**
 * Stored settings with encrypted credentials
 */
export interface StoredSettings {
  llm?: {
    config: Omit<LLMConfig, 'apiKey'>;
    encryptedApiKey?: string;
    lastValidated?: string;
  };
  comfyui?: {
    // Using 'any' for ComfyUI config to support flexible configuration schemas
    // that may vary between ComfyUI versions and custom setups
    config: unknown; // ComfyUI config without credentials
    encryptedCredentials?: string;
    lastValidated?: string;
  };
  version: string;
}

/**
 * Encryption result
 */
interface EncryptionResult {
  encrypted: string;
  iv: string;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_STORAGE_KEY = 'storycore-settings';
const SETTINGS_VERSION = '1.0';
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// ============================================================================
// Encryption Key Management
// ============================================================================

/**
 * Generate or retrieve encryption key from session storage
 * Key is session-specific for security
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  // Check if key exists in session storage
  const storedKey = sessionStorage.getItem('encryption-key');
  
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
      console.warn('Failed to import stored key, generating new one');
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
  sessionStorage.setItem('encryption-key', JSON.stringify(exportedKey));

  return key;
}

// ============================================================================
// Encryption Functions
// ============================================================================

/**
 * Encrypt a string value using Web Crypto API
 */
export async function encryptValue(value: string): Promise<EncryptionResult> {
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(value);

    const encrypted = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      data
    );

    // Convert to base64 for storage
    const encryptedArray = new Uint8Array(encrypted);
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return {
      encrypted: encryptedBase64,
      iv: ivBase64,
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt a string value using Web Crypto API
 */
export async function decryptValue(encrypted: string, iv: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Validate inputs
    if (!encrypted || !iv) {
      throw new Error('Missing encrypted data or IV');
    }

    // Validate base64 format
    try {
      atob(encrypted);
      atob(iv);
    } catch {
      throw new Error('Invalid base64 format');
    }

    // Convert from base64
    const encryptedArray = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv: ivArray },
      key,
      encryptedArray
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    // Silently handle decryption failures - this is expected when session expires
    // The calling code will handle clearing corrupted settings
    if (error instanceof DOMException && error.name === 'OperationError') {
      // This is a normal case when encryption key doesn't match (session expired)
      throw new Error('DECRYPTION_KEY_MISMATCH');
    }
    
    if (error instanceof Error) {
      if (error.message.includes('operation-specific reason')) {
        throw new Error('DECRYPTION_KEY_MISMATCH');
      }
      throw new Error(`Failed to decrypt value: ${error.message}`);
    }
    throw new Error('Failed to decrypt value');
  }
}

/**
 * Check if a value is encrypted (has the expected format)
 */
export function isEncrypted(value: string): boolean {
  try {
    // Encrypted values should be valid base64
    atob(value);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Settings Storage Functions
// ============================================================================

/**
 * Save LLM settings with encrypted API key
 */
export async function saveLLMSettings(config: LLMConfig): Promise<void> {
  try {
    // Load existing settings
    const settings = loadSettings();

    // Encrypt API key
    const { encrypted, iv } = await encryptValue(config.apiKey);

    // Store config without API key, plus encrypted API key
    const { apiKey, ...configWithoutKey } = config;
    
    settings.llm = {
      config: configWithoutKey,
      encryptedApiKey: `${encrypted}:${iv}`,
      lastValidated: new Date().toISOString(),
    };

    // Save to localStorage
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save LLM settings:', error);
    throw new Error('Failed to save settings. Please try again.');
  }
}

/**
 * Load LLM settings and decrypt API key
 */
export async function loadLLMSettings(): Promise<LLMConfig | null> {
  try {
    const settings = loadSettings();

    if (!settings.llm) {
      return null;
    }

    // Decrypt API key
    let apiKey = '';
    if (settings.llm.encryptedApiKey) {
      try {
        const [encrypted, iv] = settings.llm.encryptedApiKey.split(':');
        if (!encrypted || !iv) {
          console.warn('Invalid encrypted data format, clearing settings');
          deleteLLMSettings();
          return null;
        }
        apiKey = await decryptValue(encrypted, iv);
      } catch (decryptError) {
        // Check if it's a key mismatch (expected when session expires)
        if (decryptError instanceof Error && decryptError.message === 'DECRYPTION_KEY_MISMATCH') {
          console.info('Session expired - settings need to be re-entered');
        } else {
          console.warn('Failed to decrypt API key:', decryptError);
        }
        // Clear corrupted settings and reset encryption key
        deleteLLMSettings();
        resetEncryptionKey();
        return null;
      }
    }

    // Reconstruct full config with defaults for missing fields
    const config = {
      ...settings.llm.config,
      apiKey,
    } as LLMConfig;
    
    // Ensure systemPrompts exists with defaults if missing
    if (!config.systemPrompts) {
      const { getDefaultSystemPrompts } = await import('@/services/llmService');
      config.systemPrompts = getDefaultSystemPrompts();
    }
    
    return config;
  } catch (error) {
    console.error('Failed to load LLM settings:', error);
    return null;
  }
}

/**
 * Delete LLM settings securely
 */
export function deleteLLMSettings(): void {
  try {
    const settings = loadSettings();
    delete settings.llm;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to delete LLM settings:', error);
    throw new Error('Failed to delete settings');
  }
}

/**
 * Export settings without credentials
 */
export function exportSettings(): string {
  try {
    const settings = loadSettings();

    // Create export object without encrypted credentials
    // Using 'any' to allow dynamic property assignment based on available settings
    const exportData: unknown = {
      version: settings.version,
    };

    if (settings.llm) {
      exportData.llm = {
        config: settings.llm.config,
        // Exclude encryptedApiKey
      };
    }

    if (settings.comfyui) {
      exportData.comfyui = {
        config: settings.comfyui.config,
        // Exclude encryptedCredentials
      };
    }

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export settings:', error);
    throw new Error('Failed to export settings');
  }
}

/**
 * Import settings (without credentials)
 */
export function importSettings(jsonData: string): boolean {
  try {
    const importedData = JSON.parse(jsonData);

    // Validate structure
    if (!importedData.version) {
      throw new Error('Invalid settings format: missing version');
    }

    const settings = loadSettings();

    // Merge imported settings (preserving encrypted credentials)
    if (importedData.llm) {
      settings.llm = {
        ...settings.llm,
        config: importedData.llm.config,
      };
    }

    if (importedData.comfyui) {
      settings.comfyui = {
        ...settings.comfyui,
        config: importedData.comfyui.config,
      };
    }

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Failed to import settings:', error);
    return false;
  }
}

/**
 * Clear all settings securely
 */
export function clearAllSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    sessionStorage.removeItem('encryption-key');
  } catch (error) {
    console.error('Failed to clear settings:', error);
    throw new Error('Failed to clear settings');
  }
}

/**
 * Reset encryption key (useful when decryption fails due to corrupted key)
 */
export function resetEncryptionKey(): void {
  try {
    sessionStorage.removeItem('encryption-key');
  } catch (error) {
    console.error('Failed to reset encryption key:', error);
  }
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

/**
 * Load settings from localStorage
 */
function loadSettings(): StoredSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!stored) {
      return {
        version: SETTINGS_VERSION,
      };
    }

    const settings = JSON.parse(stored) as StoredSettings;

    // Validate version
    if (settings.version !== SETTINGS_VERSION) {
      console.warn('Settings version mismatch, migrating...');
      // In the future, add migration logic here
    }

    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return {
      version: SETTINGS_VERSION,
    };
  }
}

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.subtle.encrypt === 'function';
}

/**
 * Check if settings exist
 */
export function hasStoredSettings(): boolean {
  const settings = loadSettings();
  return !!(settings.llm || settings.comfyui);
}

/**
 * Get last validation timestamp for LLM settings
 */
export function getLastValidationTime(): Date | null {
  const settings = loadSettings();
  if (settings.llm?.lastValidated) {
    return new Date(settings.llm.lastValidated);
  }
  return null;
}

