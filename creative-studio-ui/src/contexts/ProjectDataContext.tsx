/**
 * ProjectDataContext - Core project data and persistence management
 * 
 * Responsibility: Core project CRUD operations and persistence
 * Part of ProjectContext split (see docs/PROJECTCONTEXT_ANALYSIS.md)
 * 
 * State Variables:
 * - project: Main project data
 * - isLoading: Project loading state
 * - isSaving: Project saving state
 * - saveStatus: Save operation status ('idle' | 'saving' | 'saved' | 'error')
 * - error: Error messages
 * 
 * Callback Functions:
 * - loadProject(projectId): Load project from persistence
 * - saveProject(): Save project to persistence
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Project } from '../types';
import { projectPersistence } from '../services/persistence/projectPersistence';

interface ProjectDataContextType {
  project: Project | null;
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  error: string | null;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
}

const ProjectDataContext = createContext<ProjectDataContextType | undefined>(undefined);

export const ProjectDataProvider: React.FC<{ 
  children: React.ReactNode; 
  projectId?: string 
}> = ({
  children,
  projectId: initialProjectId
}) => {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await projectPersistence.loadProject(projectId);
      if (result.success && result.project) {
        setProject(result.project);
        setSaveStatus('idle');
      } else {
        setError(result.error?.message || 'Failed to load project');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveProject = useCallback(async () => {
    if (!project) return;
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await projectPersistence.saveProject(project);
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      setError(e instanceof Error ? e.message : 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  }, [project]);

  useEffect(() => {
    if (initialProjectId) {
      loadProject(initialProjectId);
    }
  }, [initialProjectId, loadProject]);

  return (
    <ProjectDataContext.Provider value={{
      project,
      isLoading,
      isSaving,
      saveStatus,
      error,
      loadProject,
      saveProject
    }}>
      {children}
    </ProjectDataContext.Provider>
  );
};

export const useProjectData = () => {
  const context = useContext(ProjectDataContext);
  if (!context) {
    throw new Error('useProjectData must be used within a ProjectDataProvider');
  }
  return context;
};
