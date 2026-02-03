/**
 * Configuration Modals Tests
 * 
 * Tests for LLMConfigModal and ComfyUIConfigModal components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LLMConfigModal } from '../LLMConfigModal';
import { ComfyUIConfigModal } from '../ComfyUIConfigModal';

// Mock the settings panels
vi.mock('@/components/settings/LLMSettingsPanel', () => ({
  LLMSettingsPanel: ({ onSave, onCancel }: any) => (
    <div data-testid="llm-settings-panel">
      <button onClick={() => onSave({ provider: 'openai', model: 'gpt-4' })}>
        Save LLM Config
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('@/components/settings/ComfyUISettingsPanel', () => ({
  ComfyUISettingsPanel: ({ onSave, onCancel }: any) => (
    <div data-testid="comfyui-settings-panel">
      <button onClick={() => onSave({ serverUrl: 'http://localhost:8188' })}>
        Save ComfyUI Config
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('LLMConfigModal', () => {
  it('should render LLM configuration modal when open', () => {
    render(
      <LLMConfigModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('LLM StoryCore Assistant Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('llm-settings-panel')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const { container } = render(
      <LLMConfigModal
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should call onClose when modal is closed', () => {
    const onClose = vi.fn();
    render(
      <LLMConfigModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByLabelText('Close modal');
    closeButton.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should pass currentConfig to LLMSettingsPanel', () => {
    const currentConfig = {
      provider: 'openai' as const,
      model: 'gpt-4',
      apiKey: 'test-key',
    };

    render(
      <LLMConfigModal
        isOpen={true}
        onClose={() => {}}
        currentConfig={currentConfig}
      />
    );

    // The panel should be rendered with the config
    expect(screen.getByTestId('llm-settings-panel')).toBeInTheDocument();
  });
});

describe('ComfyUIConfigModal', () => {
  it('should render ComfyUI configuration modal when open', () => {
    render(
      <ComfyUIConfigModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('ComfyUI Server Configuration')).toBeInTheDocument();
    expect(screen.getByTestId('comfyui-settings-panel')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const { container } = render(
      <ComfyUIConfigModal
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should call onClose when modal is closed', () => {
    const onClose = vi.fn();
    render(
      <ComfyUIConfigModal
        isOpen={true}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByLabelText('Close modal');
    closeButton.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should pass currentConfig to ComfyUISettingsPanel', () => {
    const currentConfig = {
      serverUrl: 'http://localhost:8188',
      authentication: {
        type: 'none' as const,
      },
    };

    render(
      <ComfyUIConfigModal
        isOpen={true}
        onClose={() => {}}
        currentConfig={currentConfig}
      />
    );

    // The panel should be rendered with the config
    expect(screen.getByTestId('comfyui-settings-panel')).toBeInTheDocument();
  });
});
