/**
 * Asset Generation Dialog Tests
 * 
 * Tests for AI asset generation dialog functionality.
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AssetGenerationDialog } from '../AssetGenerationDialog';
import assetsReducer from '../../../store/slices/assetsSlice';

// Helper to create a test store
function createTestStore() {
  return configureStore({
    reducer: {
      assets: assetsReducer,
    },
  });
}

// Helper to render with providers
function renderWithProviders(component: React.ReactElement) {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
}

describe('AssetGenerationDialog Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 14.1: Dialog Display', () => {
    it('should display dialog title', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      expect(screen.getByText(/generate new asset/i)).toBeInTheDocument();
    });

    it('should display close button', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const closeButton = screen.getByTitle('Close') || 
                          document.querySelector('.dialog-close-btn');
      expect(closeButton).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const closeButton = document.querySelector('.dialog-close-btn');
      fireEvent.click(closeButton!);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on backdrop click', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const backdrop = document.querySelector('.dialog-backdrop');
      fireEvent.click(backdrop!);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Requirement 14.2: Asset Type Selection', () => {
    it('should display 7 asset type options', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      expect(screen.getByText('Character')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
      expect(screen.getByText('Prop')).toBeInTheDocument();
      expect(screen.getByText('Visual Style')).toBeInTheDocument();
      expect(screen.getByText('Template')).toBeInTheDocument();
      expect(screen.getByText('Camera Preset')).toBeInTheDocument();
      expect(screen.getByText('Lighting Rig')).toBeInTheDocument();
    });

    it('should have icons for each asset type', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const typeButtons = document.querySelectorAll('.asset-type-btn');
      expect(typeButtons.length).toBe(7);
      
      typeButtons.forEach(button => {
        const icon = button.querySelector('.type-icon');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should select asset type on click', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const environmentButton = screen.getByText('Environment').closest('button');
      fireEvent.click(environmentButton!);
      
      expect(environmentButton).toHaveClass('selected');
    });

    it('should default to category-based type', () => {
      renderWithProviders(
        <AssetGenerationDialog 
          onClose={mockOnClose} 
          defaultCategory="environments"
        />
      );
      
      const environmentButton = screen.getByText('Environment').closest('button');
      expect(environmentButton).toHaveClass('selected');
    });
  });

  describe('Requirement 14.3: Prompt Input', () => {
    it('should display prompt textarea', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const textarea = screen.getByLabelText(/describe your asset/i);
      expect(textarea).toBeInTheDocument();
    });

    it('should mark prompt as required', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const requiredIndicator = document.querySelector('.required');
      expect(requiredIndicator).toBeInTheDocument();
    });

    it('should update prompt on input', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const textarea = screen.getByLabelText(/describe your asset/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'A fantasy character' } });
      
      expect(textarea.value).toBe('A fantasy character');
    });

    it('should show error when generating without prompt', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const generateButton = screen.getByText(/generate/i);
      fireEvent.click(generateButton);
      
      expect(screen.getByText(/please enter a prompt/i)).toBeInTheDocument();
    });
  });

  describe('Requirement 14.4-14.7: Generation Parameters', () => {
    it('should display seed parameter', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      expect(screen.getByText(/seed/i)).toBeInTheDocument();
    });

    it('should display guidance parameter', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      expect(screen.getByText(/guidance/i)).toBeInTheDocument();
    });

    it('should display steps parameter', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      expect(screen.getByText(/steps/i)).toBeInTheDocument();
    });

    it('should allow seed input', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const seedInput = screen.getByLabelText(/seed/i) as HTMLInputElement;
      fireEvent.change(seedInput, { target: { value: '12345' } });
      
      expect(seedInput.value).toBe('12345');
    });

    it('should have random seed button', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const randomButton = screen.getByTitle(/random seed/i);
      expect(randomButton).toBeInTheDocument();
    });

    it('should randomize seed on button click', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const seedInput = screen.getByLabelText(/seed/i) as HTMLInputElement;
      const initialSeed = seedInput.value;
      
      const randomButton = screen.getByTitle(/random seed/i);
      fireEvent.click(randomButton);
      
      // Seed should change (with very high probability)
      expect(seedInput.value).not.toBe(initialSeed);
    });

    it('should allow guidance adjustment', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const guidanceSlider = document.querySelector('input[type="range"]') as HTMLInputElement;
      fireEvent.change(guidanceSlider, { target: { value: '10' } });
      
      expect(guidanceSlider.value).toBe('10');
    });
  });

  describe('Generation Process', () => {
    it('should disable generate button without prompt', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const generateButton = screen.getByText(/generate/i).closest('button');
      expect(generateButton).toBeDisabled();
    });

    it('should enable generate button with prompt', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const textarea = screen.getByLabelText(/describe your asset/i);
      fireEvent.change(textarea, { target: { value: 'Test prompt' } });
      
      const generateButton = screen.getByText(/generate/i).closest('button');
      expect(generateButton).not.toBeDisabled();
    });

    it('should show progress during generation', async () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const textarea = screen.getByLabelText(/describe your asset/i);
      fireEvent.change(textarea, { target: { value: 'Test prompt' } });
      
      const generateButton = screen.getByText(/generate/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/generating/i)).toBeInTheDocument();
      });
    });

    it('should show progress bar during generation', async () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const textarea = screen.getByLabelText(/describe your asset/i);
      fireEvent.change(textarea, { target: { value: 'Test prompt' } });
      
      const generateButton = screen.getByText(/generate/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const progressBar = document.querySelector('.progress-bar');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('should disable close during generation', async () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const textarea = screen.getByLabelText(/describe your asset/i);
      fireEvent.change(textarea, { target: { value: 'Test prompt' } });
      
      const generateButton = screen.getByText(/generate/i);
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const closeButton = document.querySelector('.dialog-close-btn');
        expect(closeButton).toBeDisabled();
      });
    });

    it('should close dialog after successful generation', async () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const textarea = screen.getByLabelText(/describe your asset/i);
      fireEvent.change(textarea, { target: { value: 'Test prompt' } });
      
      const generateButton = screen.getByText(/generate/i);
      fireEvent.click(generateButton);
      
      // Wait for generation to complete (simulated)
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for inputs', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      expect(screen.getByLabelText(/describe your asset/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/seed/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(
        <AssetGenerationDialog onClose={mockOnClose} />
      );
      
      const textarea = screen.getByLabelText(/describe your asset/i);
      textarea.focus();
      
      expect(document.activeElement).toBe(textarea);
    });
  });
});
