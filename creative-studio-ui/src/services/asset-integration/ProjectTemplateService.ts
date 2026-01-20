import { ProjectTemplate } from '../../types/asset-integration';

/**
 * Callback type for template updates
 */
export type TemplateUpdateCallback = (path: string, template: ProjectTemplate) => void;

/**
 * Callback type for cache updates
 */
export type TemplateCacheUpdateCallback = (cacheCleared: boolean) => void;

/**
 * Project Template Service with Observer pattern for real-time synchronization
 */
export class ProjectTemplateService {
  private static instance: ProjectTemplateService;
  private cache: Map<string, ProjectTemplate> = new Map();
  
  // Subscribers for different events
  private templateUpdateSubscribers: Set<TemplateUpdateCallback> = new Set();
  private cacheUpdateSubscribers: Set<TemplateCacheUpdateCallback> = new Set();

  private constructor() {
    console.log('[ProjectTemplateService] Service initialized with Observer pattern');
  }

  static getInstance(): ProjectTemplateService {
    if (!ProjectTemplateService.instance) {
      ProjectTemplateService.instance = new ProjectTemplateService();
    }
    return ProjectTemplateService.instance;
  }

  /**
   * Subscribe to template updates
   * Returns unsubscribe function
   */
  public subscribeToTemplateUpdates(callback: TemplateUpdateCallback): () => void {
    this.templateUpdateSubscribers.add(callback);
    return () => {
      this.templateUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to cache updates
   * Returns unsubscribe function
   */
  public subscribeToCacheUpdates(callback: TemplateCacheUpdateCallback): () => void {
    this.cacheUpdateSubscribers.add(callback);
    return () => {
      this.cacheUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of template update
   */
  private notifyTemplateUpdate(path: string, template: ProjectTemplate): void {
    this.templateUpdateSubscribers.forEach(callback => {
      try {
        callback(path, template);
      } catch (error) {
        console.error('[ProjectTemplateService] Error in template update subscriber:', error);
      }
    });
  }

  /**
   * Notify subscribers of cache update
   */
  private notifyCacheUpdate(cacheCleared: boolean): void {
    this.cacheUpdateSubscribers.forEach(callback => {
      try {
        callback(cacheCleared);
      } catch (error) {
        console.error('[ProjectTemplateService] Error in cache update subscriber:', error);
      }
    });
  }

  async loadProjectTemplate(path: string): Promise<ProjectTemplate> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load project template: ${response.statusText}`);
      }
      const data: ProjectTemplate = await response.json();

      // Basic validation
      if (!data.project || !data.project.id) {
        throw new Error('Invalid project template structure');
      }

      this.cache.set(path, data);
      
      // Notify subscribers
      this.notifyTemplateUpdate(path, data);
      
      return data;
    } catch (error) {
      console.error('Error loading project template:', error);
      throw error;
    }
  }

  async saveProjectTemplate(template: ProjectTemplate, path: string): Promise<void> {
    try {
      // Update timestamps
      template.project.updated_at = new Date().toISOString();

      // Update cache
      this.cache.set(path, template);
      
      // Notify subscribers
      this.notifyTemplateUpdate(path, template);

      // In a real implementation, this would use Electron API to save to file
      // For now, we'll simulate with localStorage or throw an error
      throw new Error('Save functionality requires Electron API integration');

      // Future implementation:
      // await window.electronAPI.saveFile(path, JSON.stringify(template, null, 2));
    } catch (error) {
      console.error('Error saving project template:', error);
      throw error;
    }
  }

  async listAvailableTemplates(): Promise<string[]> {
    // Note: Files must be in public/ folder to be accessible
    // For now, return empty array to avoid errors
    // TODO: Implement proper file system access via Electron API
    return [];
  }

  async createNewTemplate(baseTemplate?: ProjectTemplate): Promise<ProjectTemplate> {
    const newTemplate: ProjectTemplate = baseTemplate ? { ...baseTemplate } : {
      project: {
        id: `template_${Date.now()}`,
        name: 'New Project Template',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: 'A new project template',
        format: {
          type: 'standard_feature',
          duration_range: { min_minutes: 60, max_minutes: 120 },
          specifications: {
            aspect_ratio: '16:9',
            frame_rate: 24,
            resolution: '1920x1080',
            audio_channels: '5.1'
          },
          available_formats: {}
        },
        genres: [],
        available_genres: ['Action', 'Drama', 'Comedy'],
        metadata: {
          director: '',
          producer: '',
          writer: '',
          budget: 0,
          target_audience: '',
          language: 'English',
          country: '',
          release_year: null,
          production_company: '',
          distribution_company: ''
        },
        narrative: {
          plot_outline: '',
          logline: '',
          themes: [],
          tone: '',
          setting: { time_period: '', locations: [] },
          characters: [],
          acts: [
            { act_number: 1, description: '', duration_estimate: 20 },
            { act_number: 2, description: '', duration_estimate: 60 },
            { act_number: 3, description: '', duration_estimate: 20 }
          ]
        },
        custom_fields: {},
        documentation: {
          usage: '',
          extensibility: '',
          version_history: [{ version: '1.0.0', changes: 'Initial creation' }]
        }
      }
    };

    if (baseTemplate) {
      newTemplate.project.id = `template_${Date.now()}`;
      newTemplate.project.name = `${baseTemplate.project.name} (Copy)`;
      newTemplate.project.created_at = new Date().toISOString();
      newTemplate.project.updated_at = new Date().toISOString();
    }

    return newTemplate;
  }

  clearCache(): void {
    this.cache.clear();
    
    // Notify subscribers
    this.notifyCacheUpdate(true);
  }
}