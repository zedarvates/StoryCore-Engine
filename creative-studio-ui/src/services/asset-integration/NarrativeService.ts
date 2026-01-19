import { NarrativeText } from '../../types/asset-integration';

export class NarrativeService {
  private static instance: NarrativeService;
  private cache: Map<string, NarrativeText> = new Map();

  static getInstance(): NarrativeService {
    if (!NarrativeService.instance) {
      NarrativeService.instance = new NarrativeService();
    }
    return NarrativeService.instance;
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
      return narrativeText;
    } catch (error) {
      console.error('Error loading narrative text:', error);
      throw error;
    }
  }

  async saveNarrativeText(narrative: NarrativeText, path: string): Promise<void> {
    try {
      narrative.updated_at = new Date().toISOString();

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
  }
}