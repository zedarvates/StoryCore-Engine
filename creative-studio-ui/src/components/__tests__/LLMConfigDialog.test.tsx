import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LLMConfigDialog } from '../launcher/LLMConfigDialog';
import type { LLMConfig } from '@/services/llmService';

describe('LLMConfigDialog - Connection Validation', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnValidateConnection = vi.fn();

  const defaultConfig: LLMConfig = {
    provider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-4',
    parameters: {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    systemPrompts: {
      worldGeneration: 'test',
      characterGeneration: 'test',
      dialogueGeneration: 'test',
    },
    timeout: 30000,
    retryAttempts: 3,
    streamingEnabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation loading state when saving', async () => {
    mockOnValidateConnection.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));

    render(
      <LLMConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentConfig={defaultConfig}
        onSave={mockOnSave}
        onValidateConnection={mockOnValidateConnection}
      />
    );

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Validating connection...')).toBeInTheDocument();
    });
  });

  it('shows success message when validation succeeds', async () => {
    mockOnValidateConnection.mockResolvedValue(true);
    mockOnSave.mockResolvedValue(undefined);

    render(
      <LLMConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentConfig={defaultConfig}
        onSave={mockOnSave}
        onValidateConnection={mockOnValidateConnection}
      />
    );

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Connection validated successfully!')).toBeInTheDocument();
    });

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('shows error message with recovery suggestions when validation fails', async () => {
    mockOnValidateConnection.mockResolvedValue(false);

    render(
      <LLMConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentConfig={defaultConfig}
        onSave={mockOnSave}
        onValidateConnection={mockOnValidateConnection}
      />
    );

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });

    // Check for recovery suggestions
    expect(screen.getByText('Suggestions:')).toBeInTheDocument();
    expect(screen.getByText(/Verify your API key is correct/i)).toBeInTheDocument();
    expect(screen.getByText(/Check your internet connection/i)).toBeInTheDocument();

    // Check for retry button
    expect(screen.getByText('Retry Connection')).toBeInTheDocument();

    // Verify save was not called
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('allows retry after validation failure', async () => {
    mockOnValidateConnection
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    mockOnSave.mockResolvedValue(undefined);

    render(
      <LLMConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentConfig={defaultConfig}
        onSave={mockOnSave}
        onValidateConnection={mockOnValidateConnection}
      />
    );

    // First attempt - fails
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });

    // Retry - succeeds
    const retryButton = screen.getByText('Retry Connection');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Connection validated successfully!')).toBeInTheDocument();
    });

    // Verify validation was called twice
    expect(mockOnValidateConnection).toHaveBeenCalledTimes(2);
  });

  it('handles validation errors gracefully', async () => {
    const errorMessage = 'Network error occurred';
    mockOnValidateConnection.mockRejectedValue(new Error(errorMessage));

    render(
      <LLMConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentConfig={defaultConfig}
        onSave={mockOnSave}
        onValidateConnection={mockOnValidateConnection}
      />
    );

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('shows provider-specific suggestions for local/custom providers', async () => {
    const localConfig: LLMConfig = {
      ...defaultConfig,
      provider: 'local',
    };

    mockOnValidateConnection.mockResolvedValue(false);

    render(
      <LLMConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentConfig={localConfig}
        onSave={mockOnSave}
        onValidateConnection={mockOnValidateConnection}
      />
    );

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    });

    // Check for local server suggestion
    expect(screen.getByText(/Ensure your local\/custom server is running/i)).toBeInTheDocument();
  });

  it('disables save button during validation', async () => {
    mockOnValidateConnection.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));

    render(
      <LLMConfigDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        currentConfig={defaultConfig}
        onSave={mockOnSave}
        onValidateConnection={mockOnValidateConnection}
      />
    );

    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });
  });
});
