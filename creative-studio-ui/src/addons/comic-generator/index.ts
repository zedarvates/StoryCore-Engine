// ============================================================================
// Comic Generator Addon - Frontend Plugin Entry Point
// Follows the StoryCore addon plugin pattern (same as casting / comic-to-sequence)
// ============================================================================

import type { ComicPage } from './types';
import type { ComicStyleType } from './types';
import comicGeneratorService from './comicGeneratorService';

export interface ComicGeneratorPlugin {
  id: string;
  name: string;
  version: string;
  description: string;

  // Lifecycle
  initialize: (context: AddonContext) => Promise<void>;
  destroy: () => Promise<void>;

  // Core actions
  generatePage: (params: GeneratePageParams) => Promise<ComicPage | null>;
  getState: (projectId: string) => Promise<Record<string, unknown> | null>;
  exportComic: (projectId: string, format: 'json' | 'pdf') => Promise<string | null>;

  // UI
  getComponent: () => React.ComponentType<ComicGeneratorComponentProps>;
}

export interface AddonContext {
  projectId: string;
  storyContext?: string;
  characters?: Record<string, unknown>[];
  locations?: Record<string, unknown>[];
  objects?: Record<string, unknown>[];
}

export interface GeneratePageParams {
  projectId: string;
  storyContext: string;
  style?: ComicStyleType;
  panelsCount?: number;
  generateImages?: boolean;
  narrativeDirection?: string;
  characters?: Record<string, unknown>[];
  locations?: Record<string, unknown>[];
  objects?: Record<string, unknown>[];
}

export interface ComicGeneratorComponentProps {
  projectId: string;
  storyContext?: string;
  characters?: Record<string, unknown>[];
  locations?: Record<string, unknown>[];
  objects?: Record<string, unknown>[];
  onPageGenerated?: (page: ComicPage) => void;
}

// Lazily import React to avoid issues in non-browser contexts
import type React from 'react';

// ============================================================================
// Plugin Implementation
// ============================================================================

const comicGeneratorPlugin: ComicGeneratorPlugin = {
  id: 'comic_generator',
  name: 'Comic Generator',
  version: '1.0.0',
  description:
    'Génère des planches BD / Comics / Webtoon / Manga cohérentes à partir des données narratives du projet StoryCore.',

  async initialize(context: AddonContext): Promise<void> {
    try {
      const status = await comicGeneratorService.getStatus();
      console.log(`[ComicGenerator] Initialized — backend version: ${status.version}`);
    } catch (error) {
      console.warn('[ComicGenerator] Backend not reachable — running in offline mode:', error);
    }
  },

  async destroy(): Promise<void> {
    console.log('[ComicGenerator] Plugin destroyed');
  },

  async generatePage(params: GeneratePageParams): Promise<ComicPage | null> {
    try {
      const result = await comicGeneratorService.generatePage({
        project_id: params.projectId,
        story_context: params.storyContext,
        characters: params.characters,
        locations: params.locations,
        objects: params.objects,
        style: params.style,
        generate_images: params.generateImages,
        panels_count: params.panelsCount,
        narrative_direction: params.narrativeDirection,
      });
      return result.success ? result.page : null;
    } catch (error) {
      console.error('[ComicGenerator] generatePage error:', error);
      return null;
    }
  },

  async getState(projectId: string): Promise<Record<string, unknown> | null> {
    try {
      const state = await comicGeneratorService.getState(projectId);
      return state as Record<string, unknown> | null;
    } catch (error) {
      console.error('[ComicGenerator] getState error:', error);
      return null;
    }
  },

  async exportComic(projectId: string, format: 'json' | 'pdf'): Promise<string | null> {
    try {
      const result = await comicGeneratorService.exportComic({ project_id: projectId, format });
      return result.success ? result.output_path : null;
    } catch (error) {
      console.error('[ComicGenerator] exportComic error:', error);
      return null;
    }
  },

  getComponent() {
    // Dynamic import for code splitting
    const { default: ComicGenerator } = require('./ComicGenerator');
    return ComicGenerator as React.ComponentType<ComicGeneratorComponentProps>;
  },
};

export { comicGeneratorPlugin };
export default comicGeneratorPlugin;
