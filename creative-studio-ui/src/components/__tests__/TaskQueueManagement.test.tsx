import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskQueueModal } from '../TaskQueueModal';
import { useAppStore } from '@/stores/useAppStore';

// Mock window.confirm
global.confirm = vi.fn(() => true);

// Mock the store
vi.mock('@/stores/useAppStore');

describe('TaskQueueModal - Task Management', () => {
  const mockRemoveTask = vi.fn();
  const mockReorderTasks = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
          status: 'failed',
          priority: 2,
          createdAt: new Date(),
          error: 'Test error',
        },
        {
          id: 'task-3',
          shotId: 'shot-3',
          type: 'refine',
          status: 'processing',
          priority: 3,
          createdAt: new Date(),
        },
        {
          id: 'task-4',
          shotId: 'shot-4',
          type: 'qa',
          status: 'completed',
          priority: 4,
          createdAt: new Date(),
        },
      ],
      removeTask: mockRemoveTask,
      reorderTasks: mockReorderTasks,
    });
  });

  describe('Task Removal', () => {
    it('displays remove button for pending tasks', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const removeButtons = screen.getAllByRole('button', { name: 'Remove task' });
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('displays remove button for failed tasks', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const removeButtons = screen.getAllByRole('button', { name: 'Remove task' });
      expect(removeButtons.length).toBe(2); // pending + failed
    });

    it('does not display remove button for processing tasks', () => {
      (useAppStore as any).mockReturnValue({
        taskQueue: [
          {
            id: 'task-1',
            shotId: 'shot-1',
            type: 'grid',
            status: 'processing',
            priority: 1,
            createdAt: new Date(),
          },
        ],
        removeTask: mockRemoveTask,
        reorderTasks: mockReorderTasks,
      });

      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByRole('button', { name: 'Remove task' })).not.toBeInTheDocument();
    });

    it('does not display remove button for completed tasks', () => {
      (useAppStore as any).mockReturnValue({
        taskQueue: [
          {
            id: 'task-1',
            shotId: 'shot-1',
            type: 'grid',
            status: 'completed',
            priority: 1,
            createdAt: new Date(),
          },
        ],
        removeTask: mockRemoveTask,
        reorderTasks: mockReorderTasks,
      });

      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByRole('button', { name: 'Remove task' })).not.toBeInTheDocument();
    });

    it('shows confirmation dialog when remove is clicked', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const removeButtons = screen.getAllByRole('button', { name: 'Remove task' });
      fireEvent.click(removeButtons[0]);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to remove this task from the queue?'
      );
    });

    it('removes task when confirmed', () => {
      (global.confirm as any).mockReturnValue(true);

      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const removeButtons = screen.getAllByRole('button', { name: 'Remove task' });
      fireEvent.click(removeButtons[0]);

      expect(mockRemoveTask).toHaveBeenCalledWith('task-1');
    });

    it('does not remove task when cancelled', () => {
      (global.confirm as any).mockReturnValue(false);

      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const removeButtons = screen.getAllByRole('button', { name: 'Remove task' });
      fireEvent.click(removeButtons[0]);

      expect(mockRemoveTask).not.toHaveBeenCalled();
    });

    it('has red styling for remove button', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const removeButton = screen.getAllByRole('button', { name: 'Remove task' })[0];
      expect(removeButton).toHaveClass('text-red-400');
      expect(removeButton).toHaveClass('hover:text-red-600');
    });
  });

  describe('Task Execution Order', () => {
    it('displays tasks in priority order', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const positions = screen.getAllByText(/^\d+$/);
      expect(positions[0]).toHaveTextContent('1');
      expect(positions[1]).toHaveTextContent('2');
      expect(positions[2]).toHaveTextContent('3');
      expect(positions[3]).toHaveTextContent('4');
    });

    it('shows priority badges', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Priority: 1')).toBeInTheDocument();
      expect(screen.getByText('Priority: 2')).toBeInTheDocument();
      expect(screen.getByText('Priority: 3')).toBeInTheDocument();
      expect(screen.getByText('Priority: 4')).toBeInTheDocument();
    });

    it('maintains order after reordering', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const moveDownButtons = screen.getAllByRole('button', { name: 'Move down' });
      fireEvent.click(moveDownButtons[0]);

      const reorderedTasks = mockReorderTasks.mock.calls[0][0];
      expect(reorderedTasks[0].priority).toBe(1);
      expect(reorderedTasks[1].priority).toBe(2);
      expect(reorderedTasks[2].priority).toBe(3);
      expect(reorderedTasks[3].priority).toBe(4);
    });
  });

  describe('Task Status Display', () => {
    it('shows different status for each task', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('displays error message for failed tasks', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/Test error/i)).toBeInTheDocument();
    });

    it('shows status summary in footer', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
      expect(screen.getByText(/1 processing/i)).toBeInTheDocument();
      expect(screen.getByText(/1 completed/i)).toBeInTheDocument();
      expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
    });
  });

  describe('Task Type Display', () => {
    it('displays correct labels for all task types', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Grid Generation')).toBeInTheDocument();
      expect(screen.getByText('Promotion')).toBeInTheDocument();
      expect(screen.getByText('Refinement')).toBeInTheDocument();
      expect(screen.getByText('Quality Assurance')).toBeInTheDocument();
    });
  });

  describe('Interaction Restrictions', () => {
    it('only allows reordering of pending tasks', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' });
      const moveDownButtons = screen.getAllByRole('button', { name: 'Move down' });

      // Only pending task should have move buttons
      expect(moveUpButtons.length).toBe(1);
      expect(moveDownButtons.length).toBe(1);
    });

    it('only allows removal of pending and failed tasks', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const removeButtons = screen.getAllByRole('button', { name: 'Remove task' });

      // Pending + failed = 2 remove buttons
      expect(removeButtons.length).toBe(2);
    });

    it('does not allow dragging non-pending tasks', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElements = container.querySelectorAll('[draggable="true"]');

      // Only pending task should be draggable
      expect(draggableElements.length).toBe(1);
    });
  });
});
