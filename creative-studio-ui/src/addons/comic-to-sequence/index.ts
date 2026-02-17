// ============================================================================
// Comic to Sequence Converter Add-on
// ============================================================================

// Core types - Import first, then re-export
import type { ComicPanel, ComicPage, ComicProject, ConversionSettings, SequenceResult } from './types';
export type {
  ComicPanel,
  ComicPage,
  ComicProject,
  ConversionSettings,
  SequenceResult,
} from './types';

// Import implementation
import { ComicToSequenceConverter } from './ComicToSequenceConverter';
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

// Export the plugin instance
export const comicToSequencePlugin: ComicToSequencePlugin = {
  name: 'Comic to Sequence Converter',
  version: '1.0.0',
  description: 'Automatically convert comic books to video sequences',

  initialize: async () => {},
  destroy: async () => {},
  getConverter: () => {
    throw new Error('ComicToSequenceConverter not initialized');
  },
  onComicLoaded: () => {},
  onConversionComplete: () => {},
  loadComic: async () => {
    throw new Error('Not implemented');
  },
  convertToSequence: async () => {
    throw new Error('Not implemented');
  },
  exportSequence: async () => new Blob(),
};

// Default export
export default comicToSequencePlugin;
