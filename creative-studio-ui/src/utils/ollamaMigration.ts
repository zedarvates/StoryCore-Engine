/**
 * Ollama Configuration Migration Utility
 * 
 * Handles migration from legacy Ollama configuration to the new unified LLM configuration format.
 * Preserves chat history and provides user notifications during migration.
 */

import type { ChatboxLLMConfig } from './llmConfigStorage';
import { saveConfiguration, saveLanguagePreference, STORAGE_KEYS } from './llmConfigStorage';

// ============================================================================
// Types
// ============================================================================

/**
 * Legacy Ollama configuration structure
 */
interface LegacyOllamaConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streamingEnabled?: boolean;
  endpoint?: string; // Alternative field name
}

/**
 * Legacy chat message structure
 */
interface LegacyChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | Date;
  attachments?: string[];
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  migrated: boolean;
  configMigrated: boolean;
  historyMigrated: boolean;
  messagesCount: number;
  error?: string;
  notification?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Legacy storage keys used by Ollama configuration
 */
const LEGACY_STORAGE_KEYS = {
  OLLAMA_CONFIG: 'ollama_config',
  OLLAMA_SETTINGS: 'storycore_ollama_config',
  CHAT_HISTORY: 'storycore_chat_history',
  CHAT_MESSAGES: 'ollama_chat_messages',
} as const;

/**
 * Default Ollama endpoint
 */
const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

/**
 * Default Ollama model
 */
const DEFAULT_OLLAMA_MODEL = 'gemma2:2b';

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Check if legacy Ollama configuration exists
 */
export function hasLegacyOllamaConfig(): boolean {
  try {
    // Check all possible legacy storage keys
    return (
      localStorage.getItem(LEGACY_STORAGE_KEYS.OLLAMA_CONFIG) !== null ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.OLLAMA_SETTINGS) !== null
    );
  } catch (error) {
    console.error('Failed to check for legacy Ollama config:', error);
    return false;
  }
}

/**
 * Check if chat history exists
 */
export function hasLegacyChatHistory(): boolean {
  try {
    return (
      localStorage.getItem(LEGACY_STORAGE_KEYS.CHAT_HISTORY) !== null ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.CHAT_MESSAGES) !== null
    );
  } catch (error) {
    console.error('Failed to check for legacy chat history:', error);
    return false;
  }
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  // Check if legacy config exists
  if (!hasLegacyOllamaConfig()) {
    return false;
  }

  // Check if new config already exists (migration already done)
  const hasNewConfig = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG) !== null;
  
  // Migration needed if legacy exists and new doesn't
  return !hasNewConfig;
}

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Load legacy Ollama configuration
 */
function loadLegacyOllamaConfig(): LegacyOllamaConfig | null {
  try {
    // Try primary legacy key
    let configJson = localStorage.getItem(LEGACY_STORAGE_KEYS.OLLAMA_CONFIG);
    
    // Try alternative legacy key
    if (!configJson) {
      configJson = localStorage.getItem(LEGACY_STORAGE_KEYS.OLLAMA_SETTINGS);
    }

    if (!configJson) {
      return null;
    }

    return JSON.parse(configJson) as LegacyOllamaConfig;
  } catch (error) {
    console.error('Failed to load legacy Ollama config:', error);
    return null;
  }
}

/**
 * Convert legacy Ollama config to new LLM config format
 */
function convertOllamaConfig(legacyConfig: LegacyOllamaConfig): ChatboxLLMConfig {
  return {
    provider: 'local', // Ollama is a local provider
    model: legacyConfig.model || DEFAULT_OLLAMA_MODEL,
    temperature: legacyConfig.temperature ?? 0.7,
    maxTokens: legacyConfig.maxTokens ?? 2048,
    apiKey: '', // Ollama doesn't require API key
    streamingEnabled: legacyConfig.streamingEnabled ?? true,
  };
}

/**
 * Load legacy chat history
 */
function loadLegacyChatHistory(): LegacyChatMessage[] {
  try {
    // Try primary legacy key
    let historyJson = localStorage.getItem(LEGACY_STORAGE_KEYS.CHAT_HISTORY);
    
    // Try alternative legacy key
    if (!historyJson) {
      historyJson = localStorage.getItem(LEGACY_STORAGE_KEYS.CHAT_MESSAGES);
    }

    if (!historyJson) {
      return [];
    }

    const history = JSON.parse(historyJson);
    
    // Handle both array and object formats
    if (Array.isArray(history)) {
      return history;
    } else if (history.messages && Array.isArray(history.messages)) {
      return history.messages;
    }

    return [];
  } catch (error) {
    console.error('Failed to load legacy chat history:', error);
    return [];
  }
}

/**
 * Preserve chat history in new format
 */
function preserveChatHistory(messages: LegacyChatMessage[]): boolean {
  try {
    if (messages.length === 0) {
      return false;
    }

    // Convert timestamps to ISO format if needed
    const normalizedMessages = messages.map(msg => ({
      ...msg,
      timestamp: typeof msg.timestamp === 'string' 
        ? msg.timestamp 
        : new Date(msg.timestamp).toISOString(),
    }));

    // Store in new format
    localStorage.setItem('storycore_migrated_chat_history', JSON.stringify(normalizedMessages));
    
    return true;
  } catch (error) {
    console.error('Failed to preserve chat history:', error);
    return false;
  }
}

/**
 * Clean up legacy storage keys
 */
function cleanupLegacyStorage(): void {
  try {
    // Remove all legacy keys
    Object.values(LEGACY_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Legacy Ollama storage cleaned up');
  } catch (error) {
    console.error('Failed to cleanup legacy storage:', error);
  }
}

/**
 * Perform complete migration from Ollama to new LLM config
 */
export async function migrateOllamaConfiguration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: false,
    configMigrated: false,
    historyMigrated: false,
    messagesCount: 0,
  };

  try {
    // Check if migration is needed
    if (!needsMigration()) {
      result.success = true;
      result.notification = 'No migration needed. Configuration is up to date.';
      return result;
    }

    // Load legacy configuration
    const legacyConfig = loadLegacyOllamaConfig();
    
    if (!legacyConfig) {
      result.error = 'Legacy Ollama configuration not found';
      return result;
    }

    // Convert to new format
    const newConfig = convertOllamaConfig(legacyConfig);

    // Save new configuration
    await saveConfiguration(newConfig);
    result.configMigrated = true;

    // Preserve chat history if it exists
    const chatHistory = loadLegacyChatHistory();
    if (chatHistory.length > 0) {
      result.historyMigrated = preserveChatHistory(chatHistory);
      result.messagesCount = chatHistory.length;
    }

    // Clean up legacy storage
    cleanupLegacyStorage();

    // Mark migration as successful
    result.success = true;
    result.migrated = true;

    // Generate notification message
    const notificationParts = [
      '✅ Ollama configuration migrated successfully!',
      `Provider: Local (Ollama)`,
      `Model: ${newConfig.model}`,
    ];

    if (result.historyMigrated && result.messagesCount > 0) {
      notificationParts.push(`Chat history preserved (${result.messagesCount} messages)`);
    }

    result.notification = notificationParts.join('\n');

    console.log('Ollama migration completed:', result);

    return result;
  } catch (error) {
    console.error('Ollama migration failed:', error);
    result.error = error instanceof Error ? error.message : 'Unknown migration error';
    return result;
  }
}

/**
 * Get migrated chat history
 */
export function getMigratedChatHistory(): LegacyChatMessage[] {
  try {
    const historyJson = localStorage.getItem('storycore_migrated_chat_history');
    
    if (!historyJson) {
      return [];
    }

    return JSON.parse(historyJson);
  } catch (error) {
    console.error('Failed to get migrated chat history:', error);
    return [];
  }
}

/**
 * Clear migrated chat history (after user acknowledges)
 */
export function clearMigratedChatHistory(): void {
  try {
    localStorage.removeItem('storycore_migrated_chat_history');
  } catch (error) {
    console.error('Failed to clear migrated chat history:', error);
  }
}

/**
 * Get migration notification message
 */
export function getMigrationNotification(): string | null {
  try {
    const notification = localStorage.getItem('storycore_migration_notification');
    return notification;
  } catch (error) {
    console.error('Failed to get migration notification:', error);
    return null;
  }
}

/**
 * Set migration notification (for display on next load)
 */
export function setMigrationNotification(message: string): void {
  try {
    localStorage.setItem('storycore_migration_notification', message);
  } catch (error) {
    console.error('Failed to set migration notification:', error);
  }
}

/**
 * Clear migration notification (after user acknowledges)
 */
export function clearMigrationNotification(): void {
  try {
    localStorage.removeItem('storycore_migration_notification');
  } catch (error) {
    console.error('Failed to clear migration notification:', error);
  }
}

/**
 * Perform automatic migration check and execute if needed
 * This should be called on application startup
 */
export async function autoMigrate(): Promise<MigrationResult | null> {
  try {
    if (!needsMigration()) {
      return null;
    }

    console.log('Automatic Ollama migration triggered');
    const result = await migrateOllamaConfiguration();

    // Store notification for display
    if (result.success && result.notification) {
      setMigrationNotification(result.notification);
    }

    return result;
  } catch (error) {
    console.error('Auto-migration failed:', error);
    return null;
  }
}

// ============================================================================
// Export Summary
// ============================================================================

/**
 * This module provides utilities for migrating legacy Ollama configuration
 * to the new unified LLM configuration format.
 * 
 * Key functions:
 * - Detection: hasLegacyOllamaConfig, hasLegacyChatHistory, needsMigration
 * - Migration: migrateOllamaConfiguration, autoMigrate
 * - History: getMigratedChatHistory, clearMigratedChatHistory
 * - Notifications: getMigrationNotification, setMigrationNotification, clearMigrationNotification
 */
