/**
 * Tests for TwoStageVideoProgress Component
 * 
 * Requirements: 3.2
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TwoStageVideoProgress } from '../TwoStageVideoProgress';
import type { GenerationProgress } from '@/types/generation';

describe('TwoStageVideoProgress', () => {
  const createProgress = (overallProgress: number, stage: string): GenerationProgress => ({
    stage,
    stageProgress: overallProgress,
    overallProgress,
    estimatedTimeRemaining: 60,
    message: 'Processing...',
    cancellable: true,
  });

  describe('Latent Generation Stage', () => {
    it('should display latent generation as active when overall progress is 0-50%', () => {
      const progress = createProgress(25, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      // Check that latent stage is shown as in progress
      expect(screen.getByText('Stage 1: Latent Generation')).toBeInTheDocument();
      expect(screen.getByText('Generating video latent representation...')).toBeInTheDocument();
      
      // Check progress percentage
      expect(screen.getByText('50%')).toBeInTheDocument(); // 25% overall = 50% of stage 1
    });

    it('should show latent generation at 100% when overall progress reaches 50%', () => {
      const progress = createProgress(50, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      // Latent should be at 100%
      const latentProgress = screen.getAllByText('100%')[0];
      expect(latentProgress).toBeInTheDocument();
      
      // Should show completion message
      expect(screen.getByText('Latent representation generated successfully')).toBeInTheDocument();
    });

    it('should display latent progress bar with correct value', () => {
      const progress = createProgress(30, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      // Check aria-label for latent progress
      const latentProgressBar = screen.getByLabelText(/Latent generation progress: 60%/i);
      expect(latentProgressBar).toBeInTheDocument();
    });
  });

  describe('Spatial Upscaling Stage', () => {
    it('should display upscaling as pending when in latent stage', () => {
      const progress = createProgress(25, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      // Check that upscaling stage is shown as pending
      expect(screen.getByText('Stage 2: Spatial Upscaling')).toBeInTheDocument();
      expect(screen.getByText('Waiting for latent generation to complete')).toBeInTheDocument();
      
      // Upscaling should be at 0%
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display upscaling as active when overall progress is 50-100%', () => {
      const progress = createProgress(75, 'Video generation - Spatial upscaling');
      render(<TwoStageVideoProgress progress={progress} />);

      // Check that upscaling stage is shown as in progress
      expect(screen.getByText('Upscaling video to target dimensions...')).toBeInTheDocument();
      
      // Check progress percentage (75% overall = 50% of stage 2)
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show upscaling at 100% when overall progress reaches 100%', () => {
      const progress = createProgress(100, 'Video generation - Spatial upscaling');
      render(<TwoStageVideoProgress progress={progress} isComplete={true} />);

      // Both stages should be at 100%
      const progressTexts = screen.getAllByText('100%');
      expect(progressTexts.length).toBeGreaterThanOrEqual(2);
      
      // Should show completion message
      expect(screen.getByText('Video upscaled to final resolution')).toBeInTheDocument();
    });

    it('should display upscaling progress bar with correct value', () => {
      const progress = createProgress(80, 'Video generation - Spatial upscaling');
      render(<TwoStageVideoProgress progress={progress} />);

      // Check aria-label for upscaling progress
      const upscalingProgressBar = screen.getByLabelText(/Spatial upscaling progress: 60%/i);
      expect(upscalingProgressBar).toBeInTheDocument();
    });
  });

  describe('Overall Progress', () => {
    it('should display overall progress summary', () => {
      const progress = createProgress(45, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByText('Stage 1 of 2 in progress')).toBeInTheDocument();
    });

    it('should show stage 2 in progress when in upscaling stage', () => {
      const progress = createProgress(75, 'Video generation - Spatial upscaling');
      render(<TwoStageVideoProgress progress={progress} />);

      expect(screen.getByText('Stage 2 of 2 in progress')).toBeInTheDocument();
    });

    it('should show completion message when complete', () => {
      const progress = createProgress(100, 'Video generation complete');
      render(<TwoStageVideoProgress progress={progress} isComplete={true} />);

      expect(screen.getByText('Video generation complete')).toBeInTheDocument();
    });
  });

  describe('Stage Icons', () => {
    it('should render stage icons based on progress state', () => {
      const progress = createProgress(25, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      // Just verify the component renders without errors
      // Icons are mocked in test environment
      expect(screen.getByText('Stage 1: Latent Generation')).toBeInTheDocument();
      expect(screen.getByText('Stage 2: Spatial Upscaling')).toBeInTheDocument();
    });

    it('should show appropriate stage descriptions based on completion', () => {
      const progress = createProgress(75, 'Video generation - Spatial upscaling');
      render(<TwoStageVideoProgress progress={progress} />);

      // Latent stage should show completion message
      expect(screen.getByText('Latent representation generated successfully')).toBeInTheDocument();
      
      // Upscaling stage should show in-progress message
      expect(screen.getByText('Upscaling video to target dimensions...')).toBeInTheDocument();
    });

    it('should show pending message for stages not yet started', () => {
      const progress = createProgress(25, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      // Upscaling stage should show pending message
      expect(screen.getByText('Waiting for latent generation to complete')).toBeInTheDocument();
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate latent progress correctly at 25% overall', () => {
      const progress = createProgress(25, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      // 25% overall = 50% of latent stage (first 50% of overall)
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should calculate upscaling progress correctly at 75% overall', () => {
      const progress = createProgress(75, 'Video generation - Spatial upscaling');
      render(<TwoStageVideoProgress progress={progress} />);

      // 75% overall = 50% of upscaling stage (second 50% of overall)
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should handle edge case at exactly 50% overall', () => {
      const progress = createProgress(50, 'Video generation - Latent generation');
      render(<TwoStageVideoProgress progress={progress} />);

      // Latent should be 100%, upscaling should be 0%
      const progressTexts = screen.getAllByText(/\d+%/);
      expect(progressTexts.some(el => el.textContent === '100%')).toBe(true);
      expect(progressTexts.some(el => el.textContent === '0%')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels for progress bars', () => {
      const progress = createProgress(60, 'Video generation - Spatial upscaling');
      render(<TwoStageVideoProgress progress={progress} />);

      expect(screen.getByLabelText(/Latent generation progress/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Spatial upscaling progress/i)).toBeInTheDocument();
    });

    it('should display stage labels and progress percentages', () => {
      const progress = createProgress(60, 'Video generation - Spatial upscaling');
      render(<TwoStageVideoProgress progress={progress} />);

      // Should have stage labels
      expect(screen.getByText('Stage 1: Latent Generation')).toBeInTheDocument();
      expect(screen.getByText('Stage 2: Spatial Upscaling')).toBeInTheDocument();
      
      // Should have progress percentages
      expect(screen.getByText('100%')).toBeInTheDocument(); // Latent complete
      expect(screen.getByText('20%')).toBeInTheDocument(); // Upscaling at 20%
    });
  });
});
