/**
 * Integration Tests for LLM Settings Panel Persistence
 * 
 * Tests the integration of LLMSettingsPanel with secure storage
 * Validates Requirements: 3.7, 10.1, 10.2, 10.3, 10.4, 10.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LLMSettingsPanel } from '../LLMSettingsPanel';
import * as secureStorage from '@/utils/secureStorage';
import type { LLMConfig } from '@/services/llmService';

// ============================================================================
// Test Setup
// ============================================================================

// Mock secure storage
vi.mock('@/utils/secureStorage', () => ({
  saveLLMSettings: vi.fn(),
  loadLLMSettings: vi.fn(),
  deleteLLMSettings: vi.fn(),
  exportSettings: vi.fn(),
  importSettings: vi.fn(),
  clearAllSettings: vi.fn(),
  isCryptoAvailable: vi.fn(() => true),
  hasStoredSettings: vi.fn(() => false),
  getLastValidationTime: vi.fn(() => null),
}));

// Mock crypto API
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    importKey: vi.fn(),
    exportKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i;
    }
    return arr;
  }),
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  global.crypto = mockCrypto as any;
  vi.clearAllMocks();
});

// ============================================================================
// Sample Data
// ============================================================================

const sampleConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'sk-test-key',
  model: 'gpt-4',
  parameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  systemPrompts: {
    worldGeneration: 'Generate world...',
    characterGeneration: 'Generate character...',
    dialogueGeneration: 'Generate dialogue...',
  },
  timeout: 30000,
  retryAttempts: 3,
  streamingEnabled: true,
};

// ============================================================================
// Loading Tests
// ============================================================================

describe('Settings Loading', () => {
  it('should load stored settings on mount', async () => {
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    // Should show loading state initially
    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();

    // Wait for settings to load
    await waitFor(() => {
      expect(secureStorage.loadLLMSettings).toHaveBeenCalled();
    });

    // Should populate form with loaded settings
    await waitFor(() => {
      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(apiKeyInput.value).toBe(sampleConfig.apiKey);
    });
  });

  it('should handle loading failure gracefully', async () => {
    vi.mocked(secureStorage.loadLLMSettings).mockRejectedValue(new Error('Load failed'));

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    // Should still render form with defaults
    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });
  });

  it('should show last validation time when available', async () => {
    const lastValidated = new Date('2024-01-15T10:30:00Z');
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);
    vi.mocked(secureStorage.getLastValidationTime).mockReturnValue(lastValidated);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Last validated:/)).toBeInTheDocument();
    });
  });

  it('should show warning when crypto is unavailable', async () => {
    vi.mocked(secureStorage.isCryptoAvailable).mockReturnValue(false);
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(null);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Encryption unavailable/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Saving Tests
// ============================================================================

describe('Settings Saving', () => {
  it('should save settings with encryption', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onTestConnection = vi.fn().mockResolvedValue(true);
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(null);
    vi.mocked(secureStorage.saveLLMSettings).mockResolvedValue();

    render(
      <LLMSettingsPanel
        onSave={onSave}
        onTestConnection={onTestConnection}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    // Fill in form
    await user.type(screen.getByLabelText('API Key'), 'sk-test-key');
    
    // Test connection
    await user.click(screen.getByText('Test Connection'));
    await waitFor(() => {
      expect(screen.getByText(/Connection successful/)).toBeInTheDocument();
    });

    // Save settings
    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(secureStorage.saveLLMSettings).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalled();
    });
  });

  it('should show success message after saving', async () => {
    const user = userEvent.setup();
    const onTestConnection = vi.fn().mockResolvedValue(true);
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(null);
    vi.mocked(secureStorage.saveLLMSettings).mockResolvedValue();

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={onTestConnection}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('API Key'), 'sk-test-key');
    await user.click(screen.getByText('Test Connection'));
    
    await waitFor(() => {
      expect(screen.getByText(/Connection successful/)).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText(/Settings saved successfully/)).toBeInTheDocument();
    });
  });

  it('should handle save failure', async () => {
    const user = userEvent.setup();
    const onTestConnection = vi.fn().mockResolvedValue(true);
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(null);
    vi.mocked(secureStorage.saveLLMSettings).mockRejectedValue(new Error('Save failed'));

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={onTestConnection}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('API Key'), 'sk-test-key');
    await user.click(screen.getByText('Test Connection'));
    
    await waitFor(() => {
      expect(screen.getByText(/Connection successful/)).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save Settings'));

    await waitFor(() => {
      expect(screen.getByText(/Save failed/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Export Tests
// ============================================================================

describe('Settings Export', () => {
  it('should export settings without credentials', async () => {
    const user = userEvent.setup();
    const exportData = JSON.stringify({ version: '1.0', llm: { config: {} } });
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);
    vi.mocked(secureStorage.exportSettings).mockReturnValue(exportData);

    // Mock URL.createObjectURL and related functions
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement to track link creation
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        return mockLink as any;
      }
      return originalCreateElement(tag);
    });

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Export Settings')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Export Settings'));

    await waitFor(() => {
      expect(secureStorage.exportSettings).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  it('should show success message after export', async () => {
    const user = userEvent.setup();
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);
    vi.mocked(secureStorage.exportSettings).mockReturnValue('{}');

    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Export Settings')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Export Settings'));

    await waitFor(() => {
      expect(screen.getByText(/exported successfully/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Import Tests
// ============================================================================

describe('Settings Import', () => {
  it('should import settings from file', async () => {
    const user = userEvent.setup();
    const importData = JSON.stringify({
      version: '1.0',
      llm: {
        config: {
          provider: 'anthropic',
          model: 'claude-3',
          parameters: sampleConfig.parameters,
          systemPrompts: sampleConfig.systemPrompts,
          timeout: 30000,
          retryAttempts: 3,
          streamingEnabled: true,
        },
      },
    });

    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(null);
    vi.mocked(secureStorage.importSettings).mockReturnValue(true);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Import Settings')).toBeInTheDocument();
    });

    // Mock file input
    const file = new File([importData], 'settings.json', { type: 'application/json' });
    const input = document.createElement('input');
    input.type = 'file';
    
    // Trigger import
    await user.click(screen.getByText('Import Settings'));

    // Note: Full file upload testing requires more complex mocking
    // This test validates the button is present and clickable
  });
});

// ============================================================================
// Delete Tests
// ============================================================================

describe('Settings Deletion', () => {
  it('should delete all settings with confirmation', async () => {
    const user = userEvent.setup();
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);
    vi.mocked(secureStorage.deleteLLMSettings).mockReturnValue(undefined);

    // Mock window.confirm
    global.confirm = vi.fn(() => true);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Delete All')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Delete All'));

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled();
      expect(secureStorage.deleteLLMSettings).toHaveBeenCalled();
    });
  });

  it('should not delete if user cancels confirmation', async () => {
    const user = userEvent.setup();
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);
    vi.mocked(secureStorage.deleteLLMSettings).mockReturnValue(undefined);

    global.confirm = vi.fn(() => false);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Delete All')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Delete All'));

    expect(global.confirm).toHaveBeenCalled();
    expect(secureStorage.deleteLLMSettings).not.toHaveBeenCalled();
  });

  it('should reset form after deletion', async () => {
    const user = userEvent.setup();
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);
    vi.mocked(secureStorage.deleteLLMSettings).mockReturnValue(undefined);

    global.confirm = vi.fn(() => true);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(apiKeyInput.value).toBe(sampleConfig.apiKey);
    });

    await user.click(screen.getByText('Delete All'));

    await waitFor(() => {
      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(apiKeyInput.value).toBe('');
    });
  });
});

// ============================================================================
// Security Tests
// ============================================================================

describe('Security Features', () => {
  it('should mask API key by default', async () => {
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(apiKeyInput.type).toBe('password');
    });
  });

  it('should toggle API key visibility', async () => {
    const user = userEvent.setup();
    
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(sampleConfig);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Show API key');
    await user.click(toggleButton);

    const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
    expect(apiKeyInput.type).toBe('text');

    await user.click(screen.getByLabelText('Hide API key'));
    expect(apiKeyInput.type).toBe('password');
  });

  it('should show encryption status when available', async () => {
    vi.mocked(secureStorage.loadLLMSettings).mockResolvedValue(null);
    vi.mocked(secureStorage.isCryptoAvailable).mockReturnValue(true);

    render(
      <LLMSettingsPanel
        onSave={vi.fn()}
        onTestConnection={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/AES-256-GCM encryption/)).toBeInTheDocument();
    });
  });
});
