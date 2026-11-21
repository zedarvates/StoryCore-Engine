import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { projectService } from '@/services/project/ProjectService';
import { useAppStore } from '@/stores/useAppStore';
import type { ActionContext } from '@/types/menuConfig';
import { DEFAULT_VIEW_STATE } from '@/types/menuBarState';
import { fileActions } from '../menuActions';

vi.mock('@/services/project/ProjectService', () => ({
  projectService: { loadProject: vi.fn() },
}));

describe('File menu project opening', () => {
  let context: ActionContext;
  const showOpenDialog = vi.fn<NonNullable<NonNullable<Window['electronAPI']>['dialog']>['showOpenDialog']>();
  const loadProject = vi.mocked(projectService.loadProject);
  const { project: previousProject, shots: previousShots } = useAppStore.getState();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('electronAPI', { dialog: { showOpenDialog } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    context = {
      state: {
        project: null,
        selectedShotId: null,
        hasUnsavedChanges: false,
        isProcessing: false,
        viewState: DEFAULT_VIEW_STATE,
        undoStack: { canUndo: false, canRedo: false, undo: vi.fn(), redo: vi.fn() },
        clipboard: { hasContent: false, contentType: null, cut: vi.fn(), copy: vi.fn(), paste: vi.fn() },
      },
      services: {
        persistence: {},
        export: { exportJSON: vi.fn(), exportPDF: vi.fn(), exportVideo: vi.fn() },
        recentProjects: {},
        modal: {},
        notification: { show: vi.fn(() => 'notification-id'), dismiss: vi.fn() },
      },
    };
  });

  afterEach(() => {
    useAppStore.setState({ project: previousProject, shots: previousShots });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads the chosen directory and reports the opened project', async () => {
    showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/projects/pier'] });
    loadProject.mockResolvedValue({
      schema_version: '1.0',
      project_name: 'Ferry Pier',
      capabilities: { grid_generation: true, promotion_engine: true, qa_engine: true, autofix_engine: true },
      generation_status: { grid: 'pending', promotion: 'pending' },
    });

    await fileActions.openProject(context);

    expect(loadProject).toHaveBeenCalledExactlyOnceWith('/projects/pier');
    expect(useAppStore.getState().project).toMatchObject({ project_name: 'Ferry Pier', path: '/projects/pier' });
    expect(context.services.notification.show).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'success',
      message: expect.stringContaining('Ferry Pier'),
    }));
  });

  it('keeps the current project when the picker is canceled', async () => {
    const current = useAppStore.getState().project;
    showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await fileActions.openProject(context);

    expect(loadProject).not.toHaveBeenCalled();
    expect(useAppStore.getState().project).toBe(current);
  });

  it.each(['Project file not found', 'Permission denied', 'Invalid project document', 'Network unavailable'])(
    'reports a failed load and keeps the current project when the service returns %s',
    async (message) => {
      const current = useAppStore.getState().project;
      const failure = new Error(message);
      showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/projects/missing'] });
      loadProject.mockRejectedValue(failure);

      await fileActions.openProject(context);

      expect(context.services.notification.show).toHaveBeenLastCalledWith({
        type: 'error', message: 'Failed to open project: ' + message, duration: 5000,
      });
      expect(console.error).toHaveBeenCalledWith('[MenuAction] Failed to open project:', failure);
      expect(useAppStore.getState().project).toBe(current);
    },
  );

  it('reports a failure to open the native file picker before a load starts', async () => {
    showOpenDialog.mockRejectedValue(new Error('Dialog unavailable'));

    await fileActions.openProject(context);

    expect(loadProject).not.toHaveBeenCalled();
    expect(context.services.notification.show).toHaveBeenLastCalledWith(expect.objectContaining({
      type: 'error',
      message: 'Failed to open project: Dialog unavailable',
    }));
  });
});
