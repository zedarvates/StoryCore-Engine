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
import type { Project as ElectronProject } from '@/types/electron';

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
  recentProjects: RecentProject[];

  // Actions
  handleCreateProject: () => void;
  handleOpenProject: () => void;
  handleCreateProjectSubmit: (projectName: string, projectPath: string, format: SerializableProjectFormat) => Promise<void>;
  handleOpenProjectSubmit: (projectPath: string) => Promise<void>;
  handleRecentProjectClick: (project: RecentProject) => void;
  handleRemoveRecentProject: (projectPath: string) => Promise<void>;
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
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const navigate = useNavigate();

  // Get store actions
  const setProject = useAppStore((state) => state.setProject);
  const setShots = useAppStore((state) => state.setShots);

  // Get persistence functions at top level (hooks can only be called at top level)
  const { loadAndSyncCharacters } = useCharacterPersistence();
  const { syncWorldsFromProject } = useWorldPersistence();
  const { loadAndSyncLocations } = useLocationPersistence();
  const { loadAndSyncSequences } = useSequencePersistence();

  // Load recent projects on mount
  const loadRecentProjects = useCallback(async () => {
      try {
        if (window.electronAPI) {
          const projects = await window.electronAPI.recentProjects.get();
          // Convert numeric lastAccessed to Date if needed
          const normalizedProjects: RecentProject[] = projects.map((p) => ({
            ...p,
            lastAccessed: typeof p.lastAccessed === 'number' ? new Date(p.lastAccessed) : p.lastAccessed
          }));
          setRecentProjects(normalizedProjects);
        }
      } catch (err) {
      console.error('Failed to load recent projects:', err);
      // Don't show error to user for this - just log it
    }
  }, []);

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
        // Generate project template based on format
        const template = generateProjectTemplate(format);
        const initialShots = sequencesToShots(template.sequences);

        if (window.electronAPI) {
          // Create project via Electron API with format (returns Project directly, throws on error)
          // If projectPath is empty, the backend will use the default Documents directory
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
          
          if (createData.location) {
            console.log('[useLandingPage] Using custom location:', projectPath);
          } else {
            console.log('[useLandingPage] No location specified, backend will use default path');
          }
          
          console.log('[useLandingPage] Creating project with data:', createData);
          const electronProject = await window.electronAPI.project.create(createData as any);

          console.log('Project created successfully:', electronProject);

          // Convert Electron project to Store project format
          const storeProject = convertElectronProjectToStore(electronProject as any);
          // Get the actual project path from the electron project
          const actualProjectPath = electronProject.path || `${projectPath}/${projectName}`;

          // Load the created project into the store using the centralized service
          await projectCreationService.loadProjectIntoStores(storeProject, actualProjectPath, template.sequences);

          // Reload recent projects
          await loadRecentProjects();

          // Close dialog
          setShowCreateDialog(false);

          // Navigate to project dashboard
          if (actualProjectPath) {
            navigate(`/project/${encodeURIComponent(actualProjectPath)}`);
          }

        } else {
          // Demo mode - simulate creation
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Create a demo project in Store format with format info and initial shots
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

          // Load into store
          setProject(demoProject);
          setShots(initialShots);

          // Add to recent projects
          const newProject: RecentProject = {
            id: Date.now().toString(),
            name: projectName,
            path: `${projectPath}/${projectName}`,
            lastAccessed: new Date(),
            exists: true,
          };

          setRecentProjects((prev) => [newProject, ...prev].slice(0, 10));
          setShowCreateDialog(false);
          
          // Navigate to project dashboard
          navigate(`/project/${encodeURIComponent(newProject.path)}`);

        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
        setError(errorMessage);
        throw err; // Re-throw so dialog can handle it
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecentProjects, setProject, setShots, navigate]
  );

// Handle open project submission
  const handleOpenProjectSubmit = useCallback(
    async (projectPath: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (window.electronAPI) {
          // Open project via Electron API (returns Project directly, throws on error)
          const electronProject = await window.electronAPI.project.open(projectPath);

          // Convert Electron project to Store project format
          const storeProject = convertElectronProjectToStore(electronProject as any);

          // Load the opened project into the store using the centralized service
          await projectCreationService.loadProjectIntoStores(storeProject, projectPath);

          // Sync characters from project directory to store
          await loadAndSyncCharacters();

          // Sync worlds from project directory to store
          await syncWorldsFromProject();

          // Sync locations from project directory to store
          await loadAndSyncLocations();

          // Sync sequences from project directory to store
          await loadAndSyncSequences();

          // Reload recent projects
          await loadRecentProjects();

          // Close dialog
          setShowOpenDialog(false);

          // Navigate to project dashboard
          navigate(`/project/${encodeURIComponent(projectPath)}`);

        } else {
          // Demo mode - simulate opening
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Create a demo project in Store format
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

          // Load into store
          setProject(demoProject);
          setShots([]);

          // Set project path in editor store so persistence hooks can use it
          useEditorStore.getState().setProjectPath(projectPath);

          // Sync characters from project directory to store
          await loadAndSyncCharacters();

          // Sync worlds from project directory to store
          await syncWorldsFromProject();

          // Sync locations from project directory to store
          await loadAndSyncLocations();

          // Sync sequences from project directory to store
          await loadAndSyncSequences();

          setShowOpenDialog(false);
          
          // Navigate to project dashboard
          navigate(`/project/${encodeURIComponent(projectPath)}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to open project';
        setError(errorMessage);
        throw err; // Re-throw so dialog can handle it
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecentProjects, setProject, setShots, loadAndSyncCharacters, syncWorldsFromProject, loadAndSyncLocations, loadAndSyncSequences, navigate]
  );



  // ============================================================================
  // Handle open project button click
  // ============================================================================
  //
  // CRITICAL: This function implements two distinct code paths based on the
  // execution environment (Electron vs Browser mode). Native dialogs are
  // preferred in both environments when available.
  //
  const handleOpenProject = useCallback(async () => {
    setError(null);
    
    // ========================================================================
    // ELECTRON MODE: Use native OS file dialog
    // ========================================================================
    if (window.electronAPI) {
      try {
        setIsLoading(true);
        
        // Open native OS file dialog - returns selected path or null
        const selectedPath = await window.electronAPI.project.selectForOpen();
        
        if (selectedPath) {
          // User selected a path - proceed to open the project
          await handleOpenProjectSubmit(selectedPath);
        }
        // If selectedPath is null, user canceled the dialog - do nothing
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to select project';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      // ======================================================================
      // BROWSER MODE: Try File System Access API, fallback to custom modal
      // ======================================================================
      
      // Check if File System Access API is available (Chrome, Edge, Opera)
      if ('showDirectoryPicker' in window) {
        try {
          setIsLoading(true);
          
          // Open native browser directory picker
          const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'read',
          });
          
          // Get the full path (if available) or use the directory name
          const projectPath = dirHandle.name;
          
          if (projectPath) {
            await handleOpenProjectSubmit(projectPath);
          }
        } catch (err) {
          // User canceled or error occurred
          if (err instanceof Error && err.name !== 'AbortError') {
            const errorMessage = err.message || 'Failed to select project';
            setError(errorMessage);
          }
          // AbortError means user canceled - not an error
        } finally {
          setIsLoading(false);
        }
      } else {
        // Fallback to custom modal for browsers without File System Access API
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
          // Open project via Electron API (returns Project directly, throws on error)
          const electronProject = await window.electronAPI.project.open(project.path);

          // Convert Electron project to Store project format
          const storeProject = convertElectronProjectToStore(electronProject as any);

          // Load the opened project into the store using the centralized service
          await projectCreationService.loadProjectIntoStores(storeProject, project.path);

          // Sync characters from project directory to store
          await loadAndSyncCharacters();

          // Sync worlds from project directory to store
          await syncWorldsFromProject();

          // Sync locations from project directory to store
          await loadAndSyncLocations();

          // Sync sequences from project directory to store
          await loadAndSyncSequences();

          // Reload recent projects to update last accessed time
          await loadRecentProjects();

          // Navigate to project dashboard
          navigate(`/project/${encodeURIComponent(project.path)}`);

        } else {
          // Demo mode - simulate opening
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Create a demo project in Store format
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

          // Load into store
          setProject(demoProject);
          setShots([]);

          // Set project path in editor store so persistence hooks can use it
          useEditorStore.getState().setProjectPath(project.path);

          // Sync characters from project directory to store
          await loadAndSyncCharacters();

          // Sync worlds from project directory to store
          await syncWorldsFromProject();

          // Sync locations from project directory to store
          await loadAndSyncLocations();

          // Sync sequences from project directory to store
          await loadAndSyncSequences();

          // Update last accessed time
          setRecentProjects((prev) =>
            prev.map((p) =>
              p.id === project.id ? { ...p, lastAccessed: new Date() } : p
            )
          );

          // Navigate to project dashboard
          navigate(`/project/${encodeURIComponent(project.path)}`);

        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to open project';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [loadRecentProjects, setProject, setShots, loadAndSyncCharacters, syncWorldsFromProject, loadAndSyncLocations, loadAndSyncSequences, navigate]
  );



  // Handle remove recent project
  const handleRemoveRecentProject = useCallback(
    async (projectPath: string) => {
      try {
        if (window.electronAPI) {
          // Remove via Electron API
          await window.electronAPI.recentProjects.remove(projectPath);

          // Reload recent projects
          await loadRecentProjects();
        } else {
          // Demo mode - remove from local state
          setRecentProjects((prev) => prev.filter((p) => p.path !== projectPath));
        }
      } catch (err) {
        console.error('Failed to remove recent project:', err);
        setError('Failed to remove project from recent list');
      }
    },
    [loadRecentProjects]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    showCreateDialog,
    showOpenDialog,
    recentProjects,

    // Actions
    handleCreateProject,
    handleOpenProject,
    handleCreateProjectSubmit,
    handleOpenProjectSubmit,
    handleRecentProjectClick,
    handleRemoveRecentProject,
    setShowCreateDialog,
    setShowOpenDialog,
    clearError,
  };
}

