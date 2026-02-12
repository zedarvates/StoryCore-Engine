import { render } from '@testing-library/react';
import { Toolbar } from './Toolbar';

// Mock stores and heavy dependencies
jest.mock('../../stores/gridEditorStore', () => ({
  useGridStore: () => ({
    activeTool: 'select',
    setActiveTool: jest.fn(),
  }),
}));
jest.mock('../../stores/undoRedoStore', () => ({
  useUndoRedoStore: () => ({
    canUndo: () => false,
    canRedo: () => false,
    undo: jest.fn(),
    redo: jest.fn(),
  }),
}));
jest.mock('../../stores/viewportStore', () => ({
  useViewportStore: () => ({
    zoom: 1,
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    fitToView: jest.fn(),
    zoomToActual: jest.fn(),
  }),
}));


describe('Toolbar', () => {
  it('renders without crashing', () => {
    const { container } = render(<Toolbar />);
    expect(container).toBeTruthy();
  });
});
