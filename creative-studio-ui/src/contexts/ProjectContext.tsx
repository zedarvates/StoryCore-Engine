/**
 * ProjectContext - State management for ProjectDashboardNew
 * 
 * Provides centralized state management for project data, shots, dialogue phrases,
 * and generation status. Implements shot management, dialogue phrase management,
 * and validation functions.
 * 
 * Requirements: 1.2, 1.4, 9.3
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type {
  Project,
  Shot,
  DialoguePhrase,
  GenerationStatus,
  GenerationResults,
} from '../types/projectDashboard';
import { memoizedValidatePrompt } from '../utils/performanceOptimizations';
import {
  projectPersistence,
  type SaveResult,
  type LoadResult,
} from '../services/persistence/projectPersistence';
import {
  generationStatePersistence,
} from '../services/persistence/generationStatePersistence';

// ============================================================================
// Context Value Interface
// ============================================================================

/**
 * ProjectContextValue defines all state and functions available through the context
 * Requirements: 1.2, 1.4, 9.3
 */
export interface ProjectContextValue {
  // State
  project: Project | null;
  selectedShot: Shot | null;
  generationStatus: GenerationStatus;
  isGenerating: boolean;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  error: string | null;

  // Project Management
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
  
  // Shot Management (Task 3.2)
  updateShot: (shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (shotId: string, deletePhrases: boolean) => void;
  validateAllShots: () => { valid: boolean; invalidShots: Shot[] };
  getPromptCompletionStatus: () => { complete: number; incomplete: number; total: number };
  
  // Dialogue Phrase Management (Task 3.3)
  addDialoguePhrase: (phrase: Omit<DialoguePhrase, 'id'>) => void;
  updateDialoguePhrase: (phraseId: string, updates: Partial<DialoguePhrase>) => void;
  deleteDialoguePhrase: (phraseId: string) => void;
  linkPhraseToShot: (phraseId: string, shotId: string) => void;
  
  // Generation Management
  generateSequence: () => Promise<GenerationResults | null>;
  cancelGeneration: () => void;
  
  // Selection Management
  selectShot: (shot: Shot | null) => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const ProjectContext = createContext<ProjectContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

export interface ProjectProviderProps {
  children: ReactNode;
  projectId?: string;
  onProjectUpdate?: (project: Project) => void;
  onGenerationComplete?: (results: GenerationResults) => void;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * ProjectProvider - Context provider for project state management
 * Requirements: 1.2, 1.4, 9.3
 */
export const ProjectProvider: React.FC<ProjectProviderProps> = ({
  children,
  projectId,
  onProjectUpdate,
  onGenerationComplete,
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [project, setProject] = useState<Project | null>(null);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    stage: 'idle',
    progress: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Project Management
  // ============================================================================

  /**
   * Load project data from storage or backend
   * Requirements: 9.3, 9.4
   */
  const loadProject = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Load project from persistence layer
      const result: LoadResult = await projectPersistence.loadProject(id);

      if (result.success && result.project) {
        setProject(result.project);
        setIsLoading(false);
      } else {
        // Project not found or failed to load - create new project
        const newProject: Project = {
          id,
          name: `Project ${id}`,
          schemaVersion: '1.0',
          sequences: [],
          shots: [],
          audioPhrases: [],
          generationHistory: [],
          capabilities: {
            gridGeneration: true,
            promotionEngine: true,
            qaEngine: true,
            autofixEngine: true,
            voiceGeneration: true,
          },
        };

        setProject(newProject);
        setIsLoading(false);

        // Save the new project
        await projectPersistence.saveProject(newProject);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      setError(errorMessage);
      setIsLoading(false);
      
      // Log error for debugging in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load project:', err);
      }
    }
  }, []);

  /**
   * Save project data to storage
   * Requirements: 9.1, 9.2, 9.3, 9.5
   */
  const saveProject = useCallback(async () => {
    if (!project) return;

    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setError(null);

      // Save project using persistence service
      const result: SaveResult = await projectPersistence.saveProject(project);

      if (result.success) {
        setSaveStatus('saved');
        setIsSaving(false);
        onProjectUpdate?.(project);

        // Reset save status after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);

        // Log success for debugging in development only
        if (process.env.NODE_ENV === 'development') {
          console.log('Project saved:', project.id);
        }
      } else {
        // Save failed
        const errorMessage = result.error?.message || 'Failed to save project';
        setError(errorMessage);
        setSaveStatus('error');
        setIsSaving(false);

        // Log error for debugging in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to save project:', result.error);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save project';
      setError(errorMessage);
      setSaveStatus('error');
      setIsSaving(false);
      
      // Log error for debugging in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to save project:', err);
      }
    }
  }, [project, onProjectUpdate]);

  // Auto-save on project changes with debouncing (Requirements: 9.1, 9.2)
  useEffect(() => {
    if (project) {
      // Schedule auto-save using persistence service
      projectPersistence.scheduleAutoSave(project);
    }

    // Cleanup on unmount
    return () => {
      if (project) {
        projectPersistence.cancelAutoSave(project.id);
      }
    };
  }, [project]);

  // ============================================================================
  // Shot Management Functions (Task 3.2)
  // ============================================================================

  /**
   * Update shot properties including prompt
   * Requirements: 1.2, 1.4
   * Uses memoized validation for performance (Requirements: 10.1)
   */
  const updateShot = useCallback((shotId: string, updates: Partial<Shot>) => {
    setProject(prev => {
      if (!prev) return prev;

      const updatedShots = prev.shots.map(shot => {
        if (shot.id === shotId) {
          const updatedShot = { ...shot, ...updates };
          
          // If prompt was updated, validate it using memoized validation
          if (updates.prompt !== undefined) {
            updatedShot.promptValidation = memoizedValidatePrompt(updates.prompt);
          }
          
          return updatedShot;
        }
        return shot;
      });

      return {
        ...prev,
        shots: updatedShots,
      };
    });
  }, []);

  /**
   * Delete shot with phrase handling
   * Requirements: 7.3
   * 
   * @param shotId - ID of the shot to delete
   * @param deletePhrases - If true, delete associated phrases; if false, unlink them
   */
  const deleteShot = useCallback((shotId: string, deletePhrases: boolean) => {
    setProject(prev => {
      if (!prev) return prev;

      // Verify shot exists
      const shotExists = prev.shots.some(shot => shot.id === shotId);
      if (!shotExists) {
        // Log warning for debugging in development only
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Shot ${shotId} does not exist`);
        }
        return prev;
      }

      // Remove the shot
      const updatedShots = prev.shots.filter(shot => shot.id !== shotId);

      // Handle associated phrases
      let updatedPhrases: DialoguePhrase[];
      
      if (deletePhrases) {
        // Delete all phrases linked to this shot
        updatedPhrases = prev.audioPhrases.filter(phrase => phrase.shotId !== shotId);
        
        // Log for debugging in development only
        if (process.env.NODE_ENV === 'development') {
          console.log(`Deleted shot ${shotId} and ${prev.audioPhrases.length - updatedPhrases.length} associated phrases`);
        }
      } else {
        // Unlink phrases by setting shotId to empty string
        // This ensures no orphaned references remain
        updatedPhrases = prev.audioPhrases.map(phrase =>
          phrase.shotId === shotId
            ? { ...phrase, shotId: '' }
            : phrase
        );
        
        // Log for debugging in development only
        if (process.env.NODE_ENV === 'development') {
          console.log(`Deleted shot ${shotId} and unlinked associated phrases`);
        }
      }

      // Also remove shot from sequences
      const updatedSequences = prev.sequences.map(sequence => ({
        ...sequence,
        shotIds: sequence.shotIds.filter(id => id !== shotId),
      }));

      return {
        ...prev,
        shots: updatedShots,
        audioPhrases: updatedPhrases,
        sequences: updatedSequences,
      };
    });
  }, []);

  /**
   * Validate all shots have valid prompts
   * Requirements: 2.3, 6.1, 6.2
   * Uses memoized validation for performance (Requirements: 10.1)
   */
  const validateAllShots = useCallback((): { valid: boolean; invalidShots: Shot[] } => {
    if (!project) {
      return { valid: true, invalidShots: [] };
    }

    const invalidShots = project.shots.filter(shot => {
      const validation = memoizedValidatePrompt(shot.prompt);
      return !validation.isValid;
    });

    return {
      valid: invalidShots.length === 0,
      invalidShots,
    };
  }, [project]);

  /**
   * Get prompt completion status counts
   * Requirements: 6.1, 6.2
   * Memoized for performance (Requirements: 10.1)
   */
  const getPromptCompletionStatus = useMemo((): (() => {
    complete: number;
    incomplete: number;
    total: number;
  }) => {
    return () => {
      if (!project) {
        return { complete: 0, incomplete: 0, total: 0 };
      }

      const total = project.shots.length;
      const complete = project.shots.filter(shot => {
        const validation = memoizedValidatePrompt(shot.prompt);
        return validation.isValid;
      }).length;
      const incomplete = total - complete;

      return { complete, incomplete, total };
    };
  }, [project]);

  // ============================================================================
  // Dialogue Phrase Management Functions (Task 3.3)
  // ============================================================================

  /**
   * Add new dialogue phrase
   * Requirements: 4.2
   */
  const addDialoguePhrase = useCallback((phrase: Omit<DialoguePhrase, 'id'>) => {
    setProject(prev => {
      if (!prev) return prev;

      // Generate unique ID
      const id = `phrase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newPhrase: DialoguePhrase = {
        ...phrase,
        id,
      };

      return {
        ...prev,
        audioPhrases: [...prev.audioPhrases, newPhrase],
      };
    });
  }, []);

  /**
   * Update existing dialogue phrase
   * Requirements: 4.3
   */
  const updateDialoguePhrase = useCallback((phraseId: string, updates: Partial<DialoguePhrase>) => {
    setProject(prev => {
      if (!prev) return prev;

      const updatedPhrases = prev.audioPhrases.map(phrase =>
        phrase.id === phraseId ? { ...phrase, ...updates } : phrase
      );

      return {
        ...prev,
        audioPhrases: updatedPhrases,
      };
    });
  }, []);

  /**
   * Delete dialogue phrase
   * Requirements: 4.4
   */
  const deleteDialoguePhrase = useCallback((phraseId: string) => {
    setProject(prev => {
      if (!prev) return prev;

      const filteredPhrases = prev.audioPhrases.filter(phrase => phrase.id !== phraseId);

      return {
        ...prev,
        audioPhrases: filteredPhrases,
      };
    });
  }, []);

  /**
   * Link dialogue phrase to shot
   * Requirements: 4.4
   */
  const linkPhraseToShot = useCallback((phraseId: string, shotId: string) => {
    setProject(prev => {
      if (!prev) return prev;

      // Verify shot exists
      const shotExists = prev.shots.some(shot => shot.id === shotId);
      if (!shotExists) {
        // Log warning for debugging in development only
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Shot ${shotId} does not exist`);
        }
        return prev;
      }

      const updatedPhrases = prev.audioPhrases.map(phrase =>
        phrase.id === phraseId ? { ...phrase, shotId } : phrase
      );

      return {
        ...prev,
        audioPhrases: updatedPhrases,
      };
    });
  }, []);

  // ============================================================================
  // Generation Management
  // ============================================================================

  /**
   * Generate sequence through StoryCore pipeline
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  const generateSequence = useCallback(async (): Promise<GenerationResults | null> => {
    if (!project) return null;

    // Validate all shots have valid prompts
    const validation = validateAllShots();
    if (!validation.valid) {
      setError('Cannot generate: some shots have invalid prompts');
      return null;
    }

    try {
      setIsGenerating(true);
      setError(null);

      // Import sequence generation service dynamically
      const { sequenceGenerationService } = await import('../services/sequenceGenerationService');

      // Generate sequence with progress callbacks
      const results = await sequenceGenerationService.generateSequence(project, {
        onProgress: (status) => {
          setGenerationStatus(status);
        },
        onStageComplete: (stage, result) => {
          // Log stage completion for debugging in development only
          if (process.env.NODE_ENV === 'development') {
            console.log(`Stage ${stage} completed:`, result);
          }
        },
        onError: (error) => {
          // Log generation errors for debugging in development only
          if (process.env.NODE_ENV === 'development') {
            console.error(`Generation error at stage ${error.stage}:`, error.message);
          }
        },
        retryAttempts: 3,
        retryDelayMs: 2000,
      });

      if (results) {
        setGenerationStatus({
          stage: 'complete',
          progress: 100,
        });
        setIsGenerating(false);
        
        // Mark generation as complete in persistence
        if (project) {
          await generationStatePersistence.completeGeneration(project.id);
        }
        
        onGenerationComplete?.(results);
        return results;
      } else {
        // Generation was cancelled or failed
        setGenerationStatus({
          stage: 'idle',
          progress: 0,
        });
        setIsGenerating(false);
        
        // Mark generation as complete in persistence
        if (project) {
          await generationStatePersistence.completeGeneration(project.id);
        }
        
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
      setGenerationStatus({
        stage: 'error',
        progress: 0,
        error: errorMessage,
      });
      setIsGenerating(false);
      
      // Mark generation as complete in persistence
      if (project) {
        await generationStatePersistence.completeGeneration(project.id);
      }
      
      return null;
    }
  }, [project, validateAllShots, onGenerationComplete]);

  /**
   * Cancel ongoing generation
   * Requirements: 8.5
   */
  const cancelGeneration = useCallback(async () => {
    // Import sequence generation service dynamically
    const { sequenceGenerationService } = await import('../services/sequenceGenerationService');
    
    // Cancel the generation
    sequenceGenerationService.cancel();
    
    setIsGenerating(false);
    setGenerationStatus({
      stage: 'idle',
      progress: 0,
    });
    
    // Mark generation as complete in persistence
    if (project) {
      await generationStatePersistence.completeGeneration(project.id);
    }
  }, [project]);

  // ============================================================================
  // Selection Management
  // ============================================================================

  /**
   * Select a shot for editing
   * Requirements: 1.4
   */
  const selectShot = useCallback((shot: Shot | null) => {
    setSelectedShot(shot);
  }, []);

  // ============================================================================
  // Load project on mount if projectId provided
  // ============================================================================

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  // ============================================================================
  // Restore generation state on mount (Requirements: 10.5)
  // ============================================================================

  useEffect(() => {
    if (project) {
      // Check if there's an active generation for this project
      generationStatePersistence.loadGenerationState(project.id).then(state => {
        if (state && state.isActive) {
          // Restore generation status
          setGenerationStatus(state.status);
          setIsGenerating(true);
          
          // Log restoration for debugging in development only
          if (process.env.NODE_ENV === 'development') {
            console.log(`Restored generation state for project ${project.id}:`, state.status);
          }
        }
      }).catch(error => {
        // Log error for debugging in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to restore generation state:', error);
        }
      });
    }
  }, [project?.id]);

  // ============================================================================
  // Save generation state periodically during generation (Requirements: 10.5)
  // ============================================================================

  useEffect(() => {
    if (project && isGenerating) {
      // Start periodic state updates
      generationStatePersistence.startPeriodicUpdates(
        project.id,
        () => generationStatus
      );

      // Cleanup on unmount or when generation stops
      return () => {
        generationStatePersistence.cancelPeriodicUpdates(project.id);
      };
    }
  }, [project?.id, isGenerating, generationStatus]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: ProjectContextValue = {
    // State
    project,
    selectedShot,
    generationStatus,
    isGenerating,
    isLoading,
    isSaving,
    saveStatus,
    error,

    // Project Management
    loadProject,
    saveProject,

    // Shot Management
    updateShot,
    deleteShot,
    validateAllShots,
    getPromptCompletionStatus,

    // Dialogue Phrase Management
    addDialoguePhrase,
    updateDialoguePhrase,
    deleteDialoguePhrase,
    linkPhraseToShot,

    // Generation Management
    generateSequence,
    cancelGeneration,

    // Selection Management
    selectShot,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * useProject - Custom hook for consuming ProjectContext
 * Requirements: 1.2, 1.4, 9.3
 * 
 * @throws Error if used outside ProjectProvider
 */
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }

  return context;
}

// Export context for testing purposes
export { ProjectContext };
