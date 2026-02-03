/**
 * Batch Progress Display Tests
 * 
 * Tests for the batch progress display component.
 * Requirements: 11.3
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchProgressDisplay } from '../BatchProgressDisplay';
import type { BatchGenerationState } from '../../../types/generation';

describe('BatchProgressDisplay', () => {
  const createMockBatch = (overrides?: Partial<BatchGenerationState>): BatchGenerationState => ({
    id: 'batch-1',
    config: {
      enabled: true,
      batchSize: 4,
      variationParams: {
        varySeeds: true,
        varyPrompts: false,
        varyParameters: false,
      },
    },
    tasks: [
      {
        id: 'task-1',
        batchId: 'batch-1',
        type: 'image',
        params: {},
        priority: 1,
        status: 'completed',
        progress: {
          stage: '',
          stageProgress: 100,
          overallProgress: 100,
          estimatedTimeRemaining: 0,
          message: 'Completed',
          cancellable: false,
        },
        createdAt: Date.now(),
        completedAt: Date.now(),
        batchIndex: 0,
      },
      {
        id: 'task-2',
        batchId: 'batch-1',
        type: 'image',
        params: {},
        priority: 1,
        status: 'running',
        progress: {
          stage: 'generation',
          stageProgress: 50,
          overallProgress: 50,
          estimatedTimeRemaining: 30,
          message: 'Generating...',
          cancellable: true,
        },
        createdAt: Date.now(),
        batchIndex: 1,
      },
      {
        id: 'task-3',
        batchId: 'batch-1',
        type: 'image',
        params: {},
        priority: 1,
        status: 'queued',
        progress: {
          stage: '',
          stageProgress: 0,
          overallProgress: 0,
          estimatedTimeRemaining: 0,
          message: 'Queued',
          cancellable: true,
        },
        createdAt: Date.now(),
        batchIndex: 2,
      },
      {
        id: 'task-4',
        batchId: 'batch-1',
        type: 'image',
        params: {},
        priority: 1,
        status: 'failed',
        progress: {
          stage: '',
          stageProgress: 0,
          overallProgress: 0,
          estimatedTimeRemaining: 0,
          message: 'Failed',
          cancellable: false,
        },
        createdAt: Date.now(),
        completedAt: Date.now(),
        error: 'Test error',
        batchIndex: 3,
      },
    ],
    status: 'running',
    completedCount: 1,
    failedCount: 1,
    results: [],
    favorites: new Set(),
    discarded: new Set(),
    createdAt: Date.now(),
    ...overrides,
  });

  it('should render batch progress display', () => {
    const batch = createMockBatch();
    render(<BatchProgressDisplay batch={batch} />);
    
    expect(screen.getByText('Batch Generation Progress')).toBeInTheDocument();
    expect(screen.getByText(/1 of 4 completed/i)).toBeInTheDocument();
  });

  it('should display overall progress bar', () => {
    const batch = createMockBatch();
    render(<BatchProgressDisplay batch={batch} />);
    
    const progressBars = screen.getAllByRole('progressbar');
    // First progress bar is the overall progress
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '25'); // 1 of 4 = 25%
  });

  it('should display individual task statuses', () => {
    const batch = createMockBatch();
    render(<BatchProgressDisplay batch={batch} />);
    
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
    expect(screen.getByText('Task 4')).toBeInTheDocument();
  });

  it('should show progress bar for running tasks', () => {
    const batch = createMockBatch();
    render(<BatchProgressDisplay batch={batch} />);
    
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('should show error message for failed tasks', () => {
    const batch = createMockBatch();
    render(<BatchProgressDisplay batch={batch} />);
    
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should display status summary', () => {
    const batch = createMockBatch();
    render(<BatchProgressDisplay batch={batch} />);
    
    expect(screen.getByText(/completed: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/running: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/queued: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/failed: 1/i)).toBeInTheDocument();
  });

  it('should show cancel button when batch is running', () => {
    const onCancel = vi.fn();
    const batch = createMockBatch({ status: 'running' });
    render(<BatchProgressDisplay batch={batch} onCancel={onCancel} />);
    
    const cancelButton = screen.getByText('Cancel Batch');
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it('should not show cancel button when batch is completed', () => {
    const batch = createMockBatch({ status: 'completed' });
    render(<BatchProgressDisplay batch={batch} onCancel={vi.fn()} />);
    
    expect(screen.queryByText('Cancel Batch')).not.toBeInTheDocument();
  });

  it('should display failed count in header when present', () => {
    const batch = createMockBatch({ failedCount: 2 });
    render(<BatchProgressDisplay batch={batch} />);
    
    expect(screen.getByText(/2 failed/i)).toBeInTheDocument();
  });

  it('should handle empty task list', () => {
    const batch = createMockBatch({ tasks: [], completedCount: 0, failedCount: 0 });
    render(<BatchProgressDisplay batch={batch} />);
    
    expect(screen.getByText(/0 of 0 completed/i)).toBeInTheDocument();
  });
});
