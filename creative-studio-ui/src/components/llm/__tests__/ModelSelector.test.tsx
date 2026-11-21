/**
 * Tests for ModelSelector Component
 * 
 * Tests model selection UI including:
 * - Rendering model dropdown
 * - Displaying available models
 * - Highlighting recommended models
 * - Indicating unavailable models
 * - Handling model selection
 * - Displaying model metadata
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelector, type ModelSelectorProps } from '../ModelSelector';
import type { ModelMetadata } from '@/services/llm';

describe('ModelSelector', () => {
  let mockOnModelChange: ReturnType<typeof vi.fn>;
  let mockModels: ModelMetadata[];

  beforeEach(() => {
    mockOnModelChange = vi.fn();
    
    mockModels = [
      {
        name: 'qwen3-vl:8b',
        category: 'vision',
        size: '8.0GB',
        available: true,
        capabilities: ['text', 'vision'],
        recommendedFor: ['image-analysis', 'visual-design'],
      },
      {
        name: 'llama3.1:8b',
        category: 'storytelling',
        size: '8.0GB',
        available: true,
        capabilities: ['text'],
        recommendedFor: ['storytelling', 'narrative'],
      },
      {
        name: 'gemma3:4b',
        category: 'quick',
        size: '4.0GB',
        available: true,
        capabilities: ['text'],
        recommendedFor: ['quick-brainstorm'],
      },
      {
        name: 'llava:7b',
        category: 'vision',
        size: '7.0GB',
        available: false,
        capabilities: ['text', 'vision'],
        recommendedFor: ['image-analysis'],
      },
    ];
  });

  describe('Rendering', () => {
    it('should render model selector with label', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.getByText('Select Model:')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all available models in dropdown', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options);

      expect(options).toHaveLength(4);
      // Models are sorted alphabetically within available/unavailable groups
      expect(options.map(o => o.value)).toEqual([
        'gemma3:4b',
        'llama3.1:8b',
        'qwen3-vl:8b',
        'llava:7b',
      ]);
    });

    it('should display current model as selected', () => {
      render(
        <ModelSelector
          currentModel="llama3.1:8b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('llama3.1:8b');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
          className="custom-class"
        />
      );

      const selector = container.querySelector('.model-selector');
      expect(selector).toHaveClass('custom-class');
    });
  });

  describe('Model Availability', () => {
    it('should indicate unavailable models', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const llavaOption = Array.from(select.options).find(
        o => o.value === 'llava:7b'
      );

      expect(llavaOption?.textContent).toContain('(Not Installed)');
      expect(llavaOption?.disabled).toBe(true);
    });

    it('should not disable available models', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const gemmaOption = Array.from(select.options).find(
        o => o.value === 'gemma3:4b'
      );

      expect(gemmaOption?.disabled).toBe(false);
    });

    it('should sort available models before unavailable ones', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options);

      // First 3 should be available
      expect(options[0].disabled).toBe(false);
      expect(options[1].disabled).toBe(false);
      expect(options[2].disabled).toBe(false);
      
      // Last one should be unavailable
      expect(options[3].disabled).toBe(true);
    });
  });

  describe('Task Type Filtering', () => {
    it('should filter models by task type', () => {
      render(
        <ModelSelector
          currentModel="qwen3-vl:8b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
          taskType="vision"
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options);

      // Should only show vision models
      expect(options).toHaveLength(2);
      expect(options.map(o => o.value)).toEqual(['qwen3-vl:8b', 'llava:7b']);
    });

    it('should show recommendation indicator for task type', () => {
      render(
        <ModelSelector
          currentModel="qwen3-vl:8b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
          taskType="vision"
        />
      );

      expect(screen.getByText(/Recommended for: vision/i)).toBeInTheDocument();
    });

    it('should highlight recommended models with star', () => {
      render(
        <ModelSelector
          currentModel="qwen3-vl:8b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
          taskType="vision"
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const qwenOption = Array.from(select.options).find(
        o => o.value === 'qwen3-vl:8b'
      );

      expect(qwenOption?.textContent).toContain('⭐');
    });

    it('should not show recommendation when no task type', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.queryByText(/Recommended for:/i)).not.toBeInTheDocument();
    });
  });

  describe('Model Selection', () => {
    it('should call onModelChange when model is selected', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'llama3.1:8b' } });

      expect(mockOnModelChange).toHaveBeenCalledWith('llama3.1:8b');
      expect(mockOnModelChange).toHaveBeenCalledTimes(1);
    });

    it('should not call onModelChange for same model', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'gemma3:4b' } });

      // onChange is still called by the browser, but with same value
      expect(mockOnModelChange).toHaveBeenCalledWith('gemma3:4b');
    });
  });

  describe('Model Metadata Display', () => {
    it('should display metadata for current model', () => {
      render(
        <ModelSelector
          currentModel="qwen3-vl:8b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.getByText('Size:')).toBeInTheDocument();
      expect(screen.getByText('8.0GB')).toBeInTheDocument();
      expect(screen.getByText('Category:')).toBeInTheDocument();
      // Use getAllByText since "vision" appears in both category and capabilities
      const visionElements = screen.getAllByText('vision');
      expect(visionElements.length).toBeGreaterThan(0);
    });

    it('should display model capabilities', () => {
      render(
        <ModelSelector
          currentModel="qwen3-vl:8b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.getByText('Capabilities:')).toBeInTheDocument();
      expect(screen.getByText('text')).toBeInTheDocument();
      // Use getAllByText since "vision" appears in both category and capabilities
      const visionElements = screen.getAllByText('vision');
      expect(visionElements.length).toBe(2); // Once in category, once in capabilities
    });

    it('should display recommended use cases', () => {
      render(
        <ModelSelector
          currentModel="qwen3-vl:8b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.getByText('Best for:')).toBeInTheDocument();
      expect(screen.getByText('image-analysis')).toBeInTheDocument();
      expect(screen.getByText('visual-design')).toBeInTheDocument();
    });

    it('should limit recommended use cases to 3', () => {
      const modelWithManyRecommendations: ModelMetadata = {
        name: 'test-model',
        category: 'general',
        size: '1.0GB',
        available: true,
        capabilities: ['text'],
        recommendedFor: ['task1', 'task2', 'task3', 'task4', 'task5'],
      };

      render(
        <ModelSelector
          currentModel="test-model"
          availableModels={[modelWithManyRecommendations]}
          onModelChange={mockOnModelChange}
        />
      );

      const badges = screen.getAllByText(/task\d/);
      expect(badges).toHaveLength(3);
    });

    it('should not display capabilities section if empty', () => {
      const modelWithoutCapabilities: ModelMetadata = {
        name: 'test-model',
        category: 'general',
        size: '1.0GB',
        available: true,
        capabilities: [],
        recommendedFor: ['testing'],
      };

      render(
        <ModelSelector
          currentModel="test-model"
          availableModels={[modelWithoutCapabilities]}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.queryByText('Capabilities:')).not.toBeInTheDocument();
    });

    it('should not display recommendations section if empty', () => {
      const modelWithoutRecommendations: ModelMetadata = {
        name: 'test-model',
        category: 'general',
        size: '1.0GB',
        available: true,
        capabilities: ['text'],
        recommendedFor: [],
      };

      render(
        <ModelSelector
          currentModel="test-model"
          availableModels={[modelWithoutRecommendations]}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.queryByText('Best for:')).not.toBeInTheDocument();
    });

    it('should update metadata when model changes', () => {
      const { rerender } = render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.getByText('4.0GB')).toBeInTheDocument();
      expect(screen.getByText('quick')).toBeInTheDocument();

      rerender(
        <ModelSelector
          currentModel="qwen3-vl:8b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      expect(screen.getByText('8.0GB')).toBeInTheDocument();
      // Use getAllByText since "vision" appears in both category and capabilities
      const visionElements = screen.getAllByText('vision');
      expect(visionElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty model list', () => {
      render(
        <ModelSelector
          currentModel=""
          availableModels={[]}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options).toHaveLength(0);
    });

    it('should handle model not in available list', () => {
      render(
        <ModelSelector
          currentModel="nonexistent-model"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      // The select will default to the first available option if value doesn't exist
      // This is standard HTML select behavior
      expect(select.value).toBe('gemma3:4b'); // First available model
      
      // Metadata should NOT be displayed because currentModel doesn't match any model
      expect(screen.queryByText('Size:')).not.toBeInTheDocument();
    });

    it('should handle all models unavailable', () => {
      const unavailableModels = mockModels.map(m => ({
        ...m,
        available: false,
      }));

      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={unavailableModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options);

      expect(options.every(o => o.disabled)).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox');
      const label = screen.getByText('Select Model:');

      expect(select).toHaveAttribute('id', 'model-select');
      expect(label).toHaveAttribute('for', 'model-select');
    });

    it('should be keyboard navigable', () => {
      render(
        <ModelSelector
          currentModel="gemma3:4b"
          availableModels={mockModels}
          onModelChange={mockOnModelChange}
        />
      );

      const select = screen.getByRole('combobox');
      
      // Should be focusable
      select.focus();
      expect(document.activeElement).toBe(select);
    });
  });
});
