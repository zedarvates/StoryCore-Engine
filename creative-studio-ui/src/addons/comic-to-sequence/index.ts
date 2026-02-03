// ============================================================================
// Comic to Sequence Converter Add-on
// ============================================================================

// Core types
export type {
  ComicPanel,
  ComicPage,
  ComicProject,
  ConversionSettings,
  SequenceResult,
} from './types';

// Import types for internal use
import type { ComicPanel, ComicPage, ComicProject, ConversionSettings, SequenceResult } from './types';

// Import implementation
export { ComicToSequenceConverter } from './ComicToSequenceConverter';

// Plugin interface
export interface ComicToSequencePlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Core functionality
  getConverter(): ComicToSequenceConverter;

  // Integration hooks
  onComicLoaded(comicId: string): void;
  onConversionComplete(result: SequenceResult): void;

  // API for comic processing
  loadComic(file: File): Promise<ComicProject>;
  convertToSequence(comicId: string, settings: ConversionSettings): Promise<SequenceResult>;
  exportSequence(result: SequenceResult): Promise<Blob>;
}

// Placeholder for ComicToSequenceConverter
export interface ComicToSequenceConverter {
  // Core methods
  loadComic(file: File): Promise<ComicProject>;
  convertToSequence(comicId: string, settings: ConversionSettings): Promise<SequenceResult>;
  exportSequence(result: SequenceResult): Promise<Blob>;
  getProject(comicId: string): ComicProject | undefined;
  getPanels(comicId: string, pageIndex: number): ComicPanel[];

  // Settings management
  getDefaultSettings(): ConversionSettings;
  validateSettings(settings: ConversionSettings): boolean;

  // State management
  serialize(): string;
  deserialize(data: string): void;
}

// Export the plugin instance
let converterInstance: ComicToSequenceConverter | null = null;

export const comicToSequencePlugin: ComicToSequencePlugin = {
  name: 'Comic to Sequence Converter',
  version: '1.0.0',
  description: 'Automatically convert comic books to video sequences',

  initialize: async () => {
    // Initialize converter
    converterInstance = {
      loadComic: async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        pages: [],
        metadata: {
          format: 'comic',
          pageCount: 0,
          dimensions: { width: 0, height: 0 },
        },
      }),
      convertToSequence: async (comicId, settings) => ({
        comicId,
        settings,
        sequences: [],
        shots: [],
        metadata: {
          panelCount: 0,
          sequenceCount: 0,
          duration: 0,
        },
      }),
      exportSequence: async (result) => new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
      getProject: (comicId) => undefined,
      getPanels: (comicId, pageIndex) => [],
      getDefaultSettings: () => ({
        panelDuration: 3,
        autoDetectSpeechBubbles: true,
        enableOCR: false,
        outputFormat: 'sequence',
      }),
      validateSettings: (settings) => true,
      serialize: () => JSON.stringify({}),
      deserialize: (data) => {},
    };
  },

  destroy: async () => {
    converterInstance = null;
  },

  getConverter: () => {
    if (!converterInstance) {
      throw new Error('ComicToSequenceConverter not initialized. Call initialize() first.');
    }
    return converterInstance;
  },

  onComicLoaded: (comicId) => {},
  onConversionComplete: (result) => {},

  loadComic: async (file) => {
    return converterInstance?.loadComic(file) || {
      id: crypto.randomUUID(),
      name: file.name,
      pages: [],
      metadata: {
        format: 'comic',
        pageCount: 0,
        dimensions: { width: 0, height: 0 },
      },
    };
  },

  convertToSequence: async (comicId, settings) => {
    return converterInstance?.convertToSequence(comicId, settings) || {
      comicId,
      settings,
      sequences: [],
      shots: [],
      metadata: {
        panelCount: 0,
        sequenceCount: 0,
        duration: 0,
      },
    };
  },

  exportSequence: async (result) => {
    return converterInstance?.exportSequence(result) || new Blob();
  },
};

// Default export
export default comicToSequencePlugin;