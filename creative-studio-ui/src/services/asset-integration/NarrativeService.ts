import { NarrativeText } from '../../types/asset-integration';

/**
 * Callback type for narrative updates
 */
export type NarrativeUpdateCallback = (path: string, narrative: NarrativeText) => void;

/**
 * Callback type for cache updates
 */
export type NarrativeCacheUpdateCallback = (cacheCleared: boolean) => void;

/**
 * Narrative Service with Observer pattern for real-time synchronization
 */
export class NarrativeService {
  private static instance: NarrativeService;
  private cache: Map<string, NarrativeText> = new Map();
  
  // Subscribers for different events
  private narrativeUpdateSubscribers: Set<NarrativeUpdateCallback> = new Set();
  private cacheUpdateSubscribers: Set<NarrativeCacheUpdateCallback> = new Set();

  private constructor() {
    console.log('[NarrativeService] Service initialized with Observer pattern');
  }

  static getInstance(): NarrativeService {
    if (!NarrativeService.instance) {
      NarrativeService.instance = new NarrativeService();
    }
    return NarrativeService.instance;
  }

  /**
   * Subscribe to narrative updates
   * Returns unsubscribe function
   */
  public subscribeToNarrativeUpdates(callback: NarrativeUpdateCallback): () => void {
    this.narrativeUpdateSubscribers.add(callback);
    return () => {
      this.narrativeUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to cache updates
   * Returns unsubscribe function
   */
  public subscribeToCacheUpdates(callback: NarrativeCacheUpdateCallback): () => void {
    this.cacheUpdateSubscribers.add(callback);
    return () => {
      this.cacheUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of narrative update
   */
  private notifyNarrativeUpdate(path: string, narrative: NarrativeText): void {
    this.narrativeUpdateSubscribers.forEach(callback => {
      try {
        callback(path, narrative);
      } catch (error) {
        console.error('[NarrativeService] Error in narrative update subscriber:', error);
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
        console.error('[NarrativeService] Error in cache update subscriber:', error);
      }
    });
  }

  async loadNarrativeText(path: string): Promise<NarrativeText> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load narrative text: ${response.statusText}`);
      }
      const content: string = await response.text();

      // Create NarrativeText object from content
      const narrativeText: NarrativeText = {
        id: this.generateId(path),
        title: this.extractTitleFromPath(path),
        content: content,
        type: this.inferTypeFromPath(path),
        related_project: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.cache.set(path, narrativeText);
      
      // Notify subscribers
      this.notifyNarrativeUpdate(path, narrativeText);
      
      return narrativeText;
    } catch (error) {
      console.error('Error loading narrative text:', error);
      throw error;
    }
  }

  async saveNarrativeText(narrative: NarrativeText, path: string): Promise<void> {
    try {
      narrative.updated_at = new Date().toISOString();

      // Update cache
      this.cache.set(path, narrative);
      
      // Notify subscribers
      this.notifyNarrativeUpdate(path, narrative);

      // Simulate save - requires Electron API
      throw new Error('Save functionality requires Electron API integration');
    } catch (error) {
      console.error('Error saving narrative text:', error);
      throw error;
    }
  }

  async listAvailableNarratives(): Promise<string[]> {
    // Return predefined paths for narrative text files
    // In production, this would scan a directory for .txt files
    return [
      // Assuming some narrative text files exist
      // '/data/narrative/plot_outline.txt',
      // '/data/narrative/character_bios.txt'
    ];
  }

  createNewNarrative(title: string, type: NarrativeText['type'] = 'notes'): NarrativeText {
    return {
      id: `narrative_${Date.now()}`,
      title: title,
      content: '',
      type: type,
      related_project: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  updateNarrativeContent(narrative: NarrativeText, newContent: string): NarrativeText {
    return {
      ...narrative,
      content: newContent,
      updated_at: new Date().toISOString()
    };
  }

  private generateId(path: string): string {
    return `narrative_${btoa(path).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  private extractTitleFromPath(path: string): string {
    const fileName = path.split('/').pop() || 'Untitled';
    return fileName.replace(/\.(txt|md)$/, '').replace(/_/g, ' ');
  }

  private inferTypeFromPath(path: string): NarrativeText['type'] {
    const fileName = path.toLowerCase();
    if (fileName.includes('plot')) return 'plot_outline';
    if (fileName.includes('character') || fileName.includes('bio')) return 'character_bio';
    if (fileName.includes('dialogue')) return 'dialogue_script';
    return 'notes';
  }

  clearCache(): void {
    this.cache.clear();
    
    // Notify subscribers
    this.notifyCacheUpdate(true);
  }
}