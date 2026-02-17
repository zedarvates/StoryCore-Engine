// ============================================================================
// Comic to Sequence Converter Implementation
// ============================================================================

import type {
  ComicPanel,
  ComicPage,
  ComicProject,
  ConversionSettings,
  SequenceResult,
  ComicConversionOperation,
  ComicConversionState,
} from './types';

export class ComicToSequenceConverter {
  private projects: Record<string, ComicProject> = {};
  private results: Record<string, SequenceResult> = {};
  private history: ComicConversionOperation[] = [];
  private readonly MAX_HISTORY_SIZE = 20;

  /**
   * Load a comic from file
   */
  async loadComic(file: File): Promise<ComicProject> {
    // In a real implementation, this would parse the comic file
    const project: ComicProject = {
      id: crypto.randomUUID(),
      name: file.name,
      pages: [],
      metadata: {
        format: this.getFileExtension(file.name),
        pageCount: 0,
        dimensions: { width: 0, height: 0 },
      },
    };

    this.projects[project.id] = project;
    this.recordOperation('load', `Loaded comic: ${file.name}`, project.id);

    return project;
  }

  /**
   * Convert comic to sequence
   */
  async convertToSequence(comicId: string, settings: ConversionSettings): Promise<SequenceResult> {
    const project = this.projects[comicId];
    if (!project) {
      throw new Error(`Comic project ${comicId} not found`);
    }

    // In a real implementation, this would process the comic pages and panels
    const result: SequenceResult = {
      comicId,
      settings,
      sequences: [],
      shots: [],
      metadata: {
        panelCount: project.pages.reduce((sum, page) => sum + page.panels.length, 0),
        sequenceCount: project.pages.length,
        duration: project.pages.length * settings.panelDuration,
      },
    };

    this.results[result.comicId] = result;
    this.recordOperation('convert', `Converted comic to sequence: ${project.name}`, comicId, result.comicId);

    return result;
  }

  /**
   * Export sequence result
   */
  async exportSequence(result: SequenceResult): Promise<Blob> {
    // In a real implementation, this would export the sequence data
    return new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
  }

  /**
   * Get a comic project by ID
   */
  getProject(comicId: string): ComicProject | undefined {
    return this.projects[comicId];
  }

  /**
   * Get panels from a specific page
   */
  getPanels(comicId: string, pageIndex: number): ComicPanel[] {
    const project = this.projects[comicId];
    if (!project || pageIndex < 0 || pageIndex >= project.pages.length) {
      return [];
    }
    return [...project.pages[pageIndex].panels];
  }

  /**
   * Get default conversion settings
   */
  getDefaultSettings(): ConversionSettings {
    return {
      panelDuration: 3,
      autoDetectSpeechBubbles: true,
      enableOCR: false,
      outputFormat: 'sequence',
    };
  }

  /**
   * Validate conversion settings
   */
  validateSettings(settings: ConversionSettings): boolean {
    return (
      settings.panelDuration >= 1 && settings.panelDuration <= 10 &&
      typeof settings.autoDetectSpeechBubbles === 'boolean' &&
      typeof settings.enableOCR === 'boolean' &&
      ['sequence', 'shots', 'storyboard'].includes(settings.outputFormat)
    );
  }

  /**
   * Serialize converter state
   */
  serialize(): string {
    const state: ComicConversionState = {
      projects: this.projects,
      results: this.results,
      history: this.history,
      version: '1.0',
      lastModified: new Date().toISOString(),
    };

    return JSON.stringify(state, null, 2);
  }

  /**
   * Deserialize converter state
   */
  deserialize(data: string): void {
    try {
      const state = JSON.parse(data);
      if (this.isValidComicConversionState(state)) {
        this.projects = state.projects;
        this.results = state.results;
        this.history = state.history || [];
      } else {
        console.warn('Invalid comic conversion state format');
      }
    } catch (error) {
      console.error('Failed to deserialize comic conversion state:', error);
    }
  }

  /**
   * Get operation history
   */
  getHistory(): ComicConversionOperation[] {
    return [...this.history];
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Remove a comic project
   */
  removeProject(comicId: string): void {
    delete this.projects[comicId];
    this.recordOperation('load', `Removed comic project: ${comicId}`);
  }

  /**
   * Remove a conversion result
   */
  removeResult(resultId: string): void {
    delete this.results[resultId];
    this.recordOperation('convert', `Removed conversion result: ${resultId}`);
  }

  /**
   * Get all comic projects
   */
  getAllProjects(): ComicProject[] {
    return Object.values(this.projects);
  }

  /**
   * Get all conversion results
   */
  getAllResults(): SequenceResult[] {
    return Object.values(this.results);
  }

  /**
   * Record an operation for history
   */
  private recordOperation(
    type: ComicConversionOperation['type'],
    description: string,
    comicId?: string,
    resultId?: string
  ): void {
    const operation: ComicConversionOperation = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      description,
      comicId,
      resultId,
    };

    this.history.push(operation);

    // Maintain maximum history size
    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history.shift();
    }
  }

  /**
   * Validate comic conversion state
   */
  private isValidComicConversionState(state: unknown): state is ComicConversionState {
    return (
      state !== null &&
      typeof state === 'object' &&
      (state as any).projects &&
      typeof (state as any).version === 'string' &&
      typeof (state as any).lastModified === 'string'
    );
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'unknown';
  }

  /**
   * Get analytics for a comic project
   */
  getProjectAnalytics(comicId: string): {
    panelCount: number;
    pageCount: number;
    estimatedDuration: number;
  } | undefined {
    const project = this.projects[comicId];
    if (!project) return undefined;

    return {
      panelCount: project.pages.reduce((sum, page) => sum + page.panels.length, 0),
      pageCount: project.pages.length,
      estimatedDuration: project.pages.length * 3, // Default 3 seconds per page
    };
  }

  /**
   * Get analytics for a conversion result
   */
  getResultAnalytics(resultId: string): {
    sequenceCount: number;
    shotCount: number;
    totalDuration: number;
  } | undefined {
    const result = this.results[resultId];
    if (!result) return undefined;

    return {
      sequenceCount: result.metadata.sequenceCount,
      shotCount: result.shots.length,
      totalDuration: result.metadata.duration,
    };
  }
}
