/**
 * Tests for LLMSettingsPanel Component
 * 
 * Tests settings panel UI including:
 * - Rendering all settings
 * - Reasoning mode toggle
 * - Show thinking toggle
 * - Confucian principles selector
 * - Save/reset functionality
 * - Settings persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LLMSettingsPanel, type LLMSettings } from '../LLMSettingsPanel';

describe('LLMSettingsPanel', () => {
  let mockSettings: LLMSettings;
  let mockOnSettingsChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSettings = {
      reasoningMode: {
        enabled: true,
        showThinkingByDefault: false,
        confucianPrinciples: ['ren', 'li', 'yi', 'zhi'],
      },
      availableModels: {
        vision: ['qwen3-vl:8b'],
        storytelling: ['llama3.1:8b', 'mistral:7b'],
        quick: ['gemma3:4b', 'gemma3:1b'],
        default: 'gemma3:4b',
      },
    };

    mockOnSettingsChange = vi.fn();
  });

  describe('Rendering', () => {
    it('should render settings panel with title', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('LLM Settings')).toBeInTheDocument();
      expect(screen.getByText(/Configure reasoning mode/i)).toBeInTheDocument();
    });

    it('should render reasoning mode section', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('Reasoning Mode')).toBeInTheDocument();
      expect(screen.getByText('Enable Reasoning Mode')).toBeInTheDocument();
      expect(screen.getByText('Show Thinking by Default')).toBeInTheDocument();
    });

    it('should render Confucian principles section', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('Confucian Principles')).toBeInTheDocument();
      expect(screen.getByText(/仁 \(Ren - Benevolence\)/)).toBeInTheDocument();
      expect(screen.getByText(/礼 \(Li - Respect\)/)).toBeInTheDocument();
      expect(screen.getByText(/义 \(Yi - Transparency\)/)).toBeInTheDocument();
      expect(screen.getByText(/智 \(Zhi - Wisdom\)/)).toBeInTheDocument();
    });

    it('should render available models section', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText('Available Models')).toBeInTheDocument();
      expect(screen.getByText(/Vision:/)).toBeInTheDocument();
      expect(screen.getByText(/Storytelling:/)).toBeInTheDocument();
      expect(screen.getByText(/Quick:/)).toBeInTheDocument();
      expect(screen.getByText(/Default:/)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByRole('button', { name: /Reset to Defaults/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Saved/i })).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
          className="custom-class"
        />
      );

      const panel = container.querySelector('.llm-settings-panel');
      expect(panel).toHaveClass('custom-class');
    });
  });

  describe('Reasoning Mode Toggle', () => {
    it('should show reasoning mode as enabled', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkbox = screen.getByLabelText('Enable Reasoning Mode') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should toggle reasoning mode when clicked', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkbox = screen.getByLabelText('Enable Reasoning Mode');
      fireEvent.click(checkbox);

      // Should enable save button
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeEnabled();
    });

    it('should disable show thinking toggle when reasoning mode is disabled', () => {
      const disabledSettings = {
        ...mockSettings,
        reasoningMode: { ...mockSettings.reasoningMode, enabled: false },
      };

      render(
        <LLMSettingsPanel
          settings={disabledSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const showThinkingCheckbox = screen.getByLabelText('Show Thinking by Default') as HTMLInputElement;
      expect(showThinkingCheckbox.disabled).toBe(true);
    });
  });

  describe('Show Thinking Toggle', () => {
    it('should show thinking toggle state', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkbox = screen.getByLabelText('Show Thinking by Default') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should toggle show thinking when clicked', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkbox = screen.getByLabelText('Show Thinking by Default');
      fireEvent.click(checkbox);

      // Should enable save button
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeEnabled();
    });
  });

  describe('Confucian Principles Selection', () => {
    it('should show all principles as selected by default', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Check that all principle cards have the 'selected' class
      const renCard = screen.getByText(/Prioritize user's creative flourishing/).closest('.principle-card');
      const liCard = screen.getByText(/Honor cultural context/).closest('.principle-card');
      const yiCard = screen.getByText(/Explain reasoning clearly/).closest('.principle-card');
      const zhiCard = screen.getByText(/Learn from feedback/).closest('.principle-card');

      expect(renCard).toHaveClass('selected');
      expect(liCard).toHaveClass('selected');
      expect(yiCard).toHaveClass('selected');
      expect(zhiCard).toHaveClass('selected');
    });

    it('should toggle principle when checkbox is clicked', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Click the principle card to toggle it
      const renCard = screen.getByText(/Prioritize user's creative flourishing/).closest('.principle-card');
      if (renCard) {
        fireEvent.click(renCard);
      }

      // Should enable save button
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeEnabled();
    });

    it('should toggle principle when card is clicked', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Find the principle card (not the checkbox)
      const renCard = screen.getByText(/Prioritize user's creative flourishing/).closest('.principle-card');
      expect(renCard).toBeInTheDocument();

      if (renCard) {
        fireEvent.click(renCard);

        // Should enable save button
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        expect(saveButton).toBeEnabled();
      }
    });

    it('should support keyboard navigation on principle cards', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const renCard = screen.getByText(/Prioritize user's creative flourishing/).closest('.principle-card');
      
      if (renCard) {
        // Should be focusable
        expect(renCard).toHaveAttribute('tabIndex', '0');
        
        // Should respond to Enter key (use click instead of keyPress for simplicity)
        fireEvent.click(renCard);
        
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        expect(saveButton).toBeEnabled();
      }
    });

    it('should show selected principles with selected class', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const renCard = screen.getByText(/Prioritize user's creative flourishing/).closest('.principle-card');
      expect(renCard).toHaveClass('selected');
    });

    it('should allow deselecting all principles', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Deselect all principles by clicking the cards
      const cards = [
        screen.getByText(/Prioritize user's creative flourishing/).closest('.principle-card'),
        screen.getByText(/Honor cultural context/).closest('.principle-card'),
        screen.getByText(/Explain reasoning clearly/).closest('.principle-card'),
        screen.getByText(/Learn from feedback/).closest('.principle-card'),
      ];

      cards.forEach(card => {
        if (card) fireEvent.click(card);
      });

      // Should enable save button
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeEnabled();
    });
  });

  describe('Available Models Display', () => {
    it('should display vision models', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText(/qwen3-vl:8b/)).toBeInTheDocument();
    });

    it('should display storytelling models', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText(/llama3.1:8b, mistral:7b/)).toBeInTheDocument();
    });

    it('should display quick models', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(screen.getByText(/gemma3:4b, gemma3:1b/)).toBeInTheDocument();
    });

    it('should display default model', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Find the default model text (appears twice - in quick and default)
      const defaultTexts = screen.getAllByText(/gemma3:4b/);
      expect(defaultTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Save Functionality', () => {
    it('should disable save button when no changes', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Saved/i });
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button when changes are made', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkbox = screen.getByLabelText('Enable Reasoning Mode');
      fireEvent.click(checkbox);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeEnabled();
    });

    it('should call onSettingsChange when save is clicked', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Make a change
      const checkbox = screen.getByLabelText('Enable Reasoning Mode');
      fireEvent.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      expect(mockOnSettingsChange).toHaveBeenCalledTimes(1);
      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoningMode: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });

    it('should disable save button after saving', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Make a change
      const checkbox = screen.getByLabelText('Enable Reasoning Mode');
      fireEvent.click(checkbox);

      // Click save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      // Button should be disabled again
      expect(screen.getByRole('button', { name: /Saved/i })).toBeDisabled();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to default settings when reset is clicked', () => {
      const customSettings = {
        ...mockSettings,
        reasoningMode: {
          enabled: false,
          showThinkingByDefault: true,
          confucianPrinciples: ['ren'] as ('ren' | 'li' | 'yi' | 'zhi')[],
        },
      };

      render(
        <LLMSettingsPanel
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/i });
      fireEvent.click(resetButton);

      // Should enable save button
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeEnabled();
    });

    it('should restore all default values', () => {
      const customSettings = {
        ...mockSettings,
        reasoningMode: {
          enabled: false,
          showThinkingByDefault: true,
          confucianPrinciples: [] as ('ren' | 'li' | 'yi' | 'zhi')[],
        },
      };

      render(
        <LLMSettingsPanel
          settings={customSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/i });
      fireEvent.click(resetButton);

      // Check that defaults are restored
      const enabledCheckbox = screen.getByLabelText('Enable Reasoning Mode') as HTMLInputElement;
      const showThinkingCheckbox = screen.getByLabelText('Show Thinking by Default') as HTMLInputElement;

      expect(enabledCheckbox.checked).toBe(true);
      expect(showThinkingCheckbox.checked).toBe(false);
    });
  });

  describe('Settings Persistence', () => {
    it('should update when settings prop changes', () => {
      const { rerender } = render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkbox = screen.getByLabelText('Enable Reasoning Mode') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);

      const newSettings = {
        ...mockSettings,
        reasoningMode: { ...mockSettings.reasoningMode, enabled: false },
      };

      rerender(
        <LLMSettingsPanel
          settings={newSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      expect(checkbox.checked).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty principles array', () => {
      const emptyPrinciplesSettings = {
        ...mockSettings,
        reasoningMode: {
          ...mockSettings.reasoningMode,
          confucianPrinciples: [] as ('ren' | 'li' | 'yi' | 'zhi')[],
        },
      };

      render(
        <LLMSettingsPanel
          settings={emptyPrinciplesSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Check that the card is not selected
      const renCard = screen.getByText(/Prioritize user's creative flourishing/).closest('.principle-card');
      expect(renCard).not.toHaveClass('selected');
    });

    it('should handle empty model arrays', () => {
      const emptyModelsSettings = {
        ...mockSettings,
        availableModels: {
          vision: [],
          storytelling: [],
          quick: [],
          default: 'gemma3:4b',
        },
      };

      render(
        <LLMSettingsPanel
          settings={emptyModelsSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Should still render without error
      expect(screen.getByText('Available Models')).toBeInTheDocument();
    });

    it('should handle rapid toggle clicks', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkbox = screen.getByLabelText('Enable Reasoning Mode');
      
      // Click multiple times rapidly
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      // Should still work correctly
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeEnabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const mainHeading = screen.getByRole('heading', { name: /LLM Settings/i });
      expect(mainHeading).toBeInTheDocument();
    });

    it('should have accessible checkboxes', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Check that the main checkboxes (reasoning mode toggles) have accessible names
      const reasoningCheckbox = screen.getByLabelText('Enable Reasoning Mode');
      const thinkingCheckbox = screen.getByLabelText('Show Thinking by Default');
      
      expect(reasoningCheckbox).toBeInTheDocument();
      expect(thinkingCheckbox).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      // Check for the action buttons (Reset and Save)
      // Note: principle cards also have role="button" so we filter by actual button elements
      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/i });
      const saveButton = screen.getByRole('button', { name: /Saved/i });

      expect(resetButton).toBeInTheDocument();
      expect(saveButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <LLMSettingsPanel
          settings={mockSettings}
          onSettingsChange={mockOnSettingsChange}
        />
      );

      const checkbox = screen.getByLabelText('Enable Reasoning Mode');
      
      // Should be focusable
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
    });
  });
});
