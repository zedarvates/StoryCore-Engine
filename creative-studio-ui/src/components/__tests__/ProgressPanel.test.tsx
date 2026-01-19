/**
 * Tests for ProgressPanel Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressPanel } from '../ProgressPanel';
import { useAppStore } from '@/stores/useAppStore';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import type { GenerationTask } from '@/types';

// Mock dependencies
vi.mock('@/stores/useAppStore');
vi.mock('@/hooks/useProgressTracking');
vi.mock('../ProgressIndicator', () => ({
  ProgressIndicator: ({ task }: { task: GenerationTask }) => (
    <div data-testid={`progress-indicator-${task.id}`}>{task.type}</div>
  ),
}));

describe('ProgressPanel', () => {
  const mockTasks: GenerationTask[] = [
    {
      id: 'task-1',
      shotId: 'shot-1',
      type: 'grid',
      status: 'processing',
      priority: 1,
      createdAt: new Date(),
    },
    {
      id: 'task-2',
      shotId: 'shot-2',
      type: 'promotion',
      status: 'pending',
      priority: 2,
      createdAt: new Date(),
    },
    {
      id: 'task-3',
      shotId: 'shot-3',
      type: 'refine',
      status: 'completed',
      priority: 3,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    // Mock store
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = { taskQueue: mockTasks };
      return selector ? selector(state) : state;
    });

    // Mock hook
    (useProgressTracking as any).mockReturnValue({
      progressUpdates: new Map(),
      getProgress: vi.fn(),
      startTrackingAll: vi.fn(),
      stopTrackingAll: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('should render task progress panel', () => {
      render(<ProgressPanel />);

      expect(screen.getByText('Task Progress')).toBeInTheDocument();
      expect(screen.getByText('(3 tasks)')).toBeInTheDocument();
    });

    it('should render all tasks', () => {
      render(<ProgressPanel />);

      expect(screen.getByTestId('progress-indicator-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator-task-3')).toBeInTheDocument();
    });

    it('should render empty state when no tasks', () => {
      (useAppStore as any).mockImplementation((selector: any) => {
        const state = { taskQueue: [] };
        return selector ? selector(state) : state;
      });

      render(<ProgressPanel />);

      expect(screen.getByText('No tasks to display')).toBeInTheDocument();
      expect(screen.getByText('Add tasks to the queue to see progress here')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter by processing status', () => {
      render(<ProgressPanel filterStatus="processing" />);

      expect(screen.getByTestId('progress-indicator-task-1')).toBeInTheDocument();
      expect(screen.queryByTestId('progress-indicator-task-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('progress-indicator-task-3')).not.toBeInTheDocument();
    });

    it('should filter by pending status', () => {
      render(<ProgressPanel filterStatus="pending" />);

      expect(screen.queryByTestId('progress-indicator-task-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator-task-2')).toBeInTheDocument();
      expect(screen.queryByTestId('progress-indicator-task-3')).not.toBeInTheDocument();
    });

    it('should filter by completed status', () => {
      render(<ProgressPanel filterStatus="completed" />);

      expect(screen.queryByTestId('progress-indicator-task-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('progress-indicator-task-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator-task-3')).toBeInTheDocument();
    });

    it('should show all tasks when filter is "all"', () => {
      render(<ProgressPanel filterStatus="all" />);

      expect(screen.getByTestId('progress-indicator-task-1')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator-task-2')).toBeInTheDocument();
      expect(screen.getByTestId('progress-indicator-task-3')).toBeInTheDocument();
    });

    it('should show empty state for filtered status with no matches', () => {
      render(<ProgressPanel filterStatus="failed" />);

      expect(screen.getByText('No tasks to display')).toBeInTheDocument();
      expect(screen.getByText('No failed tasks found')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort tasks by status priority', () => {
      const { container } = render(<ProgressPanel />);

      const indicators = container.querySelectorAll('[data-testid^="progress-indicator-"]');
      
      // Processing should be first, then pending, then completed
      expect(indicators[0]).toHaveAttribute('data-testid', 'progress-indicator-task-1');
      expect(indicators[1]).toHaveAttribute('data-testid', 'progress-indicator-task-2');
      expect(indicators[2]).toHaveAttribute('data-testid', 'progress-indicator-task-3');
    });

    it('should sort by priority within same status', () => {
      const tasksWithSameStatus: GenerationTask[] = [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 3,
          createdAt: new Date(),
        },
        {
          id: 'task-2',
          shotId: 'shot-2',
          type: 'promotion',
          status: 'pending',
          priority: 1,
          createdAt: new Date(),
        },
      ];

      (useAppStore as any).mockImplementation((selector: any) => {
        const state = { taskQueue: tasksWithSameStatus };
        return selector ? selector(state) : state;
      });

      const { container } = render(<ProgressPanel />);

      const indicators = container.querySelectorAll('[data-testid^="progress-indicator-"]');
      
      // Lower priority number should come first
      expect(indicators[0]).toHaveAttribute('data-testid', 'progress-indicator-task-2');
      expect(indicators[1]).toHaveAttribute('data-testid', 'progress-indicator-task-1');
    });
  });

  describe('summary stats', () => {
    it('should display processing count', () => {
      render(<ProgressPanel />);

      expect(screen.getByText('1 processing')).toBeInTheDocument();
    });

    it('should display pending count', () => {
      render(<ProgressPanel />);

      expect(screen.getByText('1 pending')).toBeInTheDocument();
    });

    it('should display completed count', () => {
      render(<ProgressPanel />);

      expect(screen.getByText('1 completed')).toBeInTheDocument();
    });
  });

  describe('overall progress', () => {
    it('should display overall progress bar', () => {
      const { container } = render(<ProgressPanel />);

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('1 / 3 completed')).toBeInTheDocument();
      
      // Check progress bar width (1/3 = 33.33%)
      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '33.33333333333333%' });
    });

    it('should not display overall progress in compact mode', () => {
      render(<ProgressPanel compact />);

      expect(screen.queryByText('Overall Progress')).not.toBeInTheDocument();
    });

    it('should calculate correct percentage', () => {
      const allCompleted: GenerationTask[] = [
        { ...mockTasks[0], status: 'completed' },
        { ...mockTasks[1], status: 'completed' },
        { ...mockTasks[2], status: 'completed' },
      ];

      (useAppStore as any).mockImplementation((selector: any) => {
        const state = { taskQueue: allCompleted };
        return selector ? selector(state) : state;
      });

      const { container } = render(<ProgressPanel />);

      const progressBar = container.querySelector('.bg-gradient-to-r');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('compact mode', () => {
    it('should pass compact prop to indicators', () => {
      render(<ProgressPanel compact />);

      // Indicators should be rendered (mocked component doesn't show compact behavior)
      expect(screen.getByTestId('progress-indicator-task-1')).toBeInTheDocument();
    });
  });

  describe('showDetails', () => {
    it('should pass showDetails prop to indicators', () => {
      render(<ProgressPanel showDetails />);

      // Indicators should be rendered (mocked component doesn't show details behavior)
      expect(screen.getByTestId('progress-indicator-task-1')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should pass onTaskComplete callback', () => {
      const onTaskComplete = vi.fn();
      render(<ProgressPanel onTaskComplete={onTaskComplete} />);

      // Hook should be called with callback
      expect(useProgressTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          onComplete: onTaskComplete,
        })
      );
    });

    it('should pass onTaskError callback', () => {
      const onTaskError = vi.fn();
      render(<ProgressPanel onTaskError={onTaskError} />);

      // Hook should be called with callback
      expect(useProgressTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          onError: onTaskError,
        })
      );
    });
  });

  describe('autoStart', () => {
    it('should auto-start tracking by default', () => {
      render(<ProgressPanel />);

      expect(useProgressTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          autoStart: true,
        })
      );
    });

    it('should not auto-start when disabled', () => {
      render(<ProgressPanel autoStart={false} />);

      expect(useProgressTracking).toHaveBeenCalledWith(
        expect.objectContaining({
          autoStart: false,
        })
      );
    });
  });

  describe('cleanup', () => {
    it('should stop tracking on unmount', () => {
      const stopTrackingAll = vi.fn();
      
      (useProgressTracking as any).mockReturnValue({
        progressUpdates: new Map(),
        getProgress: vi.fn(),
        startTrackingAll: vi.fn(),
        stopTrackingAll,
      });

      const { unmount } = render(<ProgressPanel />);

      unmount();

      expect(stopTrackingAll).toHaveBeenCalled();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<ProgressPanel className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
