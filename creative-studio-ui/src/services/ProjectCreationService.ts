/* cspell:ignore ProjectCreationService projectCreationService createProjectAndNavigate */
import { type ProjectCreationRequest } from './chatService';
import { useAppStore } from '@/stores/useAppStore';
import { useStore } from '@/store';
import { useEditorStore } from '@/stores/editorStore';
import type { Project as StoreProject } from '@/types';
import { generateProjectTemplate, sequencesToShots } from '@/utils/projectTemplateGenerator';
import type { SerializableProjectFormat } from '@/components/launcher/CreateProjectDialog';
import { useToast } from '@/hooks/use-toast';
import { getInitialLanguagePreference } from '@/utils/languageDetection';
import type { Shot, SequencePlan, Character, StoryObject, Story, StoryVersion } from '@/types';
import type { World } from '@/types/world';
import type { Location as ProductionLocation } from '@/types/location';
import type { GeneratedSequence } from '@/utils/projectTemplateGenerator';
import { persistenceService } from './PersistenceService';

// Helper function to convert Electron project to Store project format
export function convertElectronProjectToStore(electronProject: {
  id?: string;
  name?: string;
  path?: string;
  version?: string;
  createdAt?: Date | string | number;
  modifiedAt?: Date | string | number;
  config?: Record<string, unknown>;
}): StoreProject {
  // Extract config from Electron project
  const config = electronProject.config || {};
  
  // Cast arrays loaded from disk (via ProjectService.openProject)
  const characters = (config.characters as Character[]) || [];
  const locations = (config.locations as ProductionLocation[]) || [];
  const objects = (config.objects as StoryObject[]) || [];
  const sequencePlans = (config.sequencePlans as unknown[]) as import('@/types').SequencePlan[] || [];
  const stories = (config.stories as Story[]) || [];
  const storyVersions = (config.storyVersions as StoryVersion[]) || [];
  const worlds = (config.worlds as World[]) || [];

  // Deduplicate helper
  const deduplicateById = <T extends { id?: string; character_id?: string; location_id?: string }>(arr: T[], idField: keyof T = 'id'): T[] => {
    return arr.filter((item, index, self) => 
      index === self.findIndex((t) => t[idField] === item[idField])
    );
  };

  return {
    id: electronProject.id || Date.now().toString(),
    schema_version: (config.schema_version as string) || '1.0',
    project_name: electronProject.name || (config.project_name as string) || 'Untitled Project',
    path: electronProject.path || (config.path as string) || '',
    shots: deduplicateById((config.shots as Shot[]) || []),
    assets: (config.assets as StoreProject['assets']) || [],
    worlds: worlds.length > 0 ? worlds : undefined,
    stories: stories.length > 0 ? stories : undefined,
    storyVersions: storyVersions.length > 0 ? storyVersions : undefined,
    selectedWorldId: config.selectedWorldId as string | undefined,
    characters: characters.length > 0 ? deduplicateById(characters, 'character_id') : undefined,
    objects: objects.length > 0 ? deduplicateById(objects) : undefined,
    locations: locations.length > 0 ? deduplicateById(locations, 'location_id') : undefined,
    sequencePlans: sequencePlans.length > 0 ? deduplicateById(sequencePlans) : undefined,
    projectSetup: config.projectSetup as StoreProject['projectSetup'],
    capabilities: (config.capabilities as StoreProject['capabilities']) || {
      grid_generation: true,
      promotion_engine: true,
      qa_engine: true,
      autofix_engine: true,
    },
    generation_status: (config.generation_status as StoreProject['generation_status']) || {
      grid: 'pending',
      promotion: 'pending',
    },
    casting: config.casting as StoreProject['casting'],
    global_resume: config.global_resume as string,
    metadata: {
      id: electronProject.id || Date.now().toString(),
      path: electronProject.path || (config.path as string) || '',
      version: electronProject.version || '1.0',
      created_at: electronProject.createdAt instanceof Date 
        ? electronProject.createdAt.toISOString() 
        : typeof electronProject.createdAt === 'number' 
          ? new Date(electronProject.createdAt).toISOString()
          : electronProject.createdAt || (config.created_at as string) || new Date().toISOString(),
      updated_at: electronProject.modifiedAt instanceof Date 
        ? electronProject.modifiedAt.toISOString() 
        : typeof electronProject.modifiedAt === 'number'
          ? new Date(electronProject.modifiedAt).toISOString()
          : electronProject.modifiedAt || (config.modified_at as string) || new Date().toISOString(),
      ...(config.metadata as Record<string, unknown>),
      sequences: sequencePlans,
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
      // Resolve format if formatId is provided in request
      let effectiveFormat = format;
      if (!effectiveFormat && request.formatId) {
        const availableFormats = this.getAvailableFormats();
        effectiveFormat = availableFormats.find(f => f.id === request.formatId);
        console.log(`ProjectCreationService: Resolved format ${request.formatId} to`, effectiveFormat);
      }

      // Generate project template if format is available
      let initialShots: Shot[] = [];
      let initialSequences: GeneratedSequence[] = [];
      if (effectiveFormat) {
        // Extract track titles from user description if music-album
        const trackTitles: string[] = [];
        if (effectiveFormat.id === 'music-album' && request.description) {
          // 1. First try quoted titles (Requirement: 4.5)
          const titlePattern = /"(.+?)"|'(.+?)'|\u00ab(.+?)\u00bb/g;
          let m: RegExpExecArray | null;
          while ((m = titlePattern.exec(request.description)) !== null) {
            const t = (m[1] || m[2] || m[3]).trim();
            if (t.length > 0 && t.length < 80) trackTitles.push(t);
          }

          // 2. If no quoted titles found, try to look for comma separated list after a colon (e.g. "Titres: A, B, C")
          if (trackTitles.length === 0) {
            const colonListPattern = /(?:titres|tracks|songs|titles|tracklist|liste)\s*:\s*([^.!?\n]+)/i;
            const match = colonListPattern.exec(request.description);
            if (match && match[1]) {
              const items = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0 && s.length < 80);
              trackTitles.push(...items);
            }
          }

          // 3. Fallback for album: if still empty, ensure we have at least generic tracks if none were found
          if (trackTitles.length === 0) {
            for (let i = 1; i <= 13; i++) trackTitles.push(`Track ${i}`);
          }
        }
        const template = generateProjectTemplate(effectiveFormat, { trackTitles });
        initialSequences = template.sequences;
        
        // Ensure minimum 4s duration per sequence/shot as requested by user
        initialSequences = initialSequences.map(s => ({
          ...s,
          duration: Math.max(s.duration, 4),
          shots: s.shots.map(sh => ({ ...sh, duration: Math.max(sh.duration, 4) }))
        }));
        
        initialShots = sequencesToShots(initialSequences);
      }

      // Prepare project data with theme/universe metadata
      const projectData = {
        name: request.name,
        format: format ? {
          aspectRatio: '16:9',
          resolution: '1920x1080',
          frameRate: 24,
          colorSpace: 'sRGB'
        } : undefined,
        theme: request.theme,
        universe: request.universe,
        genre: request.genre,
        description: request.description,
        initialShots: initialShots,
        initialSequences: request.initialEntities?.sequences || initialSequences,
        initialCharacters: request.initialEntities?.characters || (effectiveFormat?.id === 'music-album' ? [{
          character_id: 'char_main_artist_001',
          name: 'Main Artist / DJ',
          creation_method: 'auto_generated',
          creation_timestamp: Date.now(),
          version: '1.0',
          role: {
            archetype: 'hero',
            narrative_function: 'protagonist',
            character_arc: 'positive'
          },
          description: 'The primary artist of this album project.',
          visual_identity: {
            hair_color: 'black',
            hair_style: 'modern',
            hair_length: 'short',
            eye_color: 'brown',
            eye_shape: 'almond',
            skin_tone: 'tan',
            facial_structure: 'defined',
            distinctive_features: [],
            appearance: 'Professional artist with a futuristic vibe.',
            traits: ['creative', 'focused'],
            colors: ['#00ffff', '#ff00ff'],
            age_range: 'adult',
            gender: 'unspecified',
            height: 'average',
            build: 'slim',
            posture: 'upright',
            clothing_style: 'futuristic',
            color_palette: ['#00ffff', '#ff00ff'],
            reference_images: [],
            reference_sheet_images: [],
          },
          personality: {
            traits: ['creative', 'focused'],
            values: [],
            fears: [],
            desires: [],
            flaws: [],
            strengths: [],
            temperament: '',
            communication_style: '',
          },
          background: {
            origin: '',
            occupation: 'DJ / Artist',
            education: '',
            family: '',
            significant_events: [],
            current_situation: '',
          },
          relationships: [],
          metadata: { created_by: 'smart-starter' }
        } as unknown as Character] : []),
        initialLocations: request.initialEntities?.locations || (effectiveFormat?.id === 'music-album' ? [{
          location_id: 'loc_studio_001',
          name: 'Recording Studio (Interior)',
          location_type: 'interior' as const,
          creation_method: 'auto_generated',
          creation_timestamp: Date.now(),
          version: '1.0',
          texture_direction: 'inward',
          metadata: { 
            description: 'A high-tech recording studio with neon lighting and acoustic treatment.', 
            atmosphere: 'creative, focused', 
            genre_tags: ['tech', 'music'] 
          },
          cube_textures: {},
          placed_assets: [],
          is_world_derived: false
        }, {
          location_id: 'loc_exterior_001',
          name: 'Champs de Mars / Tour Eiffel (Exterior)',
          location_type: 'exterior' as const,
          creation_method: 'auto_generated',
          creation_timestamp: Date.now(),
          version: '1.0',
          texture_direction: 'outward',
          metadata: { 
            description: 'An iconic exterior location in Paris, perfectly suited for a futuristic music video.', 
            atmosphere: 'grand, iconic', 
            genre_tags: ['paris', 'futuristic'] 
          },
          cube_textures: {},
          placed_assets: [],
          is_world_derived: false
        }] as unknown as ProductionLocation[] : []),
        initialObjects: request.initialEntities?.objects || (effectiveFormat?.id === 'music-album' ? [{
          id: 'obj_dj_rig_001',
          name: 'Pro DJ Rig',
          type: 'equipment',
          description: 'State-of-the-art DJ turntable and mixing console.',
          metadata: { usage: 'performance', importance: 'high' }
        } as unknown as StoryObject] : []),
        discussion: request.discussion,
        settings: {
          created_by: 'llm-assistant',
          creation_timestamp: new Date().toISOString(),
          ...request.settings,
        },
      };

      // Create project via Electron API
      console.log('ProjectCreationService: Requesting project creation via Electron IPC...', projectData);
      
      const api = window.electronAPI;
      if (api?.project?.create) {
        try {
          const electronProject = await api.project.create(projectData);
          console.log('ProjectCreationService: Electron project created successfully:', electronProject);
          
          // Convert to Store format - use data from Electron project
          const storeProject = convertElectronProjectToStore(electronProject);
        
        // Load into stores (pass sequences for proper structure)
        await this.loadProjectIntoStores(storeProject, electronProject.path, initialSequences);
        
        // Show success message
        this.showSuccessMessage(request.name, language);
        
        return {
          success: true,
          projectPath: electronProject.path,
          project: storeProject,
        };
      } catch (error) {
        console.error('ProjectCreationService: Electron project creation failed:', error);
        throw error;
      }
    } else {
      // Demo mode - simulate creation
      const demoProjectId = Date.now().toString();
      const demoProjectPath = `demo-projects/${request.name}`;
      const demoProject: StoreProject = {
          id: demoProjectId,
          schema_version: '1.0',
          project_name: request.name,
          path: demoProjectPath,
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
          characters: request.initialEntities?.characters || [],
          worlds: (request.initialEntities?.locations && request.initialEntities.locations.length > 0) ? [{ 
            id: 'world_default', 
            name: 'Default World', 
            locations: request.initialEntities.locations,
            genre: [request.genre || 'Various'],
            timePeriod: 'Present',
            tone: ['Neutral'],
            rules: [],
            lore: '',
            atmosphere: 'Neutral',
            culturalElements: {
              languages: [],
              religions: [],
              traditions: [],
              historicalEvents: [],
              culturalConflicts: [],
            },
            technology: '',
            magic: '',
            conflicts: [],
            keyObjects: [],
            visualIntent: {
              colors: [],
              vibe: '',
              style: '',
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as unknown as World] : [],
          objects: request.initialEntities?.objects || [],
          metadata: {
            id: demoProjectId,
            path: demoProjectPath,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            theme: request.theme,
            universe: request.universe,
            genre: request.genre,
            description: request.description,
            format: effectiveFormat,
            created_by: 'llm-assistant',
            creation_timestamp: new Date().toISOString(),
            ...request.settings,
          },
        };

        // Load into stores (pass sequences for proper structure)
        await this.loadProjectIntoStores(demoProject, demoProjectPath, initialSequences);
        
        // Show success message
        this.showSuccessMessage(request.name, language);
        
        return {
          success: true,
          projectPath: demoProjectPath,
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

  public async loadProjectIntoStores(project: StoreProject, projectPath: string, sequences?: (GeneratedSequence | SequencePlan)[]): Promise<void> {
    // Get store actions
    const setProject = useAppStore.getState().setProject;
    const setShots = useAppStore.getState().setShots;

    // Load the project into useAppStore
    setProject(project);
    setShots(project.shots || []);

    // Also load into the main useStore to ensure all entities are synced
    // useStore.setProject handles characters, stories, worlds, etc.
    const mainStore = useStore.getState();
    const projectWithPlans = {
      ...project,
      sequencePlans: sequences || project.sequencePlans || []
    } as StoreProject & { sequencePlans: SequencePlan[] };
    
    mainStore.setProject(projectWithPlans);

    console.log('ProjectCreationService: Loaded project into both AppStore and main Store');

    // Set project path in editor store so persistence hooks can use it
    useEditorStore.getState().setProjectPath(projectPath);

    // Initial clean up and discussion load
    persistenceService.loadDiscussionIntoChat(projectPath).catch(e => console.error('Failed to load discussion:', e));
    persistenceService.cleanupCharacterFolders(projectPath).catch(e => console.error('Failed to cleanup characters:', e));


    // Reload recent projects
    if (window.electronAPI?.recentProjects?.get) {
      try {
        const _recentProjects = await window.electronAPI.recentProjects.get();
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
      
      // Attempt to use React Router if available (via import)
      // We do a dynamic import to avoid circular dependencies if any
      import('@/router').then(({ router }) => {
        router.navigate(`/project/${encodedPath}`);
      }).catch(err => {
        console.error('Failed to load router for navigation:', err);
        window.location.href = `/project/${encodedPath}`;
      });
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

    this.toast.toast({
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

    this.toast.toast({
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
      {
        id: 'music-album',
        name: 'Music Album',
        duration: '40-60 min',
        durationMinutes: 60,
        sequences: 13,
        shotDuration: 300,
        iconType: 'video',
        description: 'A music album with 13 tracks and cohesive ambience',
      },
    ];
  }

  /**
   * Get recommended format based on project characteristics
   */
  getRecommendedFormat(_theme?: string, genre?: string, _universe?: string): SerializableProjectFormat | null {
    const formats = this.getAvailableFormats();
    
    // Simple recommendation logic based on genre
    if (genre) {
      const lowerGenre = genre.toLowerCase();
      if (lowerGenre.includes('action') || lowerGenre.includes('thriller')) {
        return formats.find(f => f.id === 'trailer') || formats[0];
      } else if (lowerGenre.includes('music') || lowerGenre.includes('song')) {
        return formats.find(f => f.id === 'music-video') || formats[0];
      } else if (lowerGenre.includes('album') || lowerGenre.includes('collection')) {
        return formats.find(f => f.id === 'music-album') || formats[0];
      }
    }
    
    // Default to short film
    return formats.find(f => f.id === 'short-film') || formats[0];
  }
}

// Export singleton instance
export const projectCreationService = ProjectCreationService.getInstance();