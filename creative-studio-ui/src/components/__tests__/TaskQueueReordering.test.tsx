import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskQueueModal } from '../TaskQueueModal';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('TaskQueueModal - Reordering', () => {
  const mockReorderTasks = vi.fn();
  const mockOnClose = vi.fn();

  const createMockTasks = () => [
    {
      id: 'task-1',
      shotId: 'shot-1',
      type: 'grid' as const,
      status: 'pending' as const,
      priority: 1,
      createdAt: new Date(),
    },
    {
      id: 'task-2',
      shotId: 'shot-2',
      type: 'promotion' as const,
      status: 'pending' as const,
      priority: 2,
      createdAt: new Date(),
    },
    {
      id: 'task-3',
      shotId: 'shot-3',
      type: 'refine' as const,
      status: 'pending' as const,
      priority: 3,
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue({
      taskQueue: createMockTasks(),
      reorderTasks: mockReorderTasks,
    });
  });

  describe('Move Up/Down Buttons', () => {
    it('displays move up and move down buttons for pending tasks', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' });
      const moveDownButtons = screen.getAllByRole('button', { name: 'Move down' });

      expect(moveUpButtons.length).toBe(3);
      expect(moveDownButtons.length).toBe(3);
    });

    it('disables move up button for first task', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' });
      expect(moveUpButtons[0]).toBeDisabled();
    });

    it('disables move down button for last task', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const moveDownButtons = screen.getAllByRole('button', { name: 'Move down' });
      expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled();
    });

    it('moves task up when move up button is clicked', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' });
      fireEvent.click(moveUpButtons[1]); // Click move up on second task

      expect(mockReorderTasks).toHaveBeenCalled();
      const reorderedTasks = mockReorderTasks.mock.calls[0][0];

      // Second task should now be first
      expect(reorderedTasks[0].id).toBe('task-2');
      expect(reorderedTasks[1].id).toBe('task-1');
      expect(reorderedTasks[2].id).toBe('task-3');
    });

    it('moves task down when move down button is clicked', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const moveDownButtons = screen.getAllByRole('button', { name: 'Move down' });
      fireEvent.click(moveDownButtons[0]); // Click move down on first task

      expect(mockReorderTasks).toHaveBeenCalled();
      const reorderedTasks = mockReorderTasks.mock.calls[0][0];

      // First task should now be second
      expect(reorderedTasks[0].id).toBe('task-2');
      expect(reorderedTasks[1].id).toBe('task-1');
      expect(reorderedTasks[2].id).toBe('task-3');
    });

    it('updates priorities after reordering', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' });
      fireEvent.click(moveUpButtons[1]);

      const reorderedTasks = mockReorderTasks.mock.calls[0][0];

      expect(reorderedTasks[0].priority).toBe(1);
      expect(reorderedTasks[1].priority).toBe(2);
      expect(reorderedTasks[2].priority).toBe(3);
    });

    it('does not show reorder buttons for processing tasks', () => {
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
        reorderTasks: mockReorderTasks,
      });

      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByRole('button', { name: 'Move up' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Move down' })).not.toBeInTheDocument();
    });

    it('does not show reorder buttons for completed tasks', () => {
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
        reorderTasks: mockReorderTasks,
      });

      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.queryByRole('button', { name: 'Move up' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Move down' })).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('makes pending tasks draggable', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElements = container.querySelectorAll('[draggable="true"]');
      expect(draggableElements.length).toBe(3);
    });

    it('does not make processing tasks draggable', () => {
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
        reorderTasks: mockReorderTasks,
      });

      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElements = container.querySelectorAll('[draggable="true"]');
      expect(draggableElements.length).toBe(0);
    });

    it('shows drag handle for pending tasks', () => {
      render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);
      const gripIcons = container.querySelectorAll('svg');

      // Should have grip vertical icons for pending tasks
      expect(gripIcons.length).toBeGreaterThan(0);
    });

    it('applies cursor-move class to pending tasks', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const cursorMoveElements = container.querySelectorAll('.cursor-move');
      expect(cursorMoveElements.length).toBeGreaterThan(0);
    });

    it('handles drag start event', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElement = container.querySelector('[draggable="true"]');
      if (draggableElement) {
        fireEvent.dragStart(draggableElement);
        // Should apply opacity-50 class during drag
        expect(draggableElement).toHaveClass('opacity-50');
      }
    });

    it('handles drag over event', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElements = container.querySelectorAll('[draggable="true"]');
      if (draggableElements.length >= 2) {
        fireEvent.dragStart(draggableElements[0]);
        fireEvent.dragOver(draggableElements[1]);

        // Should apply ring class to drag over target
        expect(draggableElements[1]).toHaveClass('ring-2');
      }
    });

    it('reorders tasks on drop', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElements = container.querySelectorAll('[draggable="true"]');
      if (draggableElements.length >= 2) {
        fireEvent.dragStart(draggableElements[0]);
        fireEvent.drop(draggableElements[2]);

        expect(mockReorderTasks).toHaveBeenCalled();
      }
    });

    it('updates priorities after drag and drop', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElements = container.querySelectorAll('[draggable="true"]');
      if (draggableElements.length >= 2) {
        fireEvent.dragStart(draggableElements[0]);
        fireEvent.drop(draggableElements[2]);

        const reorderedTasks = mockReorderTasks.mock.calls[0][0];
        reorderedTasks.forEach((task: any, index: number) => {
          expect(task.priority).toBe(index + 1);
        });
      }
    });

    it('cleans up drag state on drag end', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElement = container.querySelector('[draggable="true"]');
      if (draggableElement) {
        fireEvent.dragStart(draggableElement);
        fireEvent.dragEnd(draggableElement);

        // Should remove opacity class after drag ends
        expect(draggableElement).not.toHaveClass('opacity-50');
      }
    });

    it('does not reorder if dropped on same position', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElement = container.querySelector('[draggable="true"]');
      if (draggableElement) {
        fireEvent.dragStart(draggableElement);
        fireEvent.drop(draggableElement);

        expect(mockReorderTasks).not.toHaveBeenCalled();
      }
    });
  });

  describe('Visual Feedback', () => {
    it('applies opacity during drag', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElement = container.querySelector('[draggable="true"]');
      if (draggableElement) {
        fireEvent.dragStart(draggableElement);
        expect(draggableElement).toHaveClass('opacity-50');
        expect(draggableElement).toHaveClass('scale-95');
      }
    });

    it('applies ring on drag over', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElements = container.querySelectorAll('[draggable="true"]');
      if (draggableElements.length >= 2) {
        fireEvent.dragStart(draggableElements[0]);
        fireEvent.dragOver(draggableElements[1]);

        expect(draggableElements[1]).toHaveClass('ring-2');
        expect(draggableElements[1]).toHaveClass('ring-purple-500');
      }
    });

    it('removes ring on drag leave', () => {
      const { container } = render(<TaskQueueModal isOpen={true} onClose={mockOnClose} />);

      const draggableElements = container.querySelectorAll('[draggable="true"]');
      if (draggableElements.length >= 2) {
        fireEvent.dragStart(draggableElements[0]);
        fireEvent.dragOver(draggableElements[1]);
        fireEvent.dragLeave(draggableElements[1]);

        expect(draggableElements[1]).not.toHaveClass('ring-2');
      }
    });
  });
});
