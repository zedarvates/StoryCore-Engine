/**
 * Transcription Store - Zustand store for transcription operations
 * Manages transcript loading, editing, saving, and export functionality
 */

import { create } from 'zustand';
import {
  transcriptionService,
  Transcript,
  TranscriptSegment,
  SpeakerInfo,
  WordTimestamp,
  MontageRequest,
  MontageResult,
  MontageStyle,
  SegmentType
} from '../services/transcriptionService';
import { logger } from '../utils/logger';

export interface EditHistoryEntry {
  id: string;
  timestamp: number;
  segmentId: string;
  previousText: string;
  newText: string;
  type: 'text' | 'speaker' | 'segment_type' | 'timing';
}

export interface TranscriptionState {
  // Transcript state
  transcript: Transcript | null;
  transcriptId: string | null;
  audioId: string | null;
  audioUrl: string | null;
  language: string;
  
  // Loading and error state
  isLoading: boolean;
  isTranscribing: boolean;
  isSaving: boolean;
  isExporting: boolean;
  error: string | null;
  
  // Selection state
  selectedSegmentId: string | null;
  selectedWordIndex: number | null;
  
  // Edit state
  editHistory: EditHistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  
  // Search state
  searchQuery: string;
  searchResults: string[]; // Segment IDs matching search
  
  // Montage state
  montageResult: MontageResult | null;
  isGeneratingMontage: boolean;
  selectedMontageStyle: MontageStyle;
  
  // Filter state
  speakerFilter: string[];
  segmentTypeFilter: SegmentType[];
  
  // Actions - Transcript Management
  loadTranscript: (transcriptId: string) => Promise<void>;
  transcribe: (audioId: string, audioUrl: string, language?: string) => Promise<Transcript>;
  clearTranscript: () => void;
  
  // Actions - Segment Editing
  updateSegment: (segmentId: string, updates: Partial<TranscriptSegment>) => void;
  updateSegmentText: (segmentId: string, newText: string) => void;
  updateSegmentSpeaker: (segmentId: string, speaker: SpeakerInfo | null) => void;
  updateSegmentTiming: (segmentId: string, startTime: number, endTime: number) => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  
  // Actions - Search
  search: (query: string) => void;
  clearSearch: () => void;
  goToSearchResult: (segmentId: string) => void;
  
  // Actions - Selection
  selectSegment: (segmentId: string | null) => void;
  selectWord: (segmentId: string, wordIndex: number | null) => void;
  
  // Actions - Saving
  save: () => Promise<void>;
  saveSegment: (segmentId: string) => Promise<void>;
  
  // Actions - Export
  exportSrt: () => Promise<string>;
  exportVtt: () => Promise<string>;
  exportAss: () => Promise<string>;
  
  // Actions - Montage
  generateMontage: (style: MontageStyle, options?: Partial<MontageRequest>) => Promise<MontageResult>;
  clearMontage: () => void;
  
  // Actions - Filtering
  filterBySpeaker: (speakers: string[]) => void;
  filterBySegmentType: (types: SegmentType[]) => void;
  clearFilters: () => void;
  
  // Actions - Utilities
  getSegmentById: (segmentId: string) => TranscriptSegment | undefined;
  getSegmentsBySpeaker: (speakerId: string) => TranscriptSegment[];
  formatDuration: (seconds: number) => string;
}

// Maximum history entries to keep
const MAX_HISTORY = 50;

export const useTranscriptionStore = create<TranscriptionState>((set, get) => ({
  transcript: null,
  transcriptId: null,
  audioId: null,
  audioUrl: null,
  language: 'fr-FR',
  
  isLoading: false,
  isTranscribing: false,
  isSaving: false,
  isExporting: false,
  error: null,
  
  selectedSegmentId: null,
  selectedWordIndex: null,
  
  editHistory: [],
  historyIndex: -1,
  isDirty: false,
  
  searchQuery: '',
  searchResults: [],
  
  montageResult: null,
  isGeneratingMontage: false,
  selectedMontageStyle: 'chronological',
  
  speakerFilter: [],
  segmentTypeFilter: [],

  loadTranscript: async (transcriptId: string) => {
    set({ isLoading: true, error: null, transcriptId });

    try {
      const transcript = await transcriptionService.getTranscript(transcriptId);
      
      if (transcript) {
        set({
          transcript,
          audioId: transcript.audioId,
          language: transcript.language,
          isLoading: false
        });
      } else {
        set({ 
          error: 'Transcription non trouvée',
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur de chargement',
        isLoading: false 
      });
    }
  },

  transcribe: async (audioId: string, audioUrl: string, language?: string) => {
    set({ 
      isTranscribing: true, 
      error: null,
      audioId,
      audioUrl
    });

    try {
      const transcript = await transcriptionService.transcribe(
        audioId,
        audioUrl,
        language || get().language,
        true
      );

      set({
        transcript,
        transcriptId: transcript.transcriptId,
        language: transcript.language,
        isTranscribing: false,
        isDirty: false,
        editHistory: [],
        historyIndex: -1
      });

      return transcript;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Transcription échouée',
        isTranscribing: false 
      });
      throw error;
    }
  },

  clearTranscript: () => {
    set({
      transcript: null,
      transcriptId: null,
      audioId: null,
      audioUrl: null,
      error: null,
      selectedSegmentId: null,
      editHistory: [],
      historyIndex: -1,
      isDirty: false,
      searchQuery: '',
      searchResults: [],
      montageResult: null
    });
  },

  updateSegment: (segmentId: string, updates: Partial<TranscriptSegment>) => {
    const { transcript, editHistory } = get();
    if (!transcript) return;

    const segmentIndex = transcript.segments.findIndex(s => s.segmentId === segmentId);
    if (segmentIndex === -1) return;

    const oldSegment = transcript.segments[segmentIndex];
    const newSegment = { ...oldSegment, ...updates };
    const newSegments = [...transcript.segments];
    newSegments[segmentIndex] = newSegment;

    // Add to history
    const historyEntry: EditHistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      segmentId,
      previousText: oldSegment.text,
      newText: newSegment.text,
      type: 'text'
    };

    const newHistory = [...editHistory, historyEntry].slice(-MAX_HISTORY);

    set({
      transcript: { ...transcript, segments: newSegments },
      editHistory: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true
    });
  },

  updateSegmentText: (segmentId: string, newText: string) => {
    get().updateSegment(segmentId, { text: newText });
  },

  updateSegmentSpeaker: (segmentId: string, speaker: SpeakerInfo | null) => {
    get().updateSegment(segmentId, { speaker });
  },

  updateSegmentTiming: (segmentId: string, startTime: number, endTime: number) => {
    get().updateSegment(segmentId, { startTime, endTime });
  },

  undo: () => {
    const { editHistory, historyIndex, transcript } = get();
    if (historyIndex < 0 || !transcript) return;

    // Implementation would restore the previous state
    // For simplicity, this is a placeholder
    set({ historyIndex: historyIndex - 1 });
  },

  redo: () => {
    const { editHistory, historyIndex, transcript } = get();
    if (historyIndex >= editHistory.length - 1 || !transcript) return;

    // Implementation would restore the next state
    // For simplicity, this is a placeholder
    set({ historyIndex: historyIndex + 1 });
  },

  clearHistory: () => {
    set({ editHistory: [], historyIndex: -1 });
  },

  search: (query: string) => {
    const { transcript } = get();
    if (!transcript || !query.trim()) {
      set({ searchQuery: '', searchResults: [] });
      return;
    }

    const queryLower = query.toLowerCase();
    const results = transcript.segments
      .filter(segment => segment.text.toLowerCase().includes(queryLower))
      .map(segment => segment.segmentId);

    set({ searchQuery: query, searchResults: results });
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: [] });
  },

  goToSearchResult: (segmentId: string) => {
    set({ selectedSegmentId: segmentId });
  },

  selectSegment: (segmentId: string | null) => {
    set({ selectedSegmentId: segmentId });
  },

  selectWord: (segmentId: string, wordIndex: number | null) => {
    set({ selectedSegmentId: segmentId, selectedWordIndex: wordIndex });
  },

  save: async () => {
    const { transcript } = get();
    if (!transcript) return;

    set({ isSaving: true, error: null });

    try {
      // In a full implementation, this would call the API to save
      // For now, just mark as not dirty
      set({ isSaving: false, isDirty: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur de sauvegarde',
        isSaving: false 
      });
    }
  },

  saveSegment: async (segmentId: string) => {
    const { transcript } = get();
    if (!transcript) return;

    set({ isSaving: true });

    try {
      const segment = transcript.segments.find(s => s.segmentId === segmentId);
      if (segment) {
        // In a full implementation, this would call the API
        logger.debug('Saving segment:', segment);
      }
      set({ isSaving: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur de sauvegarde',
        isSaving: false 
      });
    }
  },

  exportSrt: async () => {
    const { transcriptId } = get();
    if (!transcriptId) throw new Error('Aucune transcription à exporter');

    set({ isExporting: true, error: null });

    try {
      const content = await transcriptionService.exportSrt(transcriptId);
      set({ isExporting: false });
      return content;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur d\'export SRT',
        isExporting: false 
      });
      throw error;
    }
  },

  exportVtt: async () => {
    const { transcriptId } = get();
    if (!transcriptId) throw new Error('Aucune transcription à exporter');

    set({ isExporting: true, error: null });

    try {
      const content = await transcriptionService.exportVtt(transcriptId);
      set({ isExporting: false });
      return content;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur d\'export VTT',
        isExporting: false 
      });
      throw error;
    }
  },

  exportAss: async () => {
    const { transcriptId } = get();
    if (!transcriptId) throw new Error('Aucune transcription à exporter');

    set({ isExporting: true, error: null });

    try {
      const content = await transcriptionService.exportAss(transcriptId);
      set({ isExporting: false });
      return content;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur d\'export ASS',
        isExporting: false 
      });
      throw error;
    }
  },

  generateMontage: async (style: MontageStyle, options?: Partial<MontageRequest>) => {
    const { transcript, selectedMontageStyle } = get();
    if (!transcript) throw new Error('Aucune transcription chargée');

    const montageStyle = style || selectedMontageStyle;

    set({ isGeneratingMontage: true, error: null });

    try {
      const request: MontageRequest = {
        transcriptId: transcript.transcriptId,
        style: montageStyle,
        ...options
      };

      const result = await transcriptionService.generateMontage(request);
      set({ 
        montageResult: result, 
        isGeneratingMontage: false,
        selectedMontageStyle: montageStyle
      });

      return result;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur de génération du montage',
        isGeneratingMontage: false 
      });
      throw error;
    }
  },

  clearMontage: () => {
    set({ montageResult: null });
  },

  filterBySpeaker: (speakers: string[]) => {
    set({ speakerFilter: speakers });
  },

  filterBySegmentType: (types: SegmentType[]) => {
    set({ segmentTypeFilter: types });
  },

  clearFilters: () => {
    set({ speakerFilter: [], segmentTypeFilter: [] });
  },

  getSegmentById: (segmentId: string) => {
    const { transcript } = get();
    if (!transcript) return undefined;
    return transcript.segments.find(s => s.segmentId === segmentId);
  },

  getSegmentsBySpeaker: (speakerId: string) => {
    const { transcript } = get();
    if (!transcript) return [];
    return transcript.segments.filter(
      s => s.speaker?.speakerLabel === speakerId
    );
  },

  formatDuration: (seconds: number) => {
    return transcriptionService.formatTime(seconds);
  }
}));

// Export helper types for consumers
export type { 
  Transcript, 
  TranscriptSegment, 
  SpeakerInfo, 
  WordTimestamp,
  MontageRequest, 
  MontageResult,
  SegmentType,
  MontageStyle
};
