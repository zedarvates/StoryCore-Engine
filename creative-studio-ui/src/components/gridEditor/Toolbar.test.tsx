import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { Toolbar } from './Toolbar';

// Mock stores and heavy dependencies
vi.mock('../../stores/gridEditorStore', () => ({
  useGridStore: () => ({
    activeTool: 'select',
    setActiveTool: vi.fn(),
  }),
}));
vi.mock('../../stores/undoRedoStore', () => ({
  useUndoRedoStore: () => ({
    canUndo: () => false,
    canRedo: () => false,
    undo: vi.fn(),
    redo: vi.fn(),
  }),
}));
vi.mock('../../stores/viewportStore', () => ({
  useViewportStore: () => ({
    zoom: 1,
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    fitToView: vi.fn(),
    zoomToActual: vi.fn(),
  }),
}));


describe('Toolbar', () => {
  it('renders without crashing', () => {
    const { container } = render(<Toolbar />);
    expect(container).toBeTruthy();
  });
});
