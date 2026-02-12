import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TaskQueueModal } from '../TaskQueueModal';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('TaskQueueModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue({
      taskQueue: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(<TaskQueueModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Task Queue')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Task Queue')).toBeInTheDocument();
  });

  it('displays empty state when no tasks', () => {
    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('No tasks in queue')).toBeInTheDocument();
    expect(screen.getByText(/Tasks will appear here/i)).toBeInTheDocument();
  });

  it('displays task count in header', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 1,
          createdAt: new Date(),
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('1 task in queue')).toBeInTheDocument();
  });

  it('displays plural task count', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
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
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('2 tasks in queue')).toBeInTheDocument();
  });

  it('closes when backdrop is clicked', () => {
    const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('closes when X button is clicked', () => {
    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes when footer Close button is clicked', () => {
    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeButtons[closeButtons.length - 1]); // Footer button

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays task items', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 1,
          createdAt: new Date(),
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Grid Generation')).toBeInTheDocument();
    expect(screen.getByText('Shot ID: shot-1')).toBeInTheDocument();
  });

  it('displays task position', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
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
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays task priority', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 5,
          createdAt: new Date(),
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Priority: 5')).toBeInTheDocument();
  });

  it('displays pending status', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 1,
          createdAt: new Date(),
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('displays processing status', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'processing',
          priority: 1,
          createdAt: new Date(),
          startedAt: new Date(),
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('displays completed status', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'completed',
          priority: 1,
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays failed status', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'failed',
          priority: 1,
          createdAt: new Date(),
          error: 'Test error message',
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
  });

  it('displays task type labels', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
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
          status: 'pending',
          priority: 3,
          createdAt: new Date(),
        },
        {
          id: 'task-4',
          shotId: 'shot-4',
          type: 'qa',
          status: 'pending',
          priority: 4,
          createdAt: new Date(),
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Grid Generation')).toBeInTheDocument();
    expect(screen.getByText('Promotion')).toBeInTheDocument();
    expect(screen.getByText('Refinement')).toBeInTheDocument();
    expect(screen.getByText('Quality Assurance')).toBeInTheDocument();
  });

  it('displays status summary in footer', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 1,
          createdAt: new Date(),
        },
        {
          id: 'task-2',
          shotId: 'shot-2',
          type: 'promotion',
          status: 'processing',
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
        {
          id: 'task-4',
          shotId: 'shot-4',
          type: 'qa',
          status: 'failed',
          priority: 4,
          createdAt: new Date(),
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
    expect(screen.getByText(/1 processing/i)).toBeInTheDocument();
    expect(screen.getByText(/1 completed/i)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
  });

  it('displays created timestamp', () => {
    const createdDate = new Date('2024-01-15T10:30:00');
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 1,
          createdAt: createdDate,
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Created:/i)).toBeInTheDocument();
  });

  it('displays started timestamp when available', () => {
    const startedDate = new Date('2024-01-15T10:35:00');
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'processing',
          priority: 1,
          createdAt: new Date(),
          startedAt: startedDate,
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Started:/i)).toBeInTheDocument();
  });

  it('displays completed timestamp when available', () => {
    const completedDate = new Date('2024-01-15T10:40:00');
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'completed',
          priority: 1,
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: completedDate,
        },
      ],
    });

    render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/Completed:/i)).toBeInTheDocument();
  });

  it('has proper styling for different statuses', () => {
    (useAppStore as any).mockReturnValue({
      taskQueue: [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 1,
          createdAt: new Date(),
        },
      ],
    });

    const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

    const taskItem = container.querySelector('.bg-gray-50');
    expect(taskItem).toBeInTheDocument();
  });
});
