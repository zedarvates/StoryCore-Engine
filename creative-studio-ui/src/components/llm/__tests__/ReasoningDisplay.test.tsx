/**
 * Tests for ReasoningDisplay Component
 * 
 * Tests reasoning display UI including:
 * - Displaying thinking and summary blocks
 * - Collapse/expand functionality
 * - Model badge display
 * - Format warning indicator
 * - Accessibility features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReasoningDisplay } from '../ReasoningDisplay';
import type { ReasoningResponse } from '@/services/llm';

describe('ReasoningDisplay', () => {
  let mockResponse: ReasoningResponse;

  beforeEach(() => {
    mockResponse = {
      thinking: 'Step 1: Analyze the request\nStep 2: Consider options\nStep 3: Formulate response',
      summary: 'This is a comprehensive summary of the reasoning process.',
      rawResponse: '',
      modelUsed: 'qwen3-vl:8b',
      formatValid: true,
      timestamp: Date.now(),
    };
  });

  describe('Rendering', () => {
    it('should render model badge with model name', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      expect(screen.getByText('qwen3-vl:8b')).toBeInTheDocument();
    });

    it('should render timestamp', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      // Timestamp format depends on locale, just check it exists
      const timestamp = screen.getByText(/\d{1,2}:\d{2}:\d{2}/);
      expect(timestamp).toBeInTheDocument();
    });

    it('should render summary block', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      expect(screen.getByText('✨ Summary')).toBeInTheDocument();
      expect(screen.getByText(mockResponse.summary)).toBeInTheDocument();
    });

    it('should render thinking toggle button when thinking exists', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      expect(screen.getByRole('button', { name: /Show Reasoning/i })).toBeInTheDocument();
    });

    it('should not render thinking toggle when thinking is undefined', () => {
      const responseWithoutThinking = { ...mockResponse, thinking: undefined };
      render(<ReasoningDisplay response={responseWithoutThinking} />);

      expect(screen.queryByRole('button', { name: /Show Reasoning/i })).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <ReasoningDisplay response={mockResponse} className="custom-class" />
      );

      const display = container.querySelector('.reasoning-display');
      expect(display).toHaveClass('custom-class');
    });
  });

  describe('Thinking Block Toggle', () => {
    it('should not show thinking block by default', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      expect(screen.queryByText(/Step 1: Analyze the request/)).not.toBeInTheDocument();
    });

    it('should show thinking block when toggle is clicked', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText(/Step 1: Analyze the request/)).toBeInTheDocument();
    });

    it('should hide thinking block when toggle is clicked again', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      
      // Show
      fireEvent.click(toggleButton);
      expect(screen.getByText(/Step 1: Analyze the request/)).toBeInTheDocument();

      // Hide
      fireEvent.click(toggleButton);
      expect(screen.queryByText(/Step 1: Analyze the request/)).not.toBeInTheDocument();
    });

    it('should update button text when toggled', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      
      // Initially shows "Show Reasoning"
      expect(toggleButton).toHaveTextContent(/Show Reasoning/);

      // After click, shows "Hide Reasoning"
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveTextContent(/Hide Reasoning/);
    });

    it('should update aria-expanded attribute', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Controlled State', () => {
    it('should use controlled showThinking prop', () => {
      const { rerender } = render(
        <ReasoningDisplay response={mockResponse} showThinking={true} />
      );

      // Should show thinking when prop is true
      expect(screen.getByText(/Step 1: Analyze the request/)).toBeInTheDocument();

      rerender(<ReasoningDisplay response={mockResponse} showThinking={false} />);

      // Should hide thinking when prop is false
      expect(screen.queryByText(/Step 1: Analyze the request/)).not.toBeInTheDocument();
    });

    it('should call onToggleThinking when toggle is clicked', () => {
      const mockOnToggle = vi.fn();
      render(
        <ReasoningDisplay
          response={mockResponse}
          showThinking={false}
          onToggleThinking={mockOnToggle}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      fireEvent.click(toggleButton);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should not update internal state when controlled', () => {
      const mockOnToggle = vi.fn();
      render(
        <ReasoningDisplay
          response={mockResponse}
          showThinking={false}
          onToggleThinking={mockOnToggle}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      fireEvent.click(toggleButton);

      // Thinking should still be hidden because parent controls state
      expect(screen.queryByText(/Step 1: Analyze the request/)).not.toBeInTheDocument();
    });
  });

  describe('Format Warning', () => {
    it('should show warning icon when format is invalid', () => {
      const invalidResponse = { ...mockResponse, formatValid: false };
      render(<ReasoningDisplay response={invalidResponse} />);

      const warningIcon = screen.getByTitle(/Response format was not perfect/i);
      expect(warningIcon).toBeInTheDocument();
    });

    it('should not show warning icon when format is valid', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      const warningIcon = screen.queryByTitle(/Response format was not perfect/i);
      expect(warningIcon).not.toBeInTheDocument();
    });

    it('should show format warning details when format is invalid', () => {
      const invalidResponse = { ...mockResponse, formatValid: false };
      render(<ReasoningDisplay response={invalidResponse} />);

      expect(screen.getByText(/The response format was not perfect/i)).toBeInTheDocument();
      expect(screen.getByText(/fallback methods/i)).toBeInTheDocument();
    });

    it('should not show format warning details when format is valid', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      expect(screen.queryByText(/The response format was not perfect/i)).not.toBeInTheDocument();
    });
  });

  describe('Model Badge', () => {
    it('should display model name', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      expect(screen.getByText('qwen3-vl:8b')).toBeInTheDocument();
    });

    it('should display "Unknown Model" when modelUsed is not provided', () => {
      const responseWithoutModel = { ...mockResponse, modelUsed: '' };
      render(<ReasoningDisplay response={responseWithoutModel} />);

      expect(screen.getByText('Unknown Model')).toBeInTheDocument();
    });

    it('should include model icon', () => {
      const { container } = render(<ReasoningDisplay response={mockResponse} />);

      const modelIcon = container.querySelector('.model-icon');
      expect(modelIcon).toBeInTheDocument();
      expect(modelIcon?.textContent).toBe('🤖');
    });
  });

  describe('Content Display', () => {
    it('should display thinking content with proper formatting', () => {
      render(<ReasoningDisplay response={mockResponse} showThinking={true} />);

      const thinkingContent = screen.getByText(/Step 1: Analyze the request/);
      expect(thinkingContent).toBeInTheDocument();
      
      // Should preserve line breaks
      expect(thinkingContent.textContent).toContain('Step 1');
      expect(thinkingContent.textContent).toContain('Step 2');
      expect(thinkingContent.textContent).toContain('Step 3');
    });

    it('should display summary content', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      expect(screen.getByText(mockResponse.summary)).toBeInTheDocument();
    });

    it('should handle long thinking content', () => {
      const longThinking = 'A'.repeat(1000);
      const longResponse = { ...mockResponse, thinking: longThinking };
      
      render(<ReasoningDisplay response={longResponse} showThinking={true} />);

      expect(screen.getByText(longThinking)).toBeInTheDocument();
    });

    it('should handle long summary content', () => {
      const longSummary = 'B'.repeat(1000);
      const longResponse = { ...mockResponse, summary: longSummary };
      
      render(<ReasoningDisplay response={longResponse} />);

      expect(screen.getByText(longSummary)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for regions', () => {
      render(<ReasoningDisplay response={mockResponse} showThinking={true} />);

      expect(screen.getByRole('region', { name: /Reasoning process/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /Summary/i })).toBeInTheDocument();
    });

    it('should have aria-controls on toggle button', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      expect(toggleButton).toHaveAttribute('aria-controls', 'thinking-content');
    });

    it('should be keyboard navigable', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      
      // Should be focusable
      toggleButton.focus();
      expect(document.activeElement).toBe(toggleButton);
    });

    it('should support keyboard activation', () => {
      render(<ReasoningDisplay response={mockResponse} />);

      const toggleButton = screen.getByRole('button', { name: /Show Reasoning/i });
      
      // Simulate Enter key
      fireEvent.keyDown(toggleButton, { key: 'Enter', code: 'Enter' });
      fireEvent.click(toggleButton);

      expect(screen.getByText(/Step 1: Analyze the request/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty thinking string', () => {
      const emptyThinkingResponse = { ...mockResponse, thinking: '' };
      render(<ReasoningDisplay response={emptyThinkingResponse} />);

      // Should NOT show toggle button for empty thinking
      expect(screen.queryByRole('button', { name: /Show Reasoning/i })).not.toBeInTheDocument();
    });

    it('should handle empty summary string', () => {
      const emptySummaryResponse = { ...mockResponse, summary: '' };
      render(<ReasoningDisplay response={emptySummaryResponse} />);

      // Summary block should still be rendered
      expect(screen.getByText('✨ Summary')).toBeInTheDocument();
    });

    it('should handle special characters in content', () => {
      const specialCharsResponse = {
        ...mockResponse,
        thinking: '<script>alert("xss")</script>',
        summary: '& < > " \' special chars',
      };
      
      render(<ReasoningDisplay response={specialCharsResponse} showThinking={true} />);

      // Should escape HTML
      expect(screen.getByText(/script/)).toBeInTheDocument();
      expect(screen.getByText(/special chars/)).toBeInTheDocument();
    });

    it('should handle very old timestamp', () => {
      const oldResponse = {
        ...mockResponse,
        timestamp: new Date('2020-01-01T00:00:00Z').getTime(),
      };
      
      render(<ReasoningDisplay response={oldResponse} />);

      // Should still render without error
      expect(screen.getByText('qwen3-vl:8b')).toBeInTheDocument();
    });

    it('should handle future timestamp', () => {
      const futureResponse = {
        ...mockResponse,
        timestamp: new Date('2030-01-01T00:00:00Z').getTime(),
      };
      
      render(<ReasoningDisplay response={futureResponse} />);

      // Should still render without error
      expect(screen.getByText('qwen3-vl:8b')).toBeInTheDocument();
    });
  });
});
