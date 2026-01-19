/**
 * Tests for ProgressIndicator Component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressIndicator } from '../ProgressIndicator';
import type { GenerationTask } from '@/types';
import type { ProgressUpdate } from '@/services/progressTrackingService';

describe('ProgressIndicator', () => {
  const baseTask: GenerationTask = {
    id: 'task-1',
    shotId: 'shot-1',
    type: 'grid',
    status: 'pending',
    priority: 1,
    createdAt: new Date('2026-01-15T10:00:00Z'),
  };

  describe('rendering', () => {
    it('should render task information', () => {
      render(<ProgressIndicator task={baseTask} />);

      expect(screen.getByText('GRID')).toBeInTheDocument();
      expect(screen.getByText(/Task ID:/)).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('should render with progress update', () => {
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 50,
        message: 'Processing...',
      };

      render(<ProgressIndicator task={{ ...baseTask, status: 'processing' }} progress={progress} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render in compact mode', () => {
      const { container } = render(<ProgressIndicator task={baseTask} compact />);

      // Compact mode should have simpler structure
      expect(container.querySelector('.flex.items-center.gap-2')).toBeInTheDocument();
    });

    it('should render with details', () => {
      render(<ProgressIndicator task={baseTask} showDetails />);

      expect(screen.getByText('Priority:')).toBeInTheDocument();
      expect(screen.getByText('Created:')).toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('should display pending status', () => {
      render(<ProgressIndicator task={baseTask} />);

      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('⏳')).toBeInTheDocument();
    });

    it('should display processing status', () => {
      const task = { ...baseTask, status: 'processing' as const };
      render(<ProgressIndicator task={task} />);

      expect(screen.getByText('processing')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should display completed status', () => {
      const task = { ...baseTask, status: 'completed' as const };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'completed',
        progress: 100,
        message: 'Completed successfully',
      };

      render(<ProgressIndicator task={task} progress={progress} />);

      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('Completed successfully')).toBeInTheDocument();
    });

    it('should display failed status', () => {
      const task = { ...baseTask, status: 'failed' as const, error: 'Task failed' };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'failed',
        progress: 50,
        error: 'Task failed',
      };

      render(<ProgressIndicator task={task} progress={progress} />);

      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText('Task failed')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('should display progress bar for processing task', () => {
      const task = { ...baseTask, status: 'processing' as const };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 75,
      };

      const { container } = render(<ProgressIndicator task={task} progress={progress} />);

      const progressBar = container.querySelector('[style*="width: 75%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display full progress bar for completed task', () => {
      const task = { ...baseTask, status: 'completed' as const };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'completed',
        progress: 100,
      };

      const { container } = render(<ProgressIndicator task={task} progress={progress} />);

      const progressBar = container.querySelector('.w-full');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not display progress bar for pending task', () => {
      const { container } = render(<ProgressIndicator task={baseTask} />);

      const progressBar = container.querySelector('.bg-blue-500');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  describe('details display', () => {
    it('should show priority when details enabled', () => {
      render(<ProgressIndicator task={baseTask} showDetails />);

      expect(screen.getByText('Priority:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should show created time when details enabled', () => {
      render(<ProgressIndicator task={baseTask} showDetails />);

      expect(screen.getByText('Created:')).toBeInTheDocument();
    });

    it('should show started time when available', () => {
      const task = {
        ...baseTask,
        status: 'processing' as const,
        startedAt: new Date('2026-01-15T10:05:00Z'),
      };

      render(<ProgressIndicator task={task} showDetails />);

      expect(screen.getByText('Started:')).toBeInTheDocument();
    });

    it('should show completed time when available', () => {
      const task = {
        ...baseTask,
        status: 'completed' as const,
        completedAt: new Date('2026-01-15T10:10:00Z'),
      };

      render(<ProgressIndicator task={task} showDetails />);

      expect(screen.getByText('Completed:')).toBeInTheDocument();
    });

    it('should not show details when disabled', () => {
      render(<ProgressIndicator task={baseTask} showDetails={false} />);

      expect(screen.queryByText('Priority:')).not.toBeInTheDocument();
    });
  });

  describe('compact mode', () => {
    it('should render simplified view in compact mode', () => {
      const task = { ...baseTask, status: 'processing' as const };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 60,
      };

      render(<ProgressIndicator task={task} progress={progress} compact />);

      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should not show task type in compact mode', () => {
      render(<ProgressIndicator task={baseTask} compact />);

      expect(screen.queryByText('GRID')).not.toBeInTheDocument();
    });

    it('should not show status badge in compact mode', () => {
      render(<ProgressIndicator task={baseTask} compact />);

      expect(screen.queryByText('pending')).not.toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<ProgressIndicator task={baseTask} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('task types', () => {
    it('should display grid task type', () => {
      render(<ProgressIndicator task={{ ...baseTask, type: 'grid' }} />);
      expect(screen.getByText('GRID')).toBeInTheDocument();
    });

    it('should display promotion task type', () => {
      render(<ProgressIndicator task={{ ...baseTask, type: 'promotion' }} />);
      expect(screen.getByText('PROMOTION')).toBeInTheDocument();
    });

    it('should display refine task type', () => {
      render(<ProgressIndicator task={{ ...baseTask, type: 'refine' }} />);
      expect(screen.getByText('REFINE')).toBeInTheDocument();
    });

    it('should display qa task type', () => {
      render(<ProgressIndicator task={{ ...baseTask, type: 'qa' }} />);
      expect(screen.getByText('QA')).toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('should display error from progress update', () => {
      const task = { ...baseTask, status: 'failed' as const };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'failed',
        progress: 50,
        error: 'Network error',
      };

      render(<ProgressIndicator task={task} progress={progress} />);

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should display error from task when no progress error', () => {
      const task = { ...baseTask, status: 'failed' as const, error: 'Task error' };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'failed',
        progress: 50,
      };

      render(<ProgressIndicator task={task} progress={progress} />);

      expect(screen.getByText('Task error')).toBeInTheDocument();
    });

    it('should display default error message when no error provided', () => {
      const task = { ...baseTask, status: 'failed' as const };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'failed',
        progress: 50,
      };

      render(<ProgressIndicator task={task} progress={progress} />);

      expect(screen.getByText('Task failed')).toBeInTheDocument();
    });
  });

  describe('progress messages', () => {
    it('should display custom progress message', () => {
      const task = { ...baseTask, status: 'processing' as const };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 50,
        message: 'Generating grid...',
      };

      render(<ProgressIndicator task={task} progress={progress} />);

      expect(screen.getByText('Generating grid...')).toBeInTheDocument();
    });

    it('should display default message when no custom message', () => {
      const task = { ...baseTask, status: 'processing' as const };
      const progress: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 50,
      };

      render(<ProgressIndicator task={task} progress={progress} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });
});
