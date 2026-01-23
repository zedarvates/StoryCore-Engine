/**
 * Unit tests for ComfyUIProgressMonitor component
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ComfyUIProgressMonitor } from '../ComfyUIProgressMonitor';

// Mock services
vi.mock('@/services/backendApiService', () => ({
  backendApi: {
    getComfyUIStatus: vi.fn(),
    cancelComfyUIWorkflow: vi.fn(),
  },
}));

describe('ComfyUIProgressMonitor', () => {
  const mockExecutions = [
    {
      id: 'exec-1',
      client: {} as any, // Mock ComfyUIClient
      status: 'running' as const,
      progress: 45,
      currentNode: 'KSampler',
      totalNodes: 15,
      completedNodes: 7,
      startTime: new Date(Date.now() - 30000), // 30 seconds ago
      outputs: [],
    },
    {
      id: 'exec-2',
      client: {} as any,
      status: 'completed' as const,
      progress: 100,
      startTime: new Date(Date.now() - 60000), // 1 minute ago
      endTime: new Date(Date.now() - 10000), // 10 seconds ago
      outputs: [
        {
          type: 'image' as const,
          url: '/view?filename=output1.png',
          filename: 'output1.png',
        },
      ],
    },
  ];

  const mockOnExecutionUpdate = jest.fn();
  const mockOnExecutionComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock backend API
    const mockBackendApi = require('@/services/backendApiService').backendApi;
    mockBackendApi.getComfyUIStatus.mockResolvedValue({
      success: true,
      data: {
        promptId: 'exec-1',
        status: 'running',
        progress: 60,
        currentNode: 'VAEDecode',
        totalNodes: 15,
        completedNodes: 9,
        outputs: [],
      },
    });
    mockBackendApi.cancelComfyUIWorkflow.mockResolvedValue({ success: true });
  });

  it('renders empty state when no executions', () => {
    render(
      <ComfyUIProgressMonitor
        executions={[]}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    expect(screen.getByText('No active workflow executions')).toBeInTheDocument();
  });

  it('displays workflow progress header', () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
    expect(screen.getByText('1 running')).toBeInTheDocument();
  });

  it('shows execution details', () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    expect(screen.getByText('exec-1')).toBeInTheDocument();
    expect(screen.getByText('exec-2')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('displays progress bars', () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    // Should show progress percentages
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows current node information', () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    expect(screen.getByText('KSampler')).toBeInTheDocument();
    expect(screen.getByText('7 / 15')).toBeInTheDocument();
  });

  it('displays timing information', () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    // Should show duration for running execution
    expect(screen.getByText(/Duration:/)).toBeInTheDocument();
  });

  it('shows output files for completed executions', () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    expect(screen.getByText('Generated Files:')).toBeInTheDocument();
    expect(screen.getByText('output1.png')).toBeInTheDocument();
    expect(screen.getByText('1 output')).toBeInTheDocument();
  });

  it('shows cancel button for running executions', () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    const cancelButtons = screen.getAllByTitle('Cancel execution');
    expect(cancelButtons).toHaveLength(1); // Only running execution has cancel button
  });

  it('handles execution status updates', async () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    // Wait for polling to update status
    await waitFor(() => {
      expect(mockOnExecutionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'exec-1',
          status: 'running',
          progress: 60,
          currentNode: 'VAEDecode',
        })
      );
    });
  });

  it('calls completion callback when execution finishes', async () => {
    const failedExecution = [
      {
        ...mockExecutions[0],
        status: 'completed' as const,
        progress: 100,
        endTime: new Date(),
      },
    ];

    render(
      <ComfyUIProgressMonitor
        executions={failedExecution}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    await waitFor(() => {
      expect(mockOnExecutionComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'exec-1',
          status: 'completed',
          progress: 100,
        })
      );
    });
  });

  it('displays error information', () => {
    const errorExecution = [
      {
        ...mockExecutions[0],
        status: 'failed' as const,
        error: 'Workflow execution failed: Out of memory',
      },
    ];

    render(
      <ComfyUIProgressMonitor
        executions={errorExecution}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Workflow execution failed: Out of memory')).toBeInTheDocument();
  });

  it('handles multiple output files', () => {
    const multiOutputExecution = [
      {
        ...mockExecutions[1],
        outputs: [
          { type: 'image' as const, url: '/view?filename=output1.png', filename: 'output1.png' },
          { type: 'image' as const, url: '/view?filename=output2.png', filename: 'output2.png' },
          { type: 'image' as const, url: '/view?filename=output3.png', filename: 'output3.png' },
          { type: 'image' as const, url: '/view?filename/output4.png', filename: 'output4.png' },
        ],
      },
    ];

    render(
      <ComfyUIProgressMonitor
        executions={multiOutputExecution}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    expect(screen.getByText('+1 more files')).toBeInTheDocument();
  });

  it('shows appropriate status colors and icons', () => {
    render(
      <ComfyUIProgressMonitor
        executions={mockExecutions}
        onExecutionUpdate={mockOnExecutionUpdate}
        onExecutionComplete={mockOnExecutionComplete}
      />
    );

    // Check for status badges
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });
});
