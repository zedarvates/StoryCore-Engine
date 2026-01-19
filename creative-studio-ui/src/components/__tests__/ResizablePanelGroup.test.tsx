import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResizablePanelGroup, PanelConfig } from '../ResizablePanelGroup';

describe('ResizablePanelGroup', () => {
  const mockOnResize = vi.fn();

  const createMockPanels = (): PanelConfig[] => [
    {
      id: 'left',
      minSize: 10,
      maxSize: 50,
      defaultSize: 20,
      content: <div>Left Panel</div>,
    },
    {
      id: 'center',
      minSize: 30,
      maxSize: 70,
      defaultSize: 50,
      content: <div>Center Panel</div>,
    },
    {
      id: 'right',
      minSize: 10,
      maxSize: 50,
      defaultSize: 30,
      content: <div>Right Panel</div>,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all panels', () => {
      const panels = createMockPanels();
      render(<ResizablePanelGroup panels={panels} />);

      expect(screen.getByText('Left Panel')).toBeInTheDocument();
      expect(screen.getByText('Center Panel')).toBeInTheDocument();
      expect(screen.getByText('Right Panel')).toBeInTheDocument();
    });

    it('renders resize handles between panels', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handles = container.querySelectorAll('[role="separator"]');
      expect(handles.length).toBe(2); // 3 panels = 2 handles
    });

    it('applies default sizes to panels', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const panelElements = container.querySelectorAll('.overflow-hidden');
      expect(panelElements[0]).toHaveStyle({ width: '20%' });
      expect(panelElements[1]).toHaveStyle({ width: '50%' });
      expect(panelElements[2]).toHaveStyle({ width: '30%' });
    });

    it('applies horizontal direction by default', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex-row');
    });

    it('applies vertical direction when specified', () => {
      const panels = createMockPanels();
      const { container } = render(
        <ResizablePanelGroup panels={panels} direction="vertical" />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex-col');
    });

    it('applies custom className', () => {
      const panels = createMockPanels();
      const { container } = render(
        <ResizablePanelGroup panels={panels} className="custom-class" />
      );

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('custom-class');
    });
  });

  describe('Resize Handles', () => {
    it('has correct cursor for horizontal handles', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handles = container.querySelectorAll('[role="separator"]');
      handles.forEach((handle) => {
        expect(handle).toHaveClass('cursor-col-resize');
      });
    });

    it('has correct cursor for vertical handles', () => {
      const panels = createMockPanels();
      const { container } = render(
        <ResizablePanelGroup panels={panels} direction="vertical" />
      );

      const handles = container.querySelectorAll('[role="separator"]');
      handles.forEach((handle) => {
        expect(handle).toHaveClass('cursor-row-resize');
      });
    });

    it('has hover effect on handles', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handles = container.querySelectorAll('[role="separator"]');
      handles.forEach((handle) => {
        expect(handle).toHaveClass('hover:bg-purple-500');
      });
    });

    it('has aria attributes', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handles = container.querySelectorAll('[role="separator"]');
      handles.forEach((handle) => {
        expect(handle).toHaveAttribute('aria-orientation');
        expect(handle).toHaveAttribute('aria-valuenow');
        expect(handle).toHaveAttribute('aria-valuemin');
        expect(handle).toHaveAttribute('aria-valuemax');
      });
    });
  });

  describe('Panel Constraints', () => {
    it('applies min size constraints', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const panelElements = container.querySelectorAll('.overflow-hidden');
      expect(panelElements[0]).toHaveStyle({ minWidth: '10%' });
      expect(panelElements[1]).toHaveStyle({ minWidth: '30%' });
      expect(panelElements[2]).toHaveStyle({ minWidth: '10%' });
    });

    it('applies max size constraints', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const panelElements = container.querySelectorAll('.overflow-hidden');
      expect(panelElements[0]).toHaveStyle({ maxWidth: '50%' });
      expect(panelElements[1]).toHaveStyle({ maxWidth: '70%' });
      expect(panelElements[2]).toHaveStyle({ maxWidth: '50%' });
    });

    it('applies height constraints for vertical direction', () => {
      const panels = createMockPanels();
      const { container } = render(
        <ResizablePanelGroup panels={panels} direction="vertical" />
      );

      const panelElements = container.querySelectorAll('.overflow-hidden');
      expect(panelElements[0]).toHaveStyle({ minHeight: '10%' });
      expect(panelElements[0]).toHaveStyle({ maxHeight: '50%' });
    });
  });

  describe('Resize Interaction', () => {
    it('changes cursor on mouse down', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handle = container.querySelector('[role="separator"]');
      if (handle) {
        fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });
        expect(document.body.style.cursor).toBe('col-resize');
      }
    });

    it('prevents text selection during drag', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handle = container.querySelector('[role="separator"]');
      if (handle) {
        fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });
        expect(document.body.style.userSelect).toBe('none');
      }
    });

    it('highlights active handle during drag', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handle = container.querySelector('[role="separator"]');
      if (handle) {
        fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });
        expect(handle).toHaveClass('bg-purple-600');
      }
    });

    it('resets cursor on mouse up', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handle = container.querySelector('[role="separator"]');
      if (handle) {
        fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });
        fireEvent.mouseUp(document);
        expect(document.body.style.cursor).toBe('');
      }
    });

    it('resets user select on mouse up', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const handle = container.querySelector('[role="separator"]');
      if (handle) {
        fireEvent.mouseDown(handle, { clientX: 100, clientY: 0 });
        fireEvent.mouseUp(document);
        expect(document.body.style.userSelect).toBe('');
      }
    });

    it('calls onResize callback when resizing', () => {
      const panels = createMockPanels();
      const { container } = render(
        <ResizablePanelGroup panels={panels} onResize={mockOnResize} />
      );

      const handle = container.querySelector('[role="separator"]');
      if (handle) {
        // Mock getBoundingClientRect
        const mockRect = { left: 0, top: 0, width: 1000, height: 600 };
        vi.spyOn(container.firstChild as Element, 'getBoundingClientRect').mockReturnValue(
          mockRect as DOMRect
        );

        fireEvent.mouseDown(handle, { clientX: 200, clientY: 0 });
        fireEvent.mouseMove(document, { clientX: 250, clientY: 0 });

        // onResize should be called during drag
        expect(mockOnResize).toHaveBeenCalled();
      }
    });
  });

  describe('Panel Content', () => {
    it('renders panel content correctly', () => {
      const panels: PanelConfig[] = [
        {
          id: 'panel1',
          minSize: 20,
          maxSize: 80,
          defaultSize: 50,
          content: <div data-testid="panel1-content">Panel 1 Content</div>,
        },
        {
          id: 'panel2',
          minSize: 20,
          maxSize: 80,
          defaultSize: 50,
          content: <div data-testid="panel2-content">Panel 2 Content</div>,
        },
      ];

      render(<ResizablePanelGroup panels={panels} />);

      expect(screen.getByTestId('panel1-content')).toBeInTheDocument();
      expect(screen.getByTestId('panel2-content')).toBeInTheDocument();
    });

    it('applies overflow-hidden to panel containers', () => {
      const panels = createMockPanels();
      const { container } = render(<ResizablePanelGroup panels={panels} />);

      const panelElements = container.querySelectorAll('.overflow-hidden');
      expect(panelElements.length).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles single panel', () => {
      const panels: PanelConfig[] = [
        {
          id: 'only',
          minSize: 0,
          maxSize: 100,
          defaultSize: 100,
          content: <div>Only Panel</div>,
        },
      ];

      const { container } = render(<ResizablePanelGroup panels={panels} />);

      expect(screen.getByText('Only Panel')).toBeInTheDocument();
      expect(container.querySelectorAll('[role="separator"]').length).toBe(0);
    });

    it('handles two panels', () => {
      const panels: PanelConfig[] = [
        {
          id: 'left',
          minSize: 20,
          maxSize: 80,
          defaultSize: 50,
          content: <div>Left</div>,
        },
        {
          id: 'right',
          minSize: 20,
          maxSize: 80,
          defaultSize: 50,
          content: <div>Right</div>,
        },
      ];

      const { container } = render(<ResizablePanelGroup panels={panels} />);

      expect(screen.getByText('Left')).toBeInTheDocument();
      expect(screen.getByText('Right')).toBeInTheDocument();
      expect(container.querySelectorAll('[role="separator"]').length).toBe(1);
    });
  });
});
