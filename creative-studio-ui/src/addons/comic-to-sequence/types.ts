// ============================================================================
// Comic to Sequence Converter Types
// ============================================================================

export interface ComicPanel {
  id: string;
  pageIndex: number;
  panelIndex: number;
  dimensions: { width: number; height: number };
  position: { x: number; y: number };
  textContent?: string;
  imageData?: string; // Base64 encoded image
}

export interface ComicPage {
  id: string;
  index: number;
  panels: ComicPanel[];
  dimensions: { width: number; height: number };
}

export interface ComicProject {
  id: string;
  name: string;
  pages: ComicPage[];
  metadata: {
    format: string;
    pageCount: number;
    dimensions: { width: number; height: number };
  };
}

export interface ConversionSettings {
  panelDuration: number; // Seconds per panel
  autoDetectSpeechBubbles: boolean;
  enableOCR: boolean;
  outputFormat: 'sequence' | 'shots' | 'storyboard';
  transitionType?: string;
  transitionDuration?: number;
}

export interface SequenceResult {
  comicId: string;
  settings: ConversionSettings;
  sequences: any[]; // Would be Sequence objects in real implementation
  shots: any[]; // Would be Shot objects in real implementation
  metadata: {
    panelCount: number;
    sequenceCount: number;
    duration: number; // Total duration in seconds
  };
}

export interface ComicConversionOperation {
  id: string;
  type: 'load' | 'convert' | 'export';
  timestamp: string;
  description: string;
  comicId?: string;
  resultId?: string;
}

export interface ComicConversionState {
  projects: Record<string, ComicProject>;
  results: Record<string, SequenceResult>;
  history: ComicConversionOperation[];
  version: string;
  lastModified: string;
}