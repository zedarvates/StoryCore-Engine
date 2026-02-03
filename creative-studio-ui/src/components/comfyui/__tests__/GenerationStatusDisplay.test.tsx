/**
 * GenerationStatusDisplay Component Tests
 * 
 * Tests for the generation status display component including progress tracking,
 * timing information, and status updates.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenerationStatusDisplay } from '../GenerationStatusDisplay';
import type { GenerationProgress } from '../GenerationStatusDisplay';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockProgress = (overrides?: Partial<GenerationProgress>): GenerationProgress => ({
  currentStep: 'Generating Master Coherence Sheet',
  progress: 45,
  currentItem: 4,
  totalItems: 9,
  startTime: Date.now() - 60000, // Started 1 minute ago
  estimatedCompletion: Date.now() + 60000, // 1 minute remaining
  stage: 'grid',
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('GenerationStatusDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Requirements 8.1: Current Step Description', () => {
    it('should display current step description', () => {
      const progress = createMockProgress();
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText('Generating Master Coherence Sheet')).toBeInTheDocument();
    });

    it('should display "Idle" when no current step', () => {
      const progress = createMockProgress({ currentStep: '', stage: 'idle' });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText('Idle')).toBeInTheDocument();
    });
  });

  describe('Requirements 8.2: Progress Bar and Item Counter', () => {
    it('should display progress percentage', () => {
      const progress = createMockProgress({ progress: 45 });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should display item counter when totalItems > 0', () => {
      const progress = createMockProgress({ currentItem: 4, totalItems: 9 });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText('4 / 9')).toBeInTheDocument();
    });

    it('should not display item counter when totalItems is 0', () => {
      const progress = createMockProgress({ currentItem: 0, totalItems: 0 });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.queryByText('0 / 0')).not.toBeInTheDocument();
    });

    it('should round progress percentage', () => {
      const progress = createMockProgress({ progress: 45.7 });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText('46%')).toBeInTheDocument();
    });
  });

  describe('Requirements 8.3: Timing Information', () => {
    it('should display elapsed time for active generation', () => {
      const progress = createMockProgress({
        startTime: Date.now() - 60000,
        stage: 'grid',
      });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText(/Elapsed/i)).toBeInTheDocument();
      // Use getAllByText since both elapsed and remaining might show same time
      const timeElements = screen.getAllByText(/1m 0s/);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('should display estimated remaining time', () => {
      const progress = createMockProgress({
        estimatedCompletion: Date.now() + 120000, // 2 minutes
        stage: 'grid',
      });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText(/Remaining/i)).toBeInTheDocument();
    });

    it('should not display timing for idle stage', () => {
      const progress = createMockProgress({ stage: 'idle' });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.queryByText(/Elapsed/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Remaining/i)).not.toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode', () => {
      const progress = createMockProgress();
      const { container } = render(
        <GenerationStatusDisplay progress={progress} compact={true} />
      );

      // Compact mode should not have the full card structure
      expect(container.querySelector('.space-y-4')).not.toBeInTheDocument();
    });

    it('should display progress in compact mode', () => {
      const progress = createMockProgress({ progress: 75 });
      render(<GenerationStatusDisplay progress={progress} compact={true} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('Status States', () => {
    it('should display completion message when complete', () => {
      const progress = createMockProgress({
        stage: 'complete',
        startTime: Date.now() - 180000, // 3 minutes ago
      });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText(/Generation completed/i)).toBeInTheDocument();
    });

    it('should display error message when error occurs', () => {
      const progress = createMockProgress({
        stage: 'error',
        error: 'Connection failed',
      });
      render(<GenerationStatusDisplay progress={progress} />);

      expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });

  describe('Custom Class Name', () => {
    it('should apply custom className', () => {
      const progress = createMockProgress();
      const { container } = render(
        <GenerationStatusDisplay progress={progress} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
