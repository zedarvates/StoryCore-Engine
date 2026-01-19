/**
 * LLM Settings Panel Tests
 * 
 * Tests for the LLM configuration UI component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LLMSettingsPanel } from '../LLMSettingsPanel';
import type { LLMConfig } from '@/services/llmService';

describe('LLMSettingsPanel', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnTestConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('renders all main sections', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.getByText('Provider Selection')).toBeInTheDocument();
      expect(screen.getByText('Generation Parameters')).toBeInTheDocument();
      expect(screen.getByText('System Prompts')).toBeInTheDocument();
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });

    it('renders all provider options', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.getByLabelText(/OpenAI/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Anthropic/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Local LLM/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Custom Provider/i)).toBeInTheDocument();
    });

    it('displays model selection dropdown', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.getByLabelText('Model')).toBeInTheDocument();
    });

    it('displays all parameter sliders', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.getByLabelText(/Temperature/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Max Tokens/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Top P/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Frequency Penalty/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Presence Penalty/i)).toBeInTheDocument();
    });

    it('displays system prompt editors', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.getByLabelText('World Generation')).toBeInTheDocument();
      expect(screen.getByLabelText('Character Generation')).toBeInTheDocument();
      expect(screen.getByLabelText('Dialogue Generation')).toBeInTheDocument();
    });

    it('displays action buttons', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Provider Selection Tests
  // ============================================================================

  describe('Provider Selection', () => {
    it('defaults to OpenAI provider', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const openaiRadio = screen.getByLabelText(/OpenAI/i) as HTMLInputElement;
      expect(openaiRadio.checked).toBe(true);
    });

    it('shows API key field for OpenAI', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    it('shows API key field for Anthropic', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      await user.click(screen.getByLabelText(/Anthropic/i));

      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });

    it('shows endpoint field for local provider', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      await user.click(screen.getByLabelText(/Local LLM/i));

      expect(screen.getByLabelText('API Endpoint')).toBeInTheDocument();
    });

    it('shows endpoint field for custom provider', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      await user.click(screen.getByLabelText(/Custom Provider/i));

      expect(screen.getByLabelText('API Endpoint')).toBeInTheDocument();
    });

    it('updates model list when provider changes', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Click on model dropdown to see OpenAI models
      await user.click(screen.getByLabelText('Model'));
      expect(screen.getByText('GPT-4')).toBeInTheDocument();

      // Change to Anthropic
      await user.click(screen.getByLabelText(/Anthropic/i));
      
      // Click on model dropdown to see Anthropic models
      await user.click(screen.getByLabelText('Model'));
      expect(screen.getByText('Claude 3 Opus')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Model Info Display Tests
  // ============================================================================

  describe('Model Info Display', () => {
    it('displays model context window', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Select a model
      await user.click(screen.getByLabelText('Model'));
      await user.click(screen.getByText('GPT-4'));

      expect(screen.getByText(/Context: 8,192 tokens/i)).toBeInTheDocument();
    });

    it('displays model cost information', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Select a model
      await user.click(screen.getByLabelText('Model'));
      await user.click(screen.getByText('GPT-4'));

      expect(screen.getByText(/Cost: \$0.03\/1K tokens/i)).toBeInTheDocument();
    });

    it('displays model capabilities', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Select a model
      await user.click(screen.getByLabelText('Model'));
      await user.click(screen.getByText('GPT-4'));

      expect(screen.getByText(/Capabilities: chat, completion, streaming/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // API Key Tests
  // ============================================================================

  describe('API Key Handling', () => {
    it('masks API key by default', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(apiKeyInput.type).toBe('password');
    });

    it('toggles API key visibility', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
      const toggleButton = screen.getByLabelText('Show API key');

      expect(apiKeyInput.type).toBe('password');

      await user.click(toggleButton);
      expect(apiKeyInput.type).toBe('text');

      await user.click(toggleButton);
      expect(apiKeyInput.type).toBe('password');
    });

    it('accepts API key input', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const apiKeyInput = screen.getByLabelText('API Key');
      await user.type(apiKeyInput, 'sk-test-key-123');

      expect(apiKeyInput).toHaveValue('sk-test-key-123');
    });
  });

  // ============================================================================
  // Parameter Slider Tests
  // ============================================================================

  describe('Parameter Sliders', () => {
    it('displays temperature value', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.getByText('0.70')).toBeInTheDocument();
    });

    it('displays top P value', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.getByText('1.00')).toBeInTheDocument();
    });

    it('displays frequency penalty value', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Frequency penalty defaults to 0
      const frequencySection = screen.getByText('Frequency Penalty').closest('div');
      expect(frequencySection).toHaveTextContent('0.00');
    });

    it('displays presence penalty value', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Presence penalty defaults to 0
      const presenceSection = screen.getByText('Presence Penalty').closest('div');
      expect(presenceSection).toHaveTextContent('0.00');
    });

    it('shows tooltip info icons', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const infoIcons = screen.getAllByLabelText('More information');
      expect(infoIcons.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // System Prompt Tests
  // ============================================================================

  describe('System Prompts', () => {
    it('loads default prompts', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const worldPrompt = screen.getByLabelText('World Generation') as HTMLTextAreaElement;
      expect(worldPrompt.value).toContain('world-building assistant');
    });

    it('allows editing prompts', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const worldPrompt = screen.getByLabelText('World Generation');
      await user.clear(worldPrompt);
      await user.type(worldPrompt, 'Custom world prompt');

      expect(worldPrompt).toHaveValue('Custom world prompt');
    });

    it('resets prompts to defaults', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Edit a prompt
      const worldPrompt = screen.getByLabelText('World Generation');
      await user.clear(worldPrompt);
      await user.type(worldPrompt, 'Custom prompt');

      // Reset
      await user.click(screen.getByRole('button', { name: /Reset to Defaults/i }));

      // Should be back to default
      expect(worldPrompt).toHaveValue(expect.stringContaining('world-building assistant'));
    });
  });

  // ============================================================================
  // Connection Testing Tests
  // ============================================================================

  describe('Connection Testing', () => {
    it('shows test connection button when handler provided', () => {
      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
    });

    it('calls test connection handler', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Enter API key
      await user.type(screen.getByLabelText('API Key'), 'sk-test-key');

      // Click test button
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(mockOnTestConnection).toHaveBeenCalled();
      });
    });

    it('displays success message on successful connection', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-test-key');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });
    });

    it('displays error message on failed connection', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(false);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-test-key');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      });
    });

    it('disables test button when form is invalid', () => {
      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      const testButton = screen.getByRole('button', { name: /Test Connection/i });
      expect(testButton).toBeDisabled();
    });
  });

  // ============================================================================
  // Form Validation Tests
  // ============================================================================

  describe('Form Validation', () => {
    it('disables save button when API key is missing', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when form is valid', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Enter API key
      await user.type(screen.getByLabelText('API Key'), 'sk-test-key');

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('requires endpoint for local provider', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to local provider
      await user.click(screen.getByLabelText(/Local LLM/i));

      // Clear endpoint
      const endpointInput = screen.getByLabelText('API Endpoint');
      await user.clear(endpointInput);

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });
      expect(saveButton).toBeDisabled();
    });
  });

  // ============================================================================
  // Save Functionality Tests
  // ============================================================================

  describe('Save Functionality', () => {
    it('calls onSave with complete config', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Fill in required fields
      await user.type(screen.getByLabelText('API Key'), 'sk-test-key');

      // Save
      await user.click(screen.getByRole('button', { name: /Save Settings/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'openai',
            apiKey: 'sk-test-key',
            model: expect.any(String),
            parameters: expect.objectContaining({
              temperature: expect.any(Number),
              maxTokens: expect.any(Number),
              topP: expect.any(Number),
              frequencyPenalty: expect.any(Number),
              presencePenalty: expect.any(Number),
            }),
            systemPrompts: expect.objectContaining({
              worldGeneration: expect.any(String),
              characterGeneration: expect.any(String),
              dialogueGeneration: expect.any(String),
            }),
            timeout: expect.any(Number),
            retryAttempts: expect.any(Number),
            streamingEnabled: expect.any(Boolean),
          })
        );
      });
    });

    it('includes custom endpoint for local provider', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to local provider
      await user.click(screen.getByLabelText(/Local LLM/i));

      // Enter endpoint
      await user.type(screen.getByLabelText('API Endpoint'), 'http://localhost:8000');

      // Save
      await user.click(screen.getByRole('button', { name: /Save Settings/i }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'local',
            apiEndpoint: 'http://localhost:8000',
          })
        );
      });
    });

    it('shows loading state while saving', async () => {
      const user = userEvent.setup();
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<LLMSettingsPanel onSave={mockOnSave} />);

      await user.type(screen.getByLabelText('API Key'), 'sk-test-key');
      await user.click(screen.getByRole('button', { name: /Save Settings/i }));

      // Should show loading state
      expect(screen.getByRole('button', { name: /Save Settings/i })).toBeDisabled();
    });
  });

  // ============================================================================
  // Cancel Functionality Tests
  // ============================================================================

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} onCancel={mockOnCancel} />);

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not show cancel button when handler not provided', () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Initial Config Tests
  // ============================================================================

  describe('Initial Configuration', () => {
    it('loads existing configuration', () => {
      const existingConfig: Partial<LLMConfig> = {
        provider: 'anthropic',
        apiKey: 'existing-key',
        model: 'claude-3-opus-20240229',
        parameters: {
          temperature: 0.5,
          maxTokens: 1000,
          topP: 0.9,
          frequencyPenalty: 0.5,
          presencePenalty: 0.5,
        },
      };

      render(<LLMSettingsPanel currentConfig={existingConfig} onSave={mockOnSave} />);

      const anthropicRadio = screen.getByLabelText(/Anthropic/i) as HTMLInputElement;
      expect(anthropicRadio.checked).toBe(true);

      const apiKeyInput = screen.getByLabelText('API Key') as HTMLInputElement;
      expect(apiKeyInput.value).toBe('existing-key');
    });
  });

  // ============================================================================
  // Advanced Settings Tests
  // ============================================================================

  describe('Advanced Settings', () => {
    it('allows configuring timeout', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const timeoutInput = screen.getByLabelText(/Timeout/i);
      await user.clear(timeoutInput);
      await user.type(timeoutInput, '60000');

      expect(timeoutInput).toHaveValue(60000);
    });

    it('allows configuring retry attempts', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const retryInput = screen.getByLabelText(/Retry Attempts/i);
      await user.clear(retryInput);
      await user.type(retryInput, '5');

      expect(retryInput).toHaveValue(5);
    });

    it('allows toggling streaming', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const streamingCheckbox = screen.getByLabelText(/Enable Streaming/i) as HTMLInputElement;
      expect(streamingCheckbox.checked).toBe(true);

      await user.click(streamingCheckbox);
      expect(streamingCheckbox.checked).toBe(false);
    });
  });
});
