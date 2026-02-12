/**
 * Unit tests for ShotPromptEditor component
 * Requirements: 1.1, 1.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ShotPromptEditor } from '../ShotPromptEditor';
import type { Shot } from '../../types/projectDashboard';

describe('ShotPromptEditor', () => {
  const mockOnPromptChange = vi.fn();

  const createMockShot = (overrides?: Partial<Shot>): Shot => ({
    id: 'shot-1',
    sequenceId: 'seq-1',
    startTime: 0,
    duration: 5,
    prompt: '',
    metadata: {},
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with empty prompt', () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
        />
      );

      expect(screen.getByLabelText('Shot Prompt')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter a detailed prompt/i)).toBeInTheDocument();
    });

    it('should render with existing prompt', () => {
      const shot = createMockShot({ prompt: 'A beautiful sunset over the ocean' });
      render(
        <ShotPromptEditor
          shot={shot}
          prompt="A beautiful sunset over the ocean"
          onPromptChange={mockOnPromptChange}
        />
      );

      const textarea = screen.getByLabelText('Shot Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('A beautiful sunset over the ocean');
    });

    it('should display character counter', () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt="Test prompt"
          onPromptChange={mockOnPromptChange}
        />
      );

      expect(screen.getByText(/11 \/ 500/)).toBeInTheDocument();
    });
  });

  describe('Validation Indicators', () => {
    it('should show valid indicator for valid prompt', async () => {
      const shot = createMockShot();
      const validPrompt = 'A beautiful sunset over the ocean with vibrant colors';
      
      render(
        <ShotPromptEditor
          shot={shot}
          prompt={validPrompt}
          onPromptChange={mockOnPromptChange}
        />
      );

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByText('Valid')).toBeInTheDocument();
      });
    });

    it('should show invalid indicator for too short prompt', async () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
        />
      );

      const textarea = screen.getByLabelText('Shot Prompt');
      fireEvent.change(textarea, { target: { value: 'Short' } });

      // Wait for debounce and validation
      await waitFor(
        () => {
          expect(screen.getByText('Invalid')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should show warning indicator for short but valid prompt', async () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt="Short valid"
          onPromptChange={mockOnPromptChange}
        />
      );

      // Wait for validation to complete
      await waitFor(
        () => {
          expect(screen.getByText('Warning')).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Character Counter', () => {
    it('should update character count as user types', async () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
        />
      );

      const textarea = screen.getByLabelText('Shot Prompt');
      fireEvent.change(textarea, { target: { value: 'Test prompt here' } });

      expect(screen.getByText(/16 \/ 500/)).toBeInTheDocument();
    });

    it('should show red counter for too short prompt', () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt="Short"
          onPromptChange={mockOnPromptChange}
        />
      );

      const counter = screen.getByText(/5 \/ 500/);
      expect(counter).toHaveClass('bg-red-100');
    });

    it('should show yellow counter when approaching limit', () => {
      const shot = createMockShot();
      const longPrompt = 'A'.repeat(460); // 92% of max length
      render(
        <ShotPromptEditor
          shot={shot}
          prompt={longPrompt}
          onPromptChange={mockOnPromptChange}
        />
      );

      const counter = screen.getByText(/460 \/ 500/);
      expect(counter).toHaveClass('bg-yellow-100');
    });
  });

  describe('Debounced onChange', () => {
    it('should debounce onChange calls', async () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
        />
      );

      const textarea = screen.getByLabelText('Shot Prompt');
      
      // Type multiple characters quickly
      fireEvent.change(textarea, { target: { value: 'T' } });
      fireEvent.change(textarea, { target: { value: 'Te' } });
      fireEvent.change(textarea, { target: { value: 'Tes' } });
      fireEvent.change(textarea, { target: { value: 'Test' } });

      // Should not call immediately
      expect(mockOnPromptChange).not.toHaveBeenCalled();

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          expect(mockOnPromptChange).toHaveBeenCalledWith('Test');
        },
        { timeout: 500 }
      );

      // Should only be called once after debounce
      expect(mockOnPromptChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation Feedback', () => {
    it('should display error message for empty prompt after typing', async () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
        />
      );

      // Type something then delete it to trigger validation
      const textarea = screen.getByLabelText('Shot Prompt');
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.change(textarea, { target: { value: '' } });

      await waitFor(
        () => {
          expect(screen.getByText(/Prompt cannot be empty/i)).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should display error message for too long prompt', async () => {
      const shot = createMockShot();
      const tooLongPrompt = 'A'.repeat(501);
      
      render(
        <ShotPromptEditor
          shot={shot}
          prompt={tooLongPrompt}
          onPromptChange={mockOnPromptChange}
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText(/too long/i)).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should display warning for short valid prompt', async () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt="Short valid"
          onPromptChange={mockOnPromptChange}
        />
      );

      await waitFor(
        () => {
          expect(screen.getByText(/quite short/i)).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Suggestions', () => {
    it('should display AI suggestions when provided', () => {
      const shot = createMockShot();
      const suggestions = [
        'A beautiful sunset over the ocean',
        'A dramatic mountain landscape',
      ];

      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
          suggestions={suggestions}
        />
      );

      expect(screen.getByText('AI Suggestions:')).toBeInTheDocument();
      expect(screen.getByText(suggestions[0])).toBeInTheDocument();
      expect(screen.getByText(suggestions[1])).toBeInTheDocument();
    });

    it('should apply suggestion when clicked', () => {
      const shot = createMockShot();
      const suggestions = ['A beautiful sunset over the ocean'];

      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
          suggestions={suggestions}
        />
      );

      const suggestionButton = screen.getByText(suggestions[0]);
      fireEvent.click(suggestionButton);

      expect(mockOnPromptChange).toHaveBeenCalledWith(suggestions[0]);
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
        />
      );

      const textarea = screen.getByLabelText('Shot Prompt');
      expect(textarea).toHaveAttribute('id', `prompt-${shot.id}`);
    });

    it('should have placeholder text', () => {
      const shot = createMockShot();
      render(
        <ShotPromptEditor
          shot={shot}
          prompt=""
          onPromptChange={mockOnPromptChange}
        />
      );

      expect(
        screen.getByPlaceholderText(/Enter a detailed prompt for this shot/i)
      ).toBeInTheDocument();
    });
  });
});
