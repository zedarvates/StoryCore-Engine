/**
 * useProjectExport Hook
 * 
 * React hook for exporting and importing projects with Data Contract v1 format
 */

import { useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import {
  exportProject,
  exportProjectToJSON,
  downloadProjectJSON,
  validateProjectForExport,
  importProjectFromJSON,
} from '@/services/projectExportService';
import type { Project } from '@/types';

export interface UseProjectExportReturn {
  /**
   * Export current project to Data Contract v1 format
   */
  exportCurrentProject: () => Project | null;
  
  /**
   * Export current project to JSON string
   */
  exportCurrentProjectToJSON: (pretty?: boolean) => string | null;
  
  /**
   * Download current project as JSON file
   */
  downloadCurrentProject: () => void;
  
  /**
   * Validate current project for export
   */
  validateCurrentProject: () => { valid: boolean; errors: string[] };
  
  /**
   * Import project from JSON string
   */
  importProject: (jsonString: string) => boolean;
  
  /**
   * Import project from file
   */
  importProjectFromFile: (file: File) => Promise<boolean>;
}

export function useProjectExport(): UseProjectExportReturn {
  const { project, shots, assets, setProject, setShots } = useAppStore();

  /**
   * Export current project to Data Contract v1 format
   */
  const exportCurrentProject = useCallback((): Project | null => {
    if (!project) {
      console.error('No project to export');
      return null;
    }

    const validation = validateProjectForExport(project.project_name, shots);
    if (!validation.valid) {
      console.error('Project validation failed:', validation.errors);
      return null;
    }

    return exportProject(project.project_name, shots, assets);
  }, [project, shots, assets]);

  /**
   * Export current project to JSON string
   */
  const exportCurrentProjectToJSON = useCallback((pretty: boolean = true): string | null => {
    if (!project) {
      console.error('No project to export');
      return null;
    }

    const validation = validateProjectForExport(project.project_name, shots);
    if (!validation.valid) {
      console.error('Project validation failed:', validation.errors);
      return null;
    }

    return exportProjectToJSON(project.project_name, shots, assets, pretty);
  }, [project, shots, assets]);

  /**
   * Download current project as JSON file
   */
  const downloadCurrentProject = useCallback((): void => {
    if (!project) {
      console.error('No project to download');
      return;
    }

    const validation = validateProjectForExport(project.project_name, shots);
    if (!validation.valid) {
      console.error('Project validation failed:', validation.errors);
      alert(`Cannot export project:\n${validation.errors.join('\n')}`);
      return;
    }

    downloadProjectJSON(project.project_name, shots, assets);
  }, [project, shots, assets]);

  /**
   * Validate current project for export
   */
  const validateCurrentProject = useCallback((): { valid: boolean; errors: string[] } => {
    if (!project) {
      return {
        valid: false,
        errors: ['No project loaded'],
      };
    }

    return validateProjectForExport(project.project_name, shots);
  }, [project, shots]);

  /**
   * Import project from JSON string
   */
  const importProject = useCallback((jsonString: string): boolean => {
    const importedProject = importProjectFromJSON(jsonString);
    
    if (!importedProject) {
      console.error('Failed to import project');
      return false;
    }

    // Update store with imported project
    setProject(importedProject);
    setShots(importedProject.shots);
    
    return true;
  }, [setProject, setShots]);

  /**
   * Import project from file
   */
  const importProjectFromFile = useCallback(async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      return importProject(text);
    } catch (error) {
      console.error('Failed to read project file:', error);
      return false;
    }
  }, [importProject]);

  return {
    exportCurrentProject,
    exportCurrentProjectToJSON,
    downloadCurrentProject,
    validateCurrentProject,
    importProject,
    importProjectFromFile,
  };
}
