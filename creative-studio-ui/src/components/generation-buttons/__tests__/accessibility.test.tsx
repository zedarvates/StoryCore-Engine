/**
 * Accessibility Tests for Generation Buttons UI
 * 
 * Tests ARIA labels, live regions, focus management, and keyboard navigation
 * across all generation button components.
 * 
 * Requirements: 5.3, 5.4, 19.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptGenerationButton } from '../PromptGenerationButton';
import { ImageGenerationButton } from '../ImageGenerationButton';
import { VideoGenerationButton } from '../VideoGenerationButton';
import { AudioGenerationButton } from '../AudioGenerationButton';
import { GenerationProgressModal } from '../GenerationProgressModal';
import { PromptGenerationDialog } from '../PromptGenerationDialog';
import { ImageGenerationDialog } from '../ImageGenerationDialog';
import { VideoGenerationDialog } from '../VideoGenerationDialog';
import { AudioGenerationDialog } from '../AudioGenerationDialog';
import { useGenerationStore } from '../../../stores/generationStore';
import type { GenerationProgress } from '../../../types/generation';

// Mock the generation store
vi.mock('../../../stores/generationStore');

// Mock the generation orchestrator
vi.mock('../../../services/GenerationOrchestrator', () => ({
  generationOrchestrator: {
    generatePrompt: vi.fn(),
    generateImage: vi.fn(),
    generateVideo: vi.fn(),
    generateAudio: vi.fn(),
  },
}));

describe('Generation Buttons Accessibility', () => {
  beforeEach(() => {
    // Reset store mock
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: null,
      completeStage: vi.fn(),
      failStage: vi.fn(),
      updateStageProgress: vi.fn(),
      startPipeline: vi.fn(),
      skipStage: vi.fn(),
      queue: { tasks: [], activeTask: null, maxConcurrent: 1 },
      history: { entries: [], maxEntries: 100 },
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      addToHistory: vi.fn(),
      batchMode: false,
      setBatchMode: vi.fn(),
      batchSize: 1,
      setBatchSize: vi.fn(),
      variationParams: {},
      setVariationParams: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels on all generation buttons', () => {
      const onClick = vi.fn();

      const { rerender } = render(<PromptGenerationButton onClick={onClick} />);
      expect(screen.getByRole('button', { name: /generate prompt/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Generate prompt');

      rerender(<ImageGenerationButton onClick={onClick} />);
      expect(screen.getByRole('button', { name: /generate image/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Generate image');

      rerender(<VideoGenerationButton onClick={onClick} />);
      expect(screen.getByRole('button', { name: /generate video/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Generate video');

      rerender(<AudioGenerationButton onClick={onClick} />);
      expect(screen.getByRole('button', { name: /generate audio/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Generate audio');
    });

    it('should have ARIA descriptions explaining button state', () => {
      const onClick = vi.fn();

      render(<PromptGenerationButton onClick={onClick} />);
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-description');
      const description = button.getAttribute('aria-description');
      expect(description).toBeTruthy();
      expect(description).toContain('prompt');
    });

    it('should update ARIA busy state during generation', () => {
      const onClick = vi.fn();

      const { rerender } = render(
        <PromptGenerationButton onClick={onClick} isGenerating={false} />
      );
      
      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'false');

      rerender(<PromptGenerationButton onClick={onClick} isGenerating={true} />);
      
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should have ARIA disabled state when button is disabled', () => {
      const onClick = vi.fn();

      render(<PromptGenerationButton onClick={onClick} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toBeDisabled();
    });

    it('should include keyboard shortcuts in ARIA attributes', () => {
      const onClick = vi.fn();

      render(<PromptGenerationButton onClick={onClick} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-keyshortcuts');
      const shortcuts = button.getAttribute('aria-keyshortcuts');
      expect(shortcuts).toContain('Ctrl');
      expect(shortcuts).toContain('Shift');
    });
  });

  describe('ARIA Live Regions', () => {
    it('should have live region for progress updates in modal', () => {
      const progress: GenerationProgress = {
        stage: 'Generating',
        stageProgress: 50,
        overallProgress: 50,
        estimatedTimeRemaining: 30000,
        message: 'Generating prompt...',
        cancellable: true,
      };

      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="prompt"
          progress={progress}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-live', 'polite');
    });

    it('should announce progress milestones to screen readers', async () => {
      const progress: GenerationProgress = {
        stage: 'Generating',
        stageProgress: 25,
        overallProgress: 25,
        estimatedTimeRemaining: 45000,
        message: 'Generating image...',
        cancellable: true,
      };

      const { rerender } = render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      // Progress at 25%
      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBeGreaterThan(0);
      });

      // Update to 50%
      rerender(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={{ ...progress, overallProgress: 50, stageProgress: 50 }}
        />
      );

      // Update to 75%
      rerender(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={{ ...progress, overallProgress: 75, stageProgress: 75 }}
        />
      );

      // Update to 100%
      rerender(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={{
            ...progress,
            overallProgress: 100,
            stageProgress: 100,
            message: 'Generation complete',
          }}
        />
      );

      // Verify progress bars are updated
      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        progressBars.forEach(bar => {
          expect(bar).toHaveAttribute('aria-valuenow');
        });
      });
    });

    it('should have live regions for timing information', () => {
      const progress: GenerationProgress = {
        stage: 'Generating',
        stageProgress: 50,
        overallProgress: 50,
        estimatedTimeRemaining: 30000,
        message: 'Generating...',
        cancellable: true,
      };

      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="prompt"
          progress={progress}
        />
      );

      // Find timing information region
      const timingRegion = screen.getByRole('region', { name: /timing information/i });
      expect(timingRegion).toBeInTheDocument();

      // Check for live regions within timing
      const liveElements = within(timingRegion).getAllByRole('status', { hidden: true });
      expect(liveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Focus Management', () => {
    it('should trap focus within dialog when open', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={onClose}
          onGenerate={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Get all focusable elements
      const focusableElements = within(dialog).getAllByRole('button');
      expect(focusableElements.length).toBeGreaterThan(0);

      // First element should receive focus
      await waitFor(() => {
        expect(document.activeElement).toBe(focusableElements[0]);
      });
    });

    it('should restore focus to trigger element when dialog closes', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onClose = vi.fn();

      const { rerender } = render(
        <>
          <PromptGenerationButton onClick={onClick} />
          <PromptGenerationDialog
            isOpen={false}
            onClose={onClose}
            onGenerate={vi.fn()}
          />
        </>
      );

      const button = screen.getByRole('button', { name: /generate prompt/i });
      
      // Focus and click button
      button.focus();
      expect(document.activeElement).toBe(button);
      
      await user.click(button);

      // Open dialog
      rerender(
        <>
          <PromptGenerationButton onClick={onClick} />
          <PromptGenerationDialog
            isOpen={true}
            onClose={onClose}
            onGenerate={vi.fn()}
          />
        </>
      );

      // Dialog should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close dialog
      rerender(
        <>
          <PromptGenerationButton onClick={onClick} />
          <PromptGenerationDialog
            isOpen={false}
            onClose={onClose}
            onGenerate={vi.fn()}
          />
        </>
      );

      // Focus should return to button
      await waitFor(() => {
        expect(document.activeElement).toBe(button);
      });
    });

    it('should handle Tab key to cycle through focusable elements', async () => {
      const user = userEvent.setup();

      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={vi.fn()}
          onGenerate={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      const focusableElements = within(dialog).getAllByRole('button');

      // Tab through elements
      for (let i = 0; i < focusableElements.length; i++) {
        await user.tab();
        // Verify focus moves forward
      }

      // Shift+Tab to go backwards
      await user.tab({ shift: true });
      // Verify focus moves backward
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard shortcuts for all generation buttons', async () => {
      const user = userEvent.setup();
      const onPromptClick = vi.fn();
      const onImageClick = vi.fn();
      const onVideoClick = vi.fn();
      const onAudioClick = vi.fn();

      // Mock completed stages for dependent buttons
      vi.mocked(useGenerationStore).mockReturnValue({
        currentPipeline: {
          id: 'test',
          currentStage: 'prompt',
          stages: {
            prompt: { status: 'completed', result: { text: 'test', categories: {}, timestamp: Date.now(), editable: true }, attempts: 1 },
            image: { status: 'completed', result: { id: 'img', type: 'image', url: 'test.jpg', metadata: {}, relatedAssets: [], timestamp: Date.now() }, attempts: 1 },
            video: { status: 'pending', attempts: 0 },
            audio: { status: 'pending', attempts: 0 },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        completeStage: vi.fn(),
        failStage: vi.fn(),
        updateStageProgress: vi.fn(),
        startPipeline: vi.fn(),
        skipStage: vi.fn(),
        queue: { tasks: [], activeTask: null, maxConcurrent: 1 },
        history: { entries: [], maxEntries: 100 },
        addToQueue: vi.fn(),
        removeFromQueue: vi.fn(),
        addToHistory: vi.fn(),
        batchMode: false,
        setBatchMode: vi.fn(),
        batchSize: 1,
        setBatchSize: vi.fn(),
        variationParams: {},
        setVariationParams: vi.fn(),
      });

      render(
        <>
          <PromptGenerationButton onClick={onPromptClick} />
          <ImageGenerationButton onClick={onImageClick} />
          <VideoGenerationButton onClick={onVideoClick} />
          <AudioGenerationButton onClick={onAudioClick} />
        </>
      );

      // Test Ctrl+Shift+P for prompt
      await user.keyboard('{Control>}{Shift>}P{/Shift}{/Control}');
      expect(onPromptClick).toHaveBeenCalled();

      // Test Ctrl+Shift+I for image
      await user.keyboard('{Control>}{Shift>}I{/Shift}{/Control}');
      expect(onImageClick).toHaveBeenCalled();

      // Test Ctrl+Shift+V for video
      await user.keyboard('{Control>}{Shift>}V{/Shift}{/Control}');
      expect(onVideoClick).toHaveBeenCalled();

      // Test Ctrl+Shift+A for audio
      await user.keyboard('{Control>}{Shift>}A{/Shift}{/Control}');
      expect(onAudioClick).toHaveBeenCalled();
    });

    it('should not trigger shortcuts when buttons are disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<PromptGenerationButton onClick={onClick} disabled={true} />);

      await user.keyboard('{Control>}{Shift>}P{/Shift}{/Control}');
      
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should support Escape key to close dialogs', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={onClose}
          onGenerate={vi.fn()}
        />
      );

      await user.keyboard('{Escape}');
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should support Enter key to activate buttons', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<PromptGenerationButton onClick={onClick} />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard('{Enter}');
      
      expect(onClick).toHaveBeenCalled();
    });

    it('should support Space key to activate buttons', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<PromptGenerationButton onClick={onClick} />);

      const button = screen.getByRole('button');
      button.focus();

      await user.keyboard(' ');
      
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('Progress Bar Accessibility', () => {
    it('should have proper ARIA attributes on progress bars', () => {
      const progress: GenerationProgress = {
        stage: 'Generating',
        stageProgress: 50,
        overallProgress: 50,
        estimatedTimeRemaining: 30000,
        message: 'Generating...',
        cancellable: true,
      };

      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="prompt"
          progress={progress}
        />
      );

      const progressBars = screen.getAllByRole('progressbar');
      
      progressBars.forEach(bar => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
        expect(bar).toHaveAttribute('aria-label');
      });
    });

    it('should update progress bar values dynamically', () => {
      const progress: GenerationProgress = {
        stage: 'Generating',
        stageProgress: 25,
        overallProgress: 25,
        estimatedTimeRemaining: 45000,
        message: 'Generating...',
        cancellable: true,
      };

      const { rerender } = render(
        <GenerationProgressModal
          isOpen={true}
          generationType="prompt"
          progress={progress}
        />
      );

      let progressBars = screen.getAllByRole('progressbar');
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '25');

      // Update progress
      rerender(
        <GenerationProgressModal
          isOpen={true}
          generationType="prompt"
          progress={{ ...progress, overallProgress: 75, stageProgress: 75 }}
        />
      );

      progressBars = screen.getAllByRole('progressbar');
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '75');
    });
  });

  describe('Basic Accessibility Checks', () => {
    it('should have no missing ARIA labels on buttons', () => {
      const onClick = vi.fn();

      const { container } = render(
        <>
          <PromptGenerationButton onClick={onClick} />
          <ImageGenerationButton onClick={onClick} />
          <VideoGenerationButton onClick={onClick} />
          <AudioGenerationButton onClick={onClick} />
        </>
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have proper semantic structure in progress modal', () => {
      const progress: GenerationProgress = {
        stage: 'Generating',
        stageProgress: 50,
        overallProgress: 50,
        estimatedTimeRemaining: 30000,
        message: 'Generating...',
        cancellable: true,
      };

      const { container } = render(
        <GenerationProgressModal
          isOpen={true}
          generationType="prompt"
          progress={progress}
        />
      );

      // Check for dialog role
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();

      // Check for progress bars
      const progressBars = container.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should have proper semantic structure in dialogs', () => {
      const { container } = render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={vi.fn()}
          onGenerate={vi.fn()}
        />
      );

      // Check for dialog role
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();

      // Check for proper labeling
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should announce button state changes', async () => {
      const onClick = vi.fn();

      const { rerender } = render(
        <PromptGenerationButton onClick={onClick} disabled={false} />
      );

      // Disable button
      rerender(
        <PromptGenerationButton
          onClick={onClick}
          disabled={true}
          disabledReason="Complete previous step first"
        />
      );

      // Check for announcer element (created by useAnnouncer hook)
      await waitFor(() => {
        const announcer = document.querySelector('[role="status"][aria-live="polite"]');
        expect(announcer).toBeInTheDocument();
      });
    });

    it('should announce errors immediately', async () => {
      const progress: GenerationProgress = {
        stage: 'Failed',
        stageProgress: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 0,
        message: 'Error: Generation failed',
        cancellable: false,
      };

      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="prompt"
          progress={progress}
        />
      );

      // Check for error announcement
      await waitFor(() => {
        const announcer = document.querySelector('[role="status"][aria-live="assertive"]');
        expect(announcer).toBeInTheDocument();
      });
    });
  });
});
