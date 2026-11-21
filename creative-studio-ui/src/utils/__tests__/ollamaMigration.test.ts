/**
 * Unit tests for Ollama configuration migration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hasLegacyOllamaConfig,
  hasLegacyChatHistory,
  needsMigration,
  migrateOllamaConfiguration,
  getMigratedChatHistory,
  clearMigratedChatHistory,
  getMigrationNotification,
  setMigrationNotification,
  clearMigrationNotification,
  autoMigrate,
} from '../ollamaMigration';
import { STORAGE_KEYS } from '../llmConfigStorage';

describe('Ollama Migration - Detection Functions', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should detect legacy Ollama config', () => {
    // No legacy config
    expect(hasLegacyOllamaConfig()).toBe(false);

    // Add legacy config
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
      baseUrl: 'http://localhost:11434',
    }));

    expect(hasLegacyOllamaConfig()).toBe(true);
  });

  it('should detect alternative legacy Ollama config key', () => {
    localStorage.setItem('storycore_ollama_config', JSON.stringify({
      model: 'llama2',
    }));

    expect(hasLegacyOllamaConfig()).toBe(true);
  });

  it('should detect legacy chat history', () => {
    // No history
    expect(hasLegacyChatHistory()).toBe(false);

    // Add history
    localStorage.setItem('storycore_chat_history', JSON.stringify([
      { id: '1', type: 'user', content: 'Hello', timestamp: new Date().toISOString() },
    ]));

    expect(hasLegacyChatHistory()).toBe(true);
  });

  it('should determine if migration is needed', () => {
    // No legacy config - no migration needed
    expect(needsMigration()).toBe(false);

    // Add legacy config - migration needed
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));
    expect(needsMigration()).toBe(true);

    // Add new config - migration not needed (already done)
    localStorage.setItem(STORAGE_KEYS.LLM_CONFIG, JSON.stringify({
      provider: 'local',
      model: 'llama2',
    }));
    expect(needsMigration()).toBe(false);
  });
});

describe('Ollama Migration - Config Conversion', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should convert Ollama config to new format', async () => {
    // Setup legacy config
    const legacyConfig = {
      model: 'llama2',
      baseUrl: 'http://localhost:11434',
      temperature: 0.8,
      maxTokens: 2048,
      streamingEnabled: true,
    };

    localStorage.setItem('ollama_config', JSON.stringify(legacyConfig));

    // Perform migration
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.configMigrated).toBe(true);

    // Verify new config exists
    const newConfigJson = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    expect(newConfigJson).toBeTruthy();

    const newConfig = JSON.parse(newConfigJson!);
    expect(newConfig.provider).toBe('local');
    expect(newConfig.model).toBe('llama2');
    expect(newConfig.temperature).toBe(0.8);
    expect(newConfig.maxTokens).toBe(2048);
    expect(newConfig.streamingEnabled).toBe(true);
  });

  it('should use default values for missing fields', async () => {
    // Setup minimal legacy config
    const legacyConfig = {
      model: 'llama2',
    };

    localStorage.setItem('ollama_config', JSON.stringify(legacyConfig));

    // Perform migration
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);

    const newConfigJson = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    const newConfig = JSON.parse(newConfigJson!);

    // Check defaults
    expect(newConfig.temperature).toBe(0.7);
    expect(newConfig.maxTokens).toBe(2048);
    expect(newConfig.streamingEnabled).toBe(true);
  });

  it('should handle missing model field', async () => {
    // Setup config without model
    const legacyConfig = {
      baseUrl: 'http://localhost:11434',
    };

    localStorage.setItem('ollama_config', JSON.stringify(legacyConfig));

    // Perform migration
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);

    const newConfigJson = localStorage.getItem(STORAGE_KEYS.LLM_CONFIG);
    const newConfig = JSON.parse(newConfigJson!);

    // Should use default model
    expect(newConfig.model).toBe('llama2');
  });
});

describe('Ollama Migration - Chat History Preservation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should preserve chat history during migration', async () => {
    // Setup legacy config and history
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));

    const chatHistory = [
      { id: '1', type: 'user', content: 'Hello', timestamp: new Date().toISOString() },
      { id: '2', type: 'assistant', content: 'Hi there!', timestamp: new Date().toISOString() },
    ];

    localStorage.setItem('storycore_chat_history', JSON.stringify(chatHistory));

    // Perform migration
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);
    expect(result.historyMigrated).toBe(true);
    expect(result.messagesCount).toBe(2);

    // Verify history is preserved
    const migratedHistory = getMigratedChatHistory();
    expect(migratedHistory).toHaveLength(2);
    expect(migratedHistory[0].content).toBe('Hello');
    expect(migratedHistory[1].content).toBe('Hi there!');
  });

  it('should handle chat history in object format', async () => {
    // Setup legacy config
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));

    // History in object format with messages array
    const chatHistory = {
      messages: [
        { id: '1', type: 'user', content: 'Test', timestamp: new Date().toISOString() },
      ],
    };

    localStorage.setItem('storycore_chat_history', JSON.stringify(chatHistory));

    // Perform migration
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);
    expect(result.historyMigrated).toBe(true);
    expect(result.messagesCount).toBe(1);
  });

  it('should handle migration without chat history', async () => {
    // Setup only config, no history
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));

    // Perform migration
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);
    expect(result.historyMigrated).toBe(false);
    expect(result.messagesCount).toBe(0);
  });

  it('should clear migrated chat history', () => {
    // Add migrated history
    localStorage.setItem('storycore_migrated_chat_history', JSON.stringify([
      { id: '1', type: 'user', content: 'Test', timestamp: new Date().toISOString() },
    ]));

    expect(getMigratedChatHistory()).toHaveLength(1);

    // Clear it
    clearMigratedChatHistory();

    expect(getMigratedChatHistory()).toHaveLength(0);
  });
});

describe('Ollama Migration - Notification Management', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should generate migration notification', async () => {
    // Setup legacy config
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));

    // Perform migration
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);
    expect(result.notification).toBeTruthy();
    expect(result.notification).toContain('migrated successfully');
    expect(result.notification).toContain('llama2');
  });

  it('should include history count in notification', async () => {
    // Setup config and history
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));

    localStorage.setItem('storycore_chat_history', JSON.stringify([
      { id: '1', type: 'user', content: 'Test', timestamp: new Date().toISOString() },
      { id: '2', type: 'assistant', content: 'Response', timestamp: new Date().toISOString() },
    ]));

    // Perform migration
    const result = await migrateOllamaConfiguration();

    expect(result.notification).toContain('2 messages');
  });

  it('should store and retrieve migration notification', () => {
    const notification = 'Migration completed successfully!';

    setMigrationNotification(notification);
    expect(getMigrationNotification()).toBe(notification);

    clearMigrationNotification();
    expect(getMigrationNotification()).toBeNull();
  });
});

describe('Ollama Migration - Cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should clean up legacy storage after migration', async () => {
    // Setup legacy config and history
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));
    localStorage.setItem('storycore_chat_history', JSON.stringify([]));

    // Verify legacy keys exist
    expect(localStorage.getItem('ollama_config')).toBeTruthy();
    expect(localStorage.getItem('storycore_chat_history')).toBeTruthy();

    // Perform migration
    await migrateOllamaConfiguration();

    // Verify legacy keys are removed
    expect(localStorage.getItem('ollama_config')).toBeNull();
    expect(localStorage.getItem('storycore_chat_history')).toBeNull();
  });
});

describe('Ollama Migration - Auto Migration', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should perform auto migration when needed', async () => {
    // Setup legacy config
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));

    // Perform auto migration
    const result = await autoMigrate();

    expect(result).toBeTruthy();
    expect(result!.success).toBe(true);
    expect(result!.migrated).toBe(true);

    // Verify notification is stored
    expect(getMigrationNotification()).toBeTruthy();
  });

  it('should return null when no migration needed', async () => {
    // No legacy config
    const result = await autoMigrate();

    expect(result).toBeNull();
  });

  it('should not migrate if already migrated', async () => {
    // Setup both legacy and new config (already migrated)
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));
    localStorage.setItem(STORAGE_KEYS.LLM_CONFIG, JSON.stringify({
      provider: 'local',
      model: 'llama2',
    }));

    // Perform auto migration
    const result = await autoMigrate();

    expect(result).toBeNull();
  });
});

describe('Ollama Migration - Error Handling', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should handle missing legacy config gracefully', async () => {
    // No legacy config exists
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);
    expect(result.migrated).toBe(false);
    expect(result.notification).toContain('No migration needed');
  });

  it('should handle corrupted legacy config', async () => {
    // Setup corrupted config
    localStorage.setItem('ollama_config', 'invalid json {');

    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should handle corrupted chat history', async () => {
    // Setup valid config but corrupted history
    localStorage.setItem('ollama_config', JSON.stringify({
      model: 'llama2',
    }));
    localStorage.setItem('storycore_chat_history', 'invalid json [');

    // Migration should still succeed for config
    const result = await migrateOllamaConfiguration();

    expect(result.success).toBe(true);
    expect(result.configMigrated).toBe(true);
    expect(result.historyMigrated).toBe(false);
  });
});
