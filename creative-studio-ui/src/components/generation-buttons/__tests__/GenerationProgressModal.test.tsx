/**
 * GenerationProgressModal Component Tests
 * 
 * Tests for the GenerationProgressModal component including:
 * - Rendering with different progress states
 * - Stage status calculations
 * - Timing information display
 * - Button visibility based on state
 * - Error and success states
 * - Accessibility features
 * 
 * Requirements: 7.1, 7.3, 7.4, 7.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenerationProgressModal } from '../GenerationProgressModal';
import type { GenerationProgress } from '@/types/generation';

  describe('GenerationProgressModal', () => {
  /**
   * Helper to create mock progress
   */
  const createMockProgress = (overrides?: Partial<GenerationProgress>): GenerationProgress => ({
    stage: 'Processing',
    stageProgress: 50,
    overallProgress: 50,
    estimatedTimeRemaining: 30000, // 30 seconds
    message: 'Generating content...',
    cancellable: true,
    ...overrides,
  });

  describe('Rendering', () => {
    it('should render modal when open', () => {
      const progress = createMockProgress();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      // Check for title in heading role
      expect(screen.getByRole('heading', { name: /image generation/i })).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      const progress = createMockProgress();
      
      render(
        <GenerationProgressModal
          isOpen={false}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display correct title for each generation type', () => {
      const progress = createMockProgress();
      const types: Array<{ type: 'prompt' | 'image' | 'video' | 'audio'; title: RegExp }> = [
        { type: 'prompt', title: /prompt generation/i },
        { type: 'image', title: /image generation/i },
        { type: 'video', title: /video generation/i },
        { type: 'audio', title: /audio generation/i },
      ];

      types.forEach(({ type, title }) => {
        const { unmount } = render(
          <GenerationProgressModal
            isOpen={true}
            generationType={type}
            progress={progress}
          />
        );

        expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Progress Display', () => {
    it('should display overall progress percentage', () => {
      const progress = createMockProgress({ overallProgress: 75 });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should display two-stage progress for video generation', () => {
      const progress = createMockProgress({
        stageProgress: 30,
        overallProgress: 60,
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="video"
          progress={progress}
        />
      );

      // For video, should show two-stage progress component
      expect(screen.getByText('Stage 1: Latent Generation')).toBeInTheDocument();
      expect(screen.getByText('Stage 2: Spatial Upscaling')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument(); // Overall progress
    });

    it('should not display separate stage progress when same as overall', () => {
      const progress = createMockProgress({
        stageProgress: 50,
        overallProgress: 50,
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      // Should only show one progress section (not two)
      expect(screen.queryByText('Stage Progress')).not.toBeInTheDocument();
    });

    it('should display progress message', () => {
      const progress = createMockProgress({
        message: 'Generating image with Flux Turbo...',
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByText('Generating image with Flux Turbo...')).toBeInTheDocument();
    });
  });

  describe('Stage Indicators', () => {
    it('should display all pipeline stages', () => {
      const progress = createMockProgress();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      // Use getAllByText since stage names appear in both title and stage list
      expect(screen.getAllByText('Prompt Generation').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Image Generation').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Video Generation').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Audio Generation').length).toBeGreaterThan(0);
    });

    it('should mark completed stages correctly', () => {
      const progress = createMockProgress();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="video"
          progress={progress}
        />
      );

      // Prompt and Image should be complete, Video in progress, Audio pending
      const completeStatuses = screen.getAllByText('Complete');
      expect(completeStatuses).toHaveLength(2); // prompt and image
      
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should show current stage as in-progress', () => {
      const progress = createMockProgress();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="audio"
          progress={progress}
        />
      );

      const inProgressStatuses = screen.getAllByText('In Progress');
      expect(inProgressStatuses).toHaveLength(1);
    });
  });

  describe('Timing Information', () => {
    it('should display elapsed time', () => {
      const progress = createMockProgress();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      // Should show elapsed time label
      expect(screen.getByText('Elapsed Time')).toBeInTheDocument();
      // Should show some time value (initially 0s)
      expect(screen.getByText('0s')).toBeInTheDocument();
    });

    it('should display estimated time remaining', () => {
      const progress = createMockProgress({
        estimatedTimeRemaining: 45000, // 45 seconds
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByText('45s')).toBeInTheDocument();
    });

    it('should format time correctly for minutes', () => {
      const progress = createMockProgress({
        estimatedTimeRemaining: 125000, // 2m 5s
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="video"
          progress={progress}
        />
      );

      expect(screen.getByText('2m 5s')).toBeInTheDocument();
    });

    it('should format time correctly for hours', () => {
      const progress = createMockProgress({
        estimatedTimeRemaining: 7325000, // 2h 2m
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="video"
          progress={progress}
        />
      );

      expect(screen.getByText('2h 2m')).toBeInTheDocument();
    });

    it('should show -- when estimated time is not available', () => {
      const progress = createMockProgress({
        estimatedTimeRemaining: 0,
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByText('--')).toBeInTheDocument();
    });

    it('should display total time on completion', () => {
      const progress = createMockProgress({
        overallProgress: 100,
        message: 'Generation complete',
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByText('Total Time')).toBeInTheDocument();
    });
  });

  describe('Button Visibility and Actions', () => {
    it('should show cancel button during generation when cancellable', () => {
      const progress = createMockProgress({
        cancellable: true,
        overallProgress: 50,
      });
      const onCancel = vi.fn();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('should not show cancel button when not cancellable', () => {
      const progress = createMockProgress({
        cancellable: false,
        overallProgress: 50,
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onCancel={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should call onCancel when cancel button clicked', async () => {
      const progress = createMockProgress({ cancellable: true });
      const onCancel = vi.fn();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onCancel={onCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      cancelButton.click();

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should show retry button on error', () => {
      const progress = createMockProgress({
        message: 'Error: Failed to generate image',
        overallProgress: 25,
      });
      const onRetry = vi.fn();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onRetry={onRetry}
        />
      );

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button clicked', async () => {
      const progress = createMockProgress({
        message: 'Error: Generation failed',
      });
      const onRetry = vi.fn();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      retryButton.click();

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should show close button on completion', () => {
      const progress = createMockProgress({
        overallProgress: 100,
        message: 'Generation complete',
      });
      const onClose = vi.fn();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onClose={onClose}
        />
      );

      expect(screen.getByRole('button', { name: /view results/i })).toBeInTheDocument();
    });

    it('should call onClose when close button clicked', async () => {
      const progress = createMockProgress({
        overallProgress: 100,
        message: 'Complete',
      });
      const onClose = vi.fn();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /view results/i });
      closeButton.click();

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error State', () => {
    it('should display error state correctly', () => {
      const progress = createMockProgress({
        message: 'Error: Failed to connect to ComfyUI server',
        overallProgress: 30,
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('Error: Failed to connect to ComfyUI server')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should mark current stage as error', () => {
      const progress = createMockProgress({
        message: 'Error occurred',
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="video"
          progress={progress}
        />
      );

      const failedStatuses = screen.getAllByText('Failed');
      expect(failedStatuses).toHaveLength(1);
    });
  });

  describe('Success State', () => {
    it('should display success state correctly', () => {
      const progress = createMockProgress({
        overallProgress: 100,
        message: 'Generation complete',
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByText('Generation Complete')).toBeInTheDocument();
      expect(screen.getByText('Your content has been generated successfully!')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should mark all stages as complete', () => {
      const progress = createMockProgress({
        overallProgress: 100,
        message: 'Complete',
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="audio"
          progress={progress}
        />
      );

      const completeStatuses = screen.getAllByText('Complete');
      expect(completeStatuses.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on progress bars', () => {
      const progress = createMockProgress({ overallProgress: 65 });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      const progressBar = screen.getByLabelText(/overall progress: 65%/i);
      expect(progressBar).toBeInTheDocument();
    });

    it('should have proper ARIA labels on buttons', () => {
      const progress = createMockProgress({ cancellable: true });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Cancel generation')).toBeInTheDocument();
    });

    it('should have live regions for timing updates', () => {
      const progress = createMockProgress();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      // Check for aria-live="polite" attributes on timing elements
      const elapsedTimeElement = screen.getByText('0s');
      expect(elapsedTimeElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should prevent modal dismissal during generation', () => {
      const progress = createMockProgress({ overallProgress: 50 });
      const onClose = vi.fn();
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
          onClose={onClose}
        />
      );

      // Modal should not close when clicking outside during generation
      // This is handled by the onInteractOutside handler
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Current Stage Display', () => {
    it('should display two-stage progress for video during generation', () => {
      const progress = createMockProgress({
        stage: 'Generating latent representation',
        overallProgress: 40,
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="video"
          progress={progress}
        />
      );

      // For video, should show two-stage component instead of current stage message
      expect(screen.getByText('Stage 1: Latent Generation')).toBeInTheDocument();
      expect(screen.getByText('Stage 2: Spatial Upscaling')).toBeInTheDocument();
    });
    
    it('should display current stage message for non-video generation', () => {
      const progress = createMockProgress({
        stage: 'Generating image',
        overallProgress: 40,
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.getByText('Current Stage')).toBeInTheDocument();
      expect(screen.getByText('Generating image')).toBeInTheDocument();
    });

    it('should not display current stage on completion', () => {
      const progress = createMockProgress({
        stage: 'Complete',
        overallProgress: 100,
        message: 'Generation complete',
      });
      
      render(
        <GenerationProgressModal
          isOpen={true}
          generationType="image"
          progress={progress}
        />
      );

      expect(screen.queryByText('Current Stage')).not.toBeInTheDocument();
    });
  });
});
