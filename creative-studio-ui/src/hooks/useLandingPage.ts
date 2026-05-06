import { LegacyAny } from '@/types/legacy';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RecentProject } from '@/components/launcher/RecentProjectsList';
import { useAppStore } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import { useCharacterPersistence } from '@/hooks/useCharacterPersistence';
import { useWorldPersistence } from '@/hooks/useWorldPersistence';
import { useLocationPersistence } from '@/hooks/useLocationPersistence';
import { useSequencePersistence } from '@/hooks/useSequencePersistence';
import type { Project as StoreProject } from '@/types';
import { generateProjectTemplate, sequencesToShots } from '@/utils/projectTemplateGenerator';
import type { SerializableProjectFormat } from '@/components/launcher/CreateProjectDialog';
import { projectCreationService, convertElectronProjectToStore } from '@/services/ProjectCreationService';

// interfaces and helpers removed - using centralized service

// ============================================================================
// Types
// ============================================================================

interface UseLandingPageReturn {
  // State
  isLoading: boolean;
  error: string | null;
  showCreateDialog: boolean;
  showOpenDialog: boolean;

  // Actions
  handleCreateProject: () => void;
  handleOpenProject: () => void;
  handleCreateProjectSubmit: (projectName: string, projectPath: string, format: SerializableProjectFormat) => Promise<void>;
  handleOpenProjectSubmit: (projectPath: string) => Promise<void>;
  handleRecentProjectClick: (project: RecentProject) => void;
  setShowCreateDialog: (show: boolean) => void;
  setShowOpenDialog: (show: boolean) => void;
  clearError: () => void;
}

// ============================================================================
// useLandingPage Hook
// ============================================================================

export function useLandingPage(): UseLandingPageReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const navigate = useNavigate();

  // Get store actions
  const setProject = useAppStore((state) => state.setProject);
  const setShots = useAppStore((state) => state.setShots);

  // Get persistence functions at top level
  const { loadAndSyncCharacters } = useCharacterPersistence();
  const { syncWorldsFromProject } = useWorldPersistence();
  const { loadAndSyncLocations } = useLocationPersistence();
  const { loadAndSyncSequences } = useSequencePersistence();

  // Handle create project button click
  const handleCreateProject = useCallback(() => {
    setError(null);
    setShowCreateDialog(true);
  }, []);

  // Handle create project submission
  const handleCreateProjectSubmit = useCallback(
    async (projectName: string, projectPath: string, format: SerializableProjectFormat) => {
      console.log('[useLandingPage] handleCreateProjectSubmit called with:', {
        projectName,
        projectPath: projectPath || '(empty - will use default)',
        format: format.name,
      });
      
      setIsLoading(true);
      setError(null);

      try {
        const template = generateProjectTemplate(format);
        const initialShots = sequencesToShots(template.sequences);

        if (window.electronAPI) {
          const createData = {
            name: projectName,
            format: {
              aspectRatio: '16:9',
              resolution: '1920x1080',
              frameRate: 24,
              colorSpace: 'sRGB',
            },
            initialShots: initialShots,
            location: (projectPath && projectPath.trim() !== '') ? projectPath : undefined
          };
          
          const electronProject = await window.electronAPI.project.create(createData as LegacyAny);
          const storeProject = convertElectronProjectToStore(electronProject as LegacyAny);
          const actualProjectPath = electronProject.path || `${projectPath}/${projectName}`;

          await projectCreationService.loadProjectIntoStores(storeProject, actualProjectPath, template.sequences);

          setShowCreateDialog(false);

          if (actualProjectPath) {
            navigate(`/project/${encodeURIComponent(actualProjectPath)}`);
          }

        } else {
          // Demo mode
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const demoProject: StoreProject = {
            id: Date.now().toString(),
            schema_version: '1.0',
            project_name: projectName,
            shots: initialShots,
            assets: [],
            capabilities: {
              grid_generation: true,
              promotion_engine: true,
              qa_engine: true,
              autofix_engine: true,
            },
            generation_status: {
              grid: 'pending',
              promotion: 'pending',
            },
            metadata: {
              id: Date.now().toString(),
              path: `${projectPath}/${projectName}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              format: format,
              sequences: template.sequences.length,
              totalShots: template.totalShots,
              totalDuration: template.totalDuration,
            },
          };

          setProject(demoProject);
          setShots(initialShots);
          setShowCreateDialog(false);
          
          navigate(`/project/${encodeURIComponent(demoProject.metadata!.path)}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setProject, setShots, navigate]
  );

  // Handle open project submission
  const handleOpenProjectSubmit = useCallback(
    async (projectPath: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (window.electronAPI) {
          const electronProject = await window.electronAPI.project.open(projectPath);
          const storeProject = convertElectronProjectToStore(electronProject as LegacyAny);
          await projectCreationService.loadProjectIntoStores(storeProject, projectPath);

          await Promise.all([
            loadAndSyncCharacters(),
            syncWorldsFromProject(),
            loadAndSyncLocations(),
            loadAndSyncSequences()
          ]);

          setShowOpenDialog(false);
          navigate(`/project/${encodeURIComponent(projectPath)}`);

        } else {
          // Demo mode
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const demoProject: StoreProject = {
            id: Date.now().toString(),
            schema_version: '1.0',
            project_name: 'Demo Project',
            shots: [],
            assets: [],
            capabilities: {
              grid_generation: true,
              promotion_engine: true,
              qa_engine: true,
              autofix_engine: true,
            },
            generation_status: {
              grid: 'pending',
              promotion: 'pending',
            },
            metadata: {
              id: Date.now().toString(),
              path: projectPath,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

          setProject(demoProject);
          setShots([]);
          useEditorStore.getState().setProjectPath(projectPath);

          await Promise.all([
            loadAndSyncCharacters(),
            syncWorldsFromProject(),
            loadAndSyncLocations(),
            loadAndSyncSequences()
          ]);

          setShowOpenDialog(false);
          navigate(`/project/${encodeURIComponent(projectPath)}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to open project';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setProject, setShots, loadAndSyncCharacters, syncWorldsFromProject, loadAndSyncLocations, loadAndSyncSequences, navigate]
  );

  // Handle open project button click
  const handleOpenProject = useCallback(async () => {
    setError(null);
    
    if (window.electronAPI) {
      try {
        setIsLoading(true);
        const selectedPath = await window.electronAPI.project.selectForOpen();
        if (selectedPath) {
          await handleOpenProjectSubmit(selectedPath);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to select project';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      if ('showDirectoryPicker' in window) {
        try {
          setIsLoading(true);
          const dirHandle = await (window as LegacyAny).showDirectoryPicker({
            mode: 'read',
          });
          const projectPath = dirHandle.name;
          if (projectPath) {
            await handleOpenProjectSubmit(projectPath);
          }
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            setError(err.message || 'Failed to select project');
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowOpenDialog(true);
      }
    }
  }, [handleOpenProjectSubmit]);

  // Handle recent project click
  const handleRecentProjectClick = useCallback(
    async (project: RecentProject) => {
      if (project.exists === false) {
        setError(`Project "${project.name}" not found at ${project.path}`);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (window.electronAPI) {
          const electronProject = await window.electronAPI.project.open(project.path);
          const storeProject = convertElectronProjectToStore(electronProject as LegacyAny);
          await projectCreationService.loadProjectIntoStores(storeProject, project.path);

          await Promise.all([
            loadAndSyncCharacters(),
            syncWorldsFromProject(),
            loadAndSyncLocations(),
            loadAndSyncSequences()
          ]);

          navigate(`/project/${encodeURIComponent(project.path)}`);

        } else {
          // Demo mode
          await new Promise((resolve) => setTimeout(resolve, 500));

          const demoProject: StoreProject = {
            id: project.id,
            schema_version: '1.0',
            project_name: project.name,
            shots: [],
            assets: [],
            capabilities: {
              grid_generation: true,
              promotion_engine: true,
              qa_engine: true,
              autofix_engine: true,
            },
            generation_status: {
              grid: 'pending',
              promotion: 'pending',
            },
            metadata: {
              id: project.id,
              path: project.path,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

          setProject(demoProject);
          setShots([]);
          useEditorStore.getState().setProjectPath(project.path);

          await Promise.all([
            loadAndSyncCharacters(),
            syncWorldsFromProject(),
            loadAndSyncLocations(),
            loadAndSyncSequences()
          ]);

          navigate(`/project/${encodeURIComponent(project.path)}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to open project';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [setProject, setShots, loadAndSyncCharacters, syncWorldsFromProject, loadAndSyncLocations, loadAndSyncSequences, navigate]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    showCreateDialog,
    showOpenDialog,
    handleCreateProject,
    handleOpenProject,
    handleCreateProjectSubmit,
    handleOpenProjectSubmit,
    handleRecentProjectClick,
    setShowCreateDialog,
    setShowOpenDialog,
    clearError,
  };
}

