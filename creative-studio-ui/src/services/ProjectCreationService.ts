/* cspell:ignore ProjectCreationService projectCreationService createProjectAndNavigate */
import { type ProjectCreationRequest } from './chatService';
import { useAppStore } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import { useCharacterPersistence } from '@/hooks/useCharacterPersistence';
import { useWorldPersistence } from '@/hooks/useWorldPersistence';
import type { Project as StoreProject } from '@/types';
import { generateProjectTemplate, sequencesToShots } from '@/utils/projectTemplateGenerator';
import type { SerializableProjectFormat } from '@/components/launcher/CreateProjectDialog';
import { useToast } from '@/hooks/use-toast';
import { getInitialLanguagePreference } from '@/utils/languageDetection';

// Helper function to convert Electron project to Store project format
function convertElectronProjectToStore(electronProject: any): StoreProject {
  // Extract config from Electron project
  const config = electronProject.config || {};
  
  return {
    schema_version: config.schema_version || '1.0',
    project_name: electronProject.name || config.project_name || 'Untitled Project',
    shots: config.shots || [],
    assets: config.assets || [],
    worlds: config.worlds,
    selectedWorldId: config.selectedWorldId,
    characters: config.characters,
    capabilities: config.capabilities || {
      grid_generation: true,
      promotion_engine: true,
      qa_engine: true,
      autofix_engine: true,
    },
    generation_status: config.generation_status || {
      grid: 'pending',
      promotion: 'pending',
    },
    casting: config.casting,
    metadata: {
      id: electronProject.id || Date.now().toString(),
      path: electronProject.path || '',
      version: electronProject.version || '1.0',
      created_at: electronProject.createdAt instanceof Date 
        ? electronProject.createdAt.toISOString() 
        : electronProject.createdAt || config.created_at || new Date().toISOString(),
      updated_at: electronProject.modifiedAt instanceof Date 
        ? electronProject.modifiedAt.toISOString() 
        : electronProject.modifiedAt || config.modified_at || new Date().toISOString(),
      ...config.metadata,
    },
  };
}

/**
 * ProjectCreationService
 * 
 * Centralized service for handling project creation workflows across the application.
 * Provides a unified interface for creating projects from various sources (chat, UI, etc.)
 */
export class ProjectCreationService {
  private static instance: ProjectCreationService;
  private toast: ReturnType<typeof useToast> | null = null;

  private constructor() {}

  static getInstance(): ProjectCreationService {
    if (!ProjectCreationService.instance) {
      ProjectCreationService.instance = new ProjectCreationService();
    }
    return ProjectCreationService.instance;
  }

  /**
   * Initialize the service with toast functionality
   */
  initialize(toastInstance: ReturnType<typeof useToast>) {
    this.toast = toastInstance;
  }

  /**
   * Create a project from a ProjectCreationRequest (from chat or other sources)
   */
  async createProjectFromRequest(
    request: ProjectCreationRequest,
    format?: SerializableProjectFormat
  ): Promise<{
    success: boolean;
    projectPath?: string;
    error?: string;
    project?: StoreProject;
  }> {
    const language = getInitialLanguagePreference();
    
    try {
      // Generate project template if format is provided
      let initialShots: any[] = [];
      if (format) {
        const template = generateProjectTemplate(format);
        initialShots = sequencesToShots(template.sequences);
      }

      // Prepare project data with theme/universe metadata
      const projectData = {
        name: request.name,
        format: format,
        theme: request.theme,
        universe: request.universe,
        genre: request.genre,
        description: request.description,
        initialShots: initialShots,
        settings: {
          created_by: 'llm-assistant',
          creation_timestamp: new Date().toISOString(),
          ...request.settings,
        },
      };

      // Create project via Electron API
      if (window.electronAPI?.project?.create) {
        const electronProject = await window.electronAPI.project.create(projectData);
        
        // Convert to Store format
        const storeProject = convertElectronProjectToStore(electronProject);
        
        // Load into stores
        await this.loadProjectIntoStores(storeProject, electronProject.path);
        
        // Show success message
        this.showSuccessMessage(request.name, language);
        
        return {
          success: true,
          projectPath: electronProject.path,
          project: storeProject,
        };
      } else {
        // Demo mode - simulate creation
        const demoProject: StoreProject = {
          schema_version: '1.0',
          project_name: request.name,
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
            path: `demo-projects/${request.name}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            theme: request.theme,
            universe: request.universe,
            genre: request.genre,
            description: request.description,
            format: format,
            created_by: 'llm-assistant',
            creation_timestamp: new Date().toISOString(),
            ...request.settings,
          },
        };

        // Load into stores
        await this.loadProjectIntoStores(demoProject, demoProject.metadata.path);
        
        // Show success message
        this.showSuccessMessage(request.name, language);
        
        return {
          success: true,
          projectPath: demoProject.metadata.path,
          project: demoProject,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showErrorMessage(request.name, errorMessage, language);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Load a project into the application stores
   */
  private async loadProjectIntoStores(project: StoreProject, projectPath: string): Promise<void> {
    // Get store actions
    const setProject = useAppStore.getState().setProject;
    const setShots = useAppStore.getState().setShots;
    
    // Load the project into the store
    setProject(project);
    setShots(project.shots || []);
    
    // Set project path in editor store so persistence hooks can use it
    useEditorStore.getState().setProjectPath(projectPath);
    
    // Sync characters from project directory to store
    const { loadAndSyncCharacters } = useCharacterPersistence();
    await loadAndSyncCharacters();
    
    // Sync worlds from project directory to store
    const { syncWorldsFromProject } = useWorldPersistence();
    await syncWorldsFromProject();
    
    // Reload recent projects
    if (window.electronAPI?.recentProjects?.get) {
      try {
        const recentProjects = await window.electronAPI.recentProjects.get();
        // Update recent projects list if needed
      } catch (error) {
        console.error('Failed to reload recent projects:', error);
      }
    }
  }

  /**
   * Navigate to project dashboard after successful creation
   */
  navigateToProjectDashboard(projectPath: string): void {
    try {
      // Encode the project path for URL safety
      const encodedPath = encodeURIComponent(projectPath);
      
      // Navigate to the project dashboard
      window.location.href = `/project/${encodedPath}`;
    } catch (error) {
      console.error('Failed to navigate to project dashboard:', error);
      // Fallback: reload the page to show the new project
      window.location.reload();
    }
  }

  /**
   * Complete project creation workflow: create project and navigate to dashboard
   */
  async createProjectAndNavigate(
    request: ProjectCreationRequest,
    format?: SerializableProjectFormat
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Execute project creation
    const result = await this.createProjectFromRequest(request, format);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Navigate to the dashboard
    if (result.projectPath) {
      this.navigateToProjectDashboard(result.projectPath);
    }

    return {
      success: true,
    };
  }

  /**
   * Show success message based on language
   */
  private showSuccessMessage(projectName: string, language: string): void {
    if (!this.toast) return;

    const message = language === 'fr'
      ? `Projet "${projectName}" créé avec succès !`
      : `Project "${projectName}" created successfully!`;

    this.toast({
      title: language === 'fr' ? "Création réussie" : "Creation Successful",
      description: message,
    });
  }

  /**
   * Show error message based on language
   */
  private showErrorMessage(projectName: string, error: string, language: string): void {
    if (!this.toast) return;

    const message = language === 'fr'
      ? `Impossible de créer le projet "${projectName}". ${error}`
      : `Failed to create project "${projectName}". ${error}`;

    this.toast({
      variant: "destructive",
      title: language === 'fr' ? "Erreur de création" : "Creation Error",
      description: message,
    });
  }

  /**
   * Validate project creation request
   */
  validateProjectRequest(request: ProjectCreationRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate project name
    if (!request.name || request.name.trim().length === 0) {
      errors.push('Project name is required');
    }

    // Validate project name format
    if (request.name && request.name.length > 100) {
      errors.push('Project name must be less than 100 characters');
    }

    // Validate theme format
    if (request.theme && request.theme.length > 50) {
      errors.push('Theme must be less than 50 characters');
    }

    // Validate universe format
    if (request.universe && request.universe.length > 100) {
      errors.push('Universe must be less than 100 characters');
    }

    // Validate genre format
    if (request.genre && request.genre.length > 50) {
      errors.push('Genre must be less than 50 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a suggested project name based on theme and genre
   */
  generateSuggestedName(theme?: string, genre?: string, universe?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (theme && genre) {
      return `${theme.charAt(0).toUpperCase() + theme.slice(1)} ${genre.charAt(0).toUpperCase() + genre.slice(1)} ${timestamp}`;
    } else if (theme) {
      return `${theme.charAt(0).toUpperCase() + theme.slice(1)} Project ${timestamp}`;
    } else if (genre) {
      return `${genre.charAt(0).toUpperCase() + genre.slice(1)} Story ${timestamp}`;
    } else if (universe) {
      return `${universe.charAt(0).toUpperCase() + universe.slice(1)} ${timestamp}`;
    }
    
    return `Project ${timestamp}`;
  }

  /**
   * Get available project formats
   */
  getAvailableFormats(): SerializableProjectFormat[] {
    // This would typically come from a configuration or API
    // For now, return some default formats
    return [
      {
        id: 'short-film',
        name: 'Short Film',
        duration: '5-15 min',
        durationMinutes: 15,
        sequences: 3,
        shotDuration: 300,
        iconType: 'film',
        description: 'A short film project with 3-5 scenes',
      },
      {
        id: 'trailer',
        name: 'Trailer',
        duration: '2-3 min',
        durationMinutes: 3,
        sequences: 5,
        shotDuration: 180,
        iconType: 'video',
        description: 'A movie trailer with 5-8 sequences',
      },
      {
        id: 'music-video',
        name: 'Music Video',
        duration: '3-4 min',
        durationMinutes: 4,
        sequences: 4,
        shotDuration: 240,
        iconType: 'video',
        description: 'A music video with 4-6 sequences',
      },
    ];
  }

  /**
   * Get recommended format based on project characteristics
   */
  getRecommendedFormat(theme?: string, genre?: string, universe?: string): SerializableProjectFormat | null {
    const formats = this.getAvailableFormats();
    
    // Simple recommendation logic based on genre
    if (genre) {
      const lowerGenre = genre.toLowerCase();
      if (lowerGenre.includes('action') || lowerGenre.includes('thriller')) {
        return formats.find(f => f.id === 'trailer') || formats[0];
      } else if (lowerGenre.includes('music') || lowerGenre.includes('song')) {
        return formats.find(f => f.id === 'music-video') || formats[0];
      }
    }
    
    // Default to short film
    return formats.find(f => f.id === 'short-film') || formats[0];
  }
}

// Export singleton instance
export const projectCreationService = ProjectCreationService.getInstance();