import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuBar } from '../MenuBar';
import { useAppStore } from '@/stores/useAppStore';
import * as undoRedoModule from '@/store/undoRedo';

// Mock the store
vi.mock('@/stores/useAppStore');
vi.mock('@/store/undoRedo');
vi.mock('@/utils/projectManager');

describe('MenuBar', () => {
  const mockOnNewProject = vi.fn();
  const mockOnOpenProject = vi.fn();
  const mockOnSaveProject = vi.fn();
  const mockOnExportProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock store state
    vi.mocked(useAppStore).mockImplementation((selector: any) => {
      const state = {
        project: {
          schema_version: '1.0',
          project_name: 'Test Project',
          shots: [],
          assets: [],
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
          },
          generation_status: {
            grid: 'pending' as const,
            promotion: 'pending' as const,
          },
        },
        showChat: false,
        setShowChat: vi.fn(),
        showTaskQueue: false,
        setShowTaskQueue: vi.fn(),
      };
      return selector(state);
    });

    // Mock undo/redo functions
    vi.mocked(undoRedoModule.canUndo).mockReturnValue(true);
    vi.mocked(undoRedoModule.canRedo).mockReturnValue(true);
    vi.mocked(undoRedoModule.undo).mockImplementation(() => {});
    vi.mocked(undoRedoModule.redo).mockImplementation(() => {});
  });

  it('renders all menu items', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('displays project name when project is loaded', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('opens File menu and shows menu items', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    const fileMenu = screen.getByText('File');
    fireEvent.click(fileMenu);

    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Open Project')).toBeInTheDocument();
    expect(screen.getByText('Save Project')).toBeInTheDocument();
    expect(screen.getByText('Export Project')).toBeInTheDocument();
  });

  it('calls onNewProject when New Project is clicked', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    const fileMenu = screen.getByText('File');
    fireEvent.click(fileMenu);

    const newProjectItem = screen.getByText('New Project');
    fireEvent.click(newProjectItem);

    expect(mockOnNewProject).toHaveBeenCalledTimes(1);
  });

  it('opens Edit menu and shows undo/redo options', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    const editMenu = screen.getByText('Edit');
    fireEvent.click(editMenu);

    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
    expect(screen.getByText('Cut')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Paste')).toBeInTheDocument();
  });

  it('calls undo when Undo is clicked', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    const editMenu = screen.getByText('Edit');
    fireEvent.click(editMenu);

    const undoItem = screen.getByText('Undo');
    fireEvent.click(undoItem);

    expect(undoRedoModule.undo).toHaveBeenCalledTimes(1);
  });

  it('opens View menu and shows view options', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    const viewMenu = screen.getByText('View');
    fireEvent.click(viewMenu);

    expect(screen.getByText('Toggle Asset Library')).toBeInTheDocument();
    expect(screen.getByText('Toggle Timeline')).toBeInTheDocument();
    expect(screen.getByText('Show Chat Assistant')).toBeInTheDocument();
    expect(screen.getByText('Zoom In')).toBeInTheDocument();
    expect(screen.getByText('Toggle Grid')).toBeInTheDocument();
  });

  it('opens Help menu and shows help options', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    const helpMenu = screen.getByText('Help');
    fireEvent.click(helpMenu);

    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('displays keyboard shortcuts in menu items', () => {
    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    const fileMenu = screen.getByText('File');
    fireEvent.click(fileMenu);

    expect(screen.getByText('Ctrl+N')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
  });

  it('disables Save and Export when no project is loaded', () => {
    // Mock store with no project
    vi.mocked(useAppStore).mockImplementation((selector: any) => {
      const state = {
        project: null,
        showChat: false,
        setShowChat: vi.fn(),
        showTaskQueue: false,
        setShowTaskQueue: vi.fn(),
      };
      return selector(state);
    });

    render(
      <MenuBar
        onNewProject={mockOnNewProject}
        onOpenProject={mockOnOpenProject}
        onSaveProject={mockOnSaveProject}
        onExportProject={mockOnExportProject}
      />
    );

    const fileMenu = screen.getByText('File');
    fireEvent.click(fileMenu);

    const saveItem = screen.getByText('Save Project');
    const exportItem = screen.getByText('Export Project');

    // Check if items have disabled class
    expect(saveItem.parentElement).toHaveClass('pointer-events-none');
    expect(exportItem.parentElement).toHaveClass('pointer-events-none');
  });
});
