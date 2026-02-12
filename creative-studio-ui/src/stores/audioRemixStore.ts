/**
 * Audio Remix Store - Zustand store for audio remix operations
 * Manages track loading, effects application, and export functionality
 */

import { create } from 'zustand';
import { 
  musicRemixService,
  RemixStyle,
  MusicStructure,
  RemixRequest,
  RemixResult,
  RemixPreview,
  BeatMarker,
  SectionMarker,
  RemixCut
} from '../services/musicRemixService';

export interface AudioRemixState {
  // Track state
  currentTrackUrl: string | null;
  currentTrackId: string | null;
  trackName: string;
  
  // Structure analysis
  musicStructure: MusicStructure | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  
  // Remix state
  remixResult: RemixResult | null;
  remixPreview: RemixPreview | null;
  isRemixing: boolean;
  remixError: string | null;
  
  // Target duration
  targetDuration: number;
  
  // Style selection
  selectedStyle: RemixStyle;
  
  // Cuts preview
  suggestedCuts: Array<{
    section: string;
    originalStart: number;
    originalEnd: number;
    suggestedStart: number;
    suggestedEnd: number;
    removed: number;
  }>;
  selectedCuts: string[]; // IDs of selected cuts
  
  // Effects/modifications
  fadeInDuration: number;
  fadeOutDuration: number;
  crossfadeDuration: number;
  preserveIntro: boolean;
  preserveOutro: boolean;
  
  // Export state
  isExporting: boolean;
  exportError: string | null;
  exportedUrl: string | null;
  
  // Actions
  loadTrack: (audioId: string, audioUrl: string) => Promise<void>;
  analyzeStructure: () => Promise<void>;
  setTargetDuration: (duration: number) => void;
  setRemixStyle: (style: RemixStyle) => void;
  calculateSuggestedCuts: () => void;
  toggleCut: (cutId: string) => void;
  applyEffect: (effect: string, value: number | boolean) => void;
  previewRemix: () => Promise<void>;
  executeRemix: () => Promise<void>;
  export: (outputFormat?: string) => Promise<string>;
  reset: () => void;
  clearResult: () => void;
}

export const useAudioRemixStore = create<AudioRemixState>((set, get) => ({
  currentTrackUrl: null,
  currentTrackId: null,
  trackName: '',
  musicStructure: null,
  isAnalyzing: false,
  analysisError: null,
  remixResult: null,
  remixPreview: null,
  isRemixing: false,
  remixError: null,
  targetDuration: 60,
  selectedStyle: 'smooth',
  suggestedCuts: [],
  selectedCuts: [],
  fadeInDuration: 0.5,
  fadeOutDuration: 1.0,
  crossfadeDuration: 2.0,
  preserveIntro: true,
  preserveOutro: true,
  isExporting: false,
  exportError: null,
  exportedUrl: null,

  loadTrack: async (audioId: string, audioUrl: string) => {
    set({
      currentTrackId: audioId,
      currentTrackUrl: audioUrl,
      trackName: audioUrl.split('/').pop() || audioUrl,
      remixResult: null,
      remixPreview: null,
      suggestedCuts: [],
      selectedCuts: [],
      analysisError: null
    });

    // Auto-analyze structure
    await get().analyzeStructure();
  },

  analyzeStructure: async () => {
    const { currentTrackUrl } = get();
    if (!currentTrackUrl) return;

    set({ isAnalyzing: true, analysisError: null });

    try {
      const structure = await musicRemixService.analyzeStructure(currentTrackUrl);
      set({ 
        musicStructure: structure, 
        isAnalyzing: false,
        targetDuration: Math.round(structure.duration * 0.8) // Default to 80% of original
      });
      
      // Calculate initial suggested cuts
      get().calculateSuggestedCuts();
    } catch (error) {
      set({ 
        analysisError: error instanceof Error ? error.message : 'Analyse échouée',
        isAnalyzing: false 
      });
    }
  },

  setTargetDuration: (duration: number) => {
    set({ targetDuration: duration });
    get().calculateSuggestedCuts();
  },

  setRemixStyle: (style: RemixStyle) => {
    set({ selectedStyle: style });
  },

  calculateSuggestedCuts: () => {
    const { musicStructure, targetDuration } = get();
    if (!musicStructure) return;

    const cuts = musicRemixService.calculateSuggestedCuts(musicStructure, targetDuration);
    set({ suggestedCuts: cuts });
  },

  toggleCut: (cutId: string) => {
    const { selectedCuts } = get();
    const newSelected = selectedCuts.includes(cutId)
      ? selectedCuts.filter(id => id !== cutId)
      : [...selectedCuts, cutId];
    set({ selectedCuts: newSelected });
  },

  applyEffect: (effect: string, value: number | boolean) => {
    const state = get();
    switch (effect) {
      case 'fadeIn':
        set({ fadeInDuration: value as number });
        break;
      case 'fadeOut':
        set({ fadeOutDuration: value as number });
        break;
      case 'crossfade':
        set({ crossfadeDuration: value as number });
        break;
      case 'preserveIntro':
        set({ preserveIntro: value as boolean });
        break;
      case 'preserveOutro':
        set({ preserveOutro: value as boolean });
        break;
    }
  },

  previewRemix: async () => {
    const { 
      currentTrackId, 
      currentTrackUrl, 
      targetDuration, 
      selectedStyle,
      fadeInDuration,
      fadeOutDuration,
      crossfadeDuration,
      preserveIntro,
      preserveOutro
    } = get();

    if (!currentTrackId || !currentTrackUrl) return;

    const request: RemixRequest = {
      audioId: currentTrackId,
      audioUrl: currentTrackUrl,
      targetDuration,
      style: selectedStyle,
      fadeInDuration,
      fadeOutDuration,
      crossfadeDuration,
      preserveIntro,
      preserveOutro
    };

    try {
      const preview = await musicRemixService.previewRemix(request);
      set({ remixPreview: preview });
    } catch (error) {
      console.error('Preview failed:', error);
    }
  },

  executeRemix: async () => {
    const { 
      currentTrackId, 
      currentTrackUrl, 
      targetDuration, 
      selectedStyle,
      fadeInDuration,
      fadeOutDuration,
      crossfadeDuration,
      preserveIntro,
      preserveOutro
    } = get();

    if (!currentTrackId || !currentTrackUrl) return;

    set({ isRemixing: true, remixError: null });

    const request: RemixRequest = {
      audioId: currentTrackId,
      audioUrl: currentTrackUrl,
      targetDuration,
      style: selectedStyle,
      fadeInDuration,
      fadeOutDuration,
      crossfadeDuration,
      preserveIntro,
      preserveOutro
    };

    try {
      const result = await musicRemixService.remix(request);
      set({ 
        remixResult: result, 
        isRemixing: false,
        exportedUrl: result.outputUrl
      });
    } catch (error) {
      set({ 
        remixError: error instanceof Error ? error.message : 'Remix échoué',
        isRemixing: false 
      });
    }
  },

  export: async (outputFormat?: string) => {
    const { remixResult } = get();
    if (!remixResult) {
      throw new Error('Aucun remix à exporter');
    }

    set({ isExporting: true, exportError: null });

    try {
      // For now, just return the already-generated output URL
      // In a full implementation, this would handle format conversion
      set({ 
        isExporting: false, 
        exportedUrl: remixResult.outputUrl 
      });
      return remixResult.outputUrl;
    } catch (error) {
      set({ 
        exportError: error instanceof Error ? error.message : 'Export échoué',
        isExporting: false 
      });
      throw error;
    }
  },

  reset: () => {
    set({
      currentTrackUrl: null,
      currentTrackId: null,
      trackName: '',
      musicStructure: null,
      isAnalyzing: false,
      analysisError: null,
      remixResult: null,
      remixPreview: null,
      isRemixing: false,
      remixError: null,
      targetDuration: 60,
      selectedStyle: 'smooth',
      suggestedCuts: [],
      selectedCuts: [],
      fadeInDuration: 0.5,
      fadeOutDuration: 1.0,
      crossfadeDuration: 2.0,
      preserveIntro: true,
      preserveOutro: true,
      exportedUrl: null
    });
  },

  clearResult: () => {
    set({ 
      remixResult: null, 
      remixPreview: null,
      exportedUrl: null 
    });
  }
}));

// Export helper types for consumers
export type { 
  MusicStructure, 
  RemixRequest, 
  RemixResult, 
  RemixPreview,
  BeatMarker,
  SectionMarker,
  RemixCut,
  RemixStyle 
};
