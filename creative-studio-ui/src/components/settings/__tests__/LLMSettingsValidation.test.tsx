/**
 * LLM Settings Panel Validation Tests
 * 
 * Tests for enhanced validation and connection testing functionality
 * Validates Requirements: 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LLMSettingsPanel } from '../LLMSettingsPanel';

describe('LLMSettingsPanel - Validation and Connection Testing', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnTestConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // API Key Validation Tests
  // ============================================================================

  describe('API Key Validation', () => {
    it('validates OpenAI API key format', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const apiKeyInput = screen.getByLabelText('API Key');
      
      // Invalid format - doesn't start with sk-
      await user.type(apiKeyInput, 'invalid-key');
      
      expect(screen.getByText(/must start with "sk-"/i)).toBeInTheDocument();
    });

    it('validates OpenAI API key length', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const apiKeyInput = screen.getByLabelText('API Key');
      
      // Too short
      await user.type(apiKeyInput, 'sk-123');
      
      expect(screen.getByText(/appears to be too short/i)).toBeInTheDocument();
    });

    it('accepts valid OpenAI API key', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const apiKeyInput = screen.getByLabelText('API Key');
      
      // Valid format
      await user.type(apiKeyInput, 'sk-1234567890abcdefghij');
      
      expect(screen.queryByText(/must start with/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/too short/i)).not.toBeInTheDocument();
    });

    it('validates Anthropic API key format', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to Anthropic
      await user.click(screen.getByLabelText(/Anthropic/i));

      const apiKeyInput = screen.getByLabelText('API Key');
      
      // Invalid format - doesn't start with sk-ant-
      await user.type(apiKeyInput, 'sk-invalid');
      
      expect(screen.getByText(/must start with "sk-ant-"/i)).toBeInTheDocument();
    });

    it('accepts valid Anthropic API key', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to Anthropic
      await user.click(screen.getByLabelText(/Anthropic/i));

      const apiKeyInput = screen.getByLabelText('API Key');
      
      // Valid format
      await user.type(apiKeyInput, 'sk-ant-1234567890abcdefghij');
      
      expect(screen.queryByText(/must start with/i)).not.toBeInTheDocument();
    });

    it('shows validation error with aria attributes', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const apiKeyInput = screen.getByLabelText('API Key');
      await user.type(apiKeyInput, 'invalid');

      expect(apiKeyInput).toHaveAttribute('aria-invalid', 'true');
      expect(apiKeyInput).toHaveAttribute('aria-describedby', 'apiKey-error');
    });

    it('clears connection status when API key changes', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Enter valid API key and test
      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });

      // Change API key
      const apiKeyInput = screen.getByLabelText('API Key');
      await user.clear(apiKeyInput);
      await user.type(apiKeyInput, 'sk-newkey1234567890abc');

      // Success message should be cleared
      expect(screen.queryByText(/Connection successful/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Endpoint Validation Tests
  // ============================================================================

  describe('Endpoint Validation', () => {
    it('validates endpoint URL format for local provider', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to local provider
      await user.click(screen.getByLabelText(/Local LLM/i));

      const endpointInput = screen.getByLabelText('API Endpoint');
      
      // Clear default and enter invalid URL
      await user.clear(endpointInput);
      await user.type(endpointInput, 'not-a-url');
      
      expect(screen.getByText(/Invalid URL format/i)).toBeInTheDocument();
    });

    it('validates endpoint protocol', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to local provider
      await user.click(screen.getByLabelText(/Local LLM/i));

      const endpointInput = screen.getByLabelText('API Endpoint');
      
      // Enter URL with invalid protocol
      await user.clear(endpointInput);
      await user.type(endpointInput, 'ftp://localhost:8000');
      
      expect(screen.getByText(/must use HTTP or HTTPS/i)).toBeInTheDocument();
    });

    it('accepts valid HTTP endpoint', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to local provider
      await user.click(screen.getByLabelText(/Local LLM/i));

      const endpointInput = screen.getByLabelText('API Endpoint');
      
      // Enter valid HTTP URL
      await user.clear(endpointInput);
      await user.type(endpointInput, 'http://localhost:8000');
      
      expect(screen.queryByText(/Invalid URL/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/must use HTTP/i)).not.toBeInTheDocument();
    });

    it('accepts valid HTTPS endpoint', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to custom provider
      await user.click(screen.getByLabelText(/Custom Provider/i));

      const endpointInput = screen.getByLabelText('API Endpoint');
      
      // Enter valid HTTPS URL
      await user.type(endpointInput, 'https://api.example.com');
      
      expect(screen.queryByText(/Invalid URL/i)).not.toBeInTheDocument();
    });

    it('shows validation error with aria attributes for endpoint', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Switch to local provider
      await user.click(screen.getByLabelText(/Local LLM/i));

      const endpointInput = screen.getByLabelText('API Endpoint');
      await user.clear(endpointInput);
      await user.type(endpointInput, 'invalid');

      expect(endpointInput).toHaveAttribute('aria-invalid', 'true');
      expect(endpointInput).toHaveAttribute('aria-describedby', 'endpoint-error');
    });

    it('clears connection status when endpoint changes', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Switch to local provider
      await user.click(screen.getByLabelText(/Local LLM/i));

      // Test connection
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });

      // Change endpoint
      const endpointInput = screen.getByLabelText('API Endpoint');
      await user.clear(endpointInput);
      await user.type(endpointInput, 'http://localhost:9000');

      // Success message should be cleared
      expect(screen.queryByText(/Connection successful/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Connection Testing Tests
  // ============================================================================

  describe('Connection Testing', () => {
    it('validates credentials before testing connection', async () => {
      const user = userEvent.setup();
      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Try to test without API key
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      // Should show validation error, not call test function
      expect(mockOnTestConnection).not.toHaveBeenCalled();
    });

    it('shows detailed success message on successful connection', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connection successful! API key is valid and the model is accessible/i)).toBeInTheDocument();
      });
    });

    it('shows provider-specific error message on failed connection', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(false);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/verify your OpenAI API key/i)).toBeInTheDocument();
      });
    });

    it('shows error guidance on connection failure', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(false);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Check: 1\) API key is correct/i)).toBeInTheDocument();
      });
    });

    it('shows testing state during connection test', async () => {
      const user = userEvent.setup();
      let resolveTest: (value: boolean) => void;
      const testPromise = new Promise<boolean>((resolve) => {
        resolveTest = resolve;
      });
      mockOnTestConnection.mockReturnValue(testPromise);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      // Should show testing state
      expect(screen.getByText(/Testing connection/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeDisabled();

      // Resolve the test
      resolveTest!(true);

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });
    });

    it('handles connection test exceptions', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockRejectedValue(new Error('Network error'));

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('shows different error messages for different providers', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(false);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Test OpenAI
      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/OpenAI API key/i)).toBeInTheDocument();
      });

      // Switch to Anthropic
      await user.click(screen.getByLabelText(/Anthropic/i));
      const apiKeyInput = screen.getByLabelText('API Key');
      await user.clear(apiKeyInput);
      await user.type(apiKeyInput, 'sk-ant-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Anthropic API key/i)).toBeInTheDocument();
      });
    });

    it('clears connection status when provider changes', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Test OpenAI connection
      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });

      // Switch provider
      await user.click(screen.getByLabelText(/Anthropic/i));

      // Success message should be cleared
      expect(screen.queryByText(/Connection successful/i)).not.toBeInTheDocument();
    });

    it('shows success indicator with checkmark', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        const successDiv = screen.getByText(/Connection successful/i).closest('div');
        expect(successDiv).toHaveClass('bg-green-50');
      });
    });

    it('shows verification message after successful test', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connection verified. You can now save your settings/i)).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Save Validation Tests
  // ============================================================================

  describe('Save Validation', () => {
    it('requires connection test before saving when handler provided', async () => {
      const user = userEvent.setup();
      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Enter valid API key but don't test
      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');

      // Try to save
      await user.click(screen.getByRole('button', { name: /Save Settings/i }));

      // Should not call onSave
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('shows reminder to test connection before saving', async () => {
      const user = userEvent.setup();
      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Enter valid API key
      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');

      // Should show reminder
      expect(screen.getByText(/Please test the connection before saving/i)).toBeInTheDocument();
    });

    it('allows saving after successful connection test', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Enter valid API key and test
      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connection successful/i)).toBeInTheDocument();
      });

      // Now save should work
      await user.click(screen.getByRole('button', { name: /Save Settings/i }));

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('shows validation error message when form is incomplete', async () => {
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Should show incomplete message
      expect(screen.getByText(/Configuration incomplete/i)).toBeInTheDocument();
      expect(screen.getByText(/API key is required/i)).toBeInTheDocument();
    });

    it('validates parameter ranges before saving', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Enter valid API key
      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');

      // Set invalid max tokens
      const maxTokensInput = screen.getByLabelText(/Max Tokens/i);
      await user.clear(maxTokensInput);
      await user.type(maxTokensInput, '0');

      // Try to save
      await user.click(screen.getByRole('button', { name: /Save Settings/i }));

      // Should show validation error
      expect(screen.getByText(/Max tokens must be at least 1/i)).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('disables save button when validation fails', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      // Enter invalid API key
      await user.type(screen.getByLabelText('API Key'), 'invalid');

      const saveButton = screen.getByRole('button', { name: /Save Settings/i });
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when all validation passes', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      // Enter valid API key
      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');

      // Test connection
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /Save Settings/i });
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('uses role="alert" for status messages', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
      });
    });

    it('uses aria-live for dynamic status updates', async () => {
      const user = userEvent.setup();
      mockOnTestConnection.mockResolvedValue(true);

      render(
        <LLMSettingsPanel
          onSave={mockOnSave}
          onTestConnection={mockOnTestConnection}
        />
      );

      await user.type(screen.getByLabelText('API Key'), 'sk-1234567890abcdefghij');
      await user.click(screen.getByRole('button', { name: /Test Connection/i }));

      await waitFor(() => {
        const statusDiv = screen.getByText(/Connection successful/i).closest('div');
        expect(statusDiv).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('associates error messages with inputs using aria-describedby', async () => {
      const user = userEvent.setup();
      render(<LLMSettingsPanel onSave={mockOnSave} />);

      const apiKeyInput = screen.getByLabelText('API Key');
      await user.type(apiKeyInput, 'invalid');

      const errorId = apiKeyInput.getAttribute('aria-describedby');
      expect(errorId).toBe('apiKey-error');
      expect(screen.getByText(/must start with/i)).toHaveAttribute('id', errorId);
    });
  });
});
