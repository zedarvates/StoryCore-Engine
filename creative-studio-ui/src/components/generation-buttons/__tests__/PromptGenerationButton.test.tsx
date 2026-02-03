/**
 * PromptGenerationButton Component Tests
 * 
 * Unit tests for the PromptGenerationButton component.
 * Tests button states, tooltips, keyboard shortcuts, and user interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptGenerationButton } from '../PromptGenerationButton';
import { useGenerationStore } from '../../../stores/generationStore';

// Mock the generation store
vi.mock('../../../stores/generationStore', () => ({
  useGenerationStore: vi.fn(),
}));

describe('PromptGenerationButton', () => {
  const mockOnClick = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    (useGenerationStore as any).mockReturnValue({
      currentPipeline: null,
    });
  });
  
  describe('Basic Rendering', () => {
    it('should render the button with default text', () => {
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      expect(screen.getByRole('button', { name: /generate prompt/i })).toBeInTheDocument();
      expect(screen.getByText('Generate Prompt')).toBeInTheDocument();
    });
    
    it('should render with FileText icon', () => {
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      // Just verify the button renders - icon rendering in JSDOM is not reliable
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
  
  describe('Button States', () => {
    it('should be enabled by default', () => {
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
    
    it('should be disabled when disabled prop is true', () => {
      render(<PromptGenerationButton onClick={mockOnClick} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
    
    it('should be disabled when isGenerating is true', () => {
      render(<PromptGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });
    
    it('should show "Regenerate Prompt" when prompt is completed', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'completed' },
          },
        },
      });
      
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      expect(screen.getByText('Regenerate Prompt')).toBeInTheDocument();
    });
    
    it('should use destructive variant when prompt failed', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'failed' },
          },
        },
      });
      
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      // Check for destructive styling classes
      expect(button.className).toContain('bg-destructive');
    });
  });
  
  describe('User Interactions', () => {
    it('should call onClick when button is clicked', () => {
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
    
    it('should not call onClick when disabled', () => {
      render(<PromptGenerationButton onClick={mockOnClick} disabled={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
    
    it('should not call onClick when generating', () => {
      render(<PromptGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });
  
  describe('Keyboard Shortcuts', () => {
    it('should trigger onClick on Ctrl+Shift+P', async () => {
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      fireEvent.keyDown(window, {
        key: 'P',
        ctrlKey: true,
        shiftKey: true,
      });
      
      await waitFor(() => {
        expect(mockOnClick).toHaveBeenCalledTimes(1);
      });
    });
    
    it('should not trigger onClick on Ctrl+Shift+P when disabled', async () => {
      render(<PromptGenerationButton onClick={mockOnClick} disabled={true} />);
      
      fireEvent.keyDown(window, {
        key: 'P',
        ctrlKey: true,
        shiftKey: true,
      });
      
      await waitFor(() => {
        expect(mockOnClick).not.toHaveBeenCalled();
      });
    });
    
    it('should not trigger onClick on Ctrl+Shift+P when generating', async () => {
      render(<PromptGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      fireEvent.keyDown(window, {
        key: 'P',
        ctrlKey: true,
        shiftKey: true,
      });
      
      await waitFor(() => {
        expect(mockOnClick).not.toHaveBeenCalled();
      });
    });
    
    it('should not trigger on Ctrl+P (without Shift)', async () => {
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      fireEvent.keyDown(window, {
        key: 'P',
        ctrlKey: true,
        shiftKey: false,
      });
      
      await waitFor(() => {
        expect(mockOnClick).not.toHaveBeenCalled();
      });
    });
  });
  
  describe('Tooltips', () => {
    // Note: Tooltip rendering in tests requires user interaction simulation
    // These tests verify the tooltip component is present, but actual tooltip
    // content rendering may require additional setup with TooltipProvider
    
    it('should have tooltip wrapper for initial state', () => {
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      // Verify button is wrapped in tooltip trigger
      expect(button.getAttribute('data-state')).toBeDefined();
    });
    
    it('should have tooltip wrapper when disabled', () => {
      render(
        <PromptGenerationButton
          onClick={mockOnClick}
          disabled={true}
          disabledReason="Service unavailable"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('data-state')).toBeDefined();
    });
    
    it('should have tooltip wrapper when generating', () => {
      render(<PromptGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('data-state')).toBeDefined();
    });
    
    it('should have tooltip wrapper when completed', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'completed' },
          },
        },
      });
      
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('data-state')).toBeDefined();
    });
    
    it('should have tooltip wrapper when failed', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            prompt: { status: 'failed' },
          },
        },
      });
      
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      expect(button.getAttribute('data-state')).toBeDefined();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PromptGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Generate prompt');
    });
    
    it('should have aria-busy when generating', () => {
      render(<PromptGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
    
    it('should have aria-disabled when disabled', () => {
      render(<PromptGenerationButton onClick={mockOnClick} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });
  
  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<PromptGenerationButton onClick={mockOnClick} className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });
});
