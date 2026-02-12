/**
 * Transcription Service - Frontend pour Transcription Engine
 * Transcription audio et montage basé sur le texte
 */

import { backendApiService } from './backendApiService';

export type SegmentType = 'dialogue' | 'narration' | 'music' | 'sound-effect' | 'silence';
export type MontageStyle = 'chronological' | 'highlights' | 'compact' | 'conversation';

export interface SpeakerInfo {
  speakerId: string;
  speakerLabel: string;
  confidence: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptSegment {
  segmentId: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: SpeakerInfo | null;
  confidence: number;
  words: WordTimestamp[];
  segmentType: SegmentType;
}

export interface Transcript {
  transcriptId: string;
  audioId: string;
  language: string;
  duration: number;
  segments: TranscriptSegment[];
  createdAt: string;
  speakerCount: number;
  wordCount: number;
  languageConfidence: number;
}

export interface MontageRequest {
  transcriptId: string;
  style: MontageStyle;
  includeSpeakers?: string[];
  excludeSpeakers?: string[];
  maxDuration?: number;
  preserveTiming?: boolean;
  addTransitions?: boolean;
}

export interface MontageShot {
  shotId: string;
  sourceStart: number;
  sourceEnd: number;
  text: string;
  speaker: string | null;
  shotType: string;
  duration: number;
  order: number;
}

export interface MontageResult {
  resultId: string;
  transcriptId: string;
  style: MontageStyle;
  shots: MontageShot[];
  totalDuration: number;
  wordCount: number;
  createdAt: string;
  summary: string;
}

export interface TranscriptionService {
  transcribe(
    audioId: string,
    audioUrl: string,
    language?: string,
    enableSpeakerDiarization?: boolean
  ): Promise<Transcript>;
  generateMontage(request: MontageRequest): Promise<MontageResult>;
  exportSrt(transcriptId: string): Promise<string>;
  exportVtt(transcriptId: string): Promise<string>;
  exportAss(transcriptId: string): Promise<string>;
  getTranscript(transcriptId: string): Promise<Transcript | null>;
  getMontage(resultId: string): Promise<MontageResult | null>;
}

class TranscriptionServiceImpl implements TranscriptionService {
  private baseUrl = '/api/v1/transcription';
  private transcriptCache: Map<string, { transcript: Transcript; timestamp: number }> = new Map();
  private montageCache: Map<string, { result: MontageResult; timestamp: number }> = new Map();
  private cacheTTL = 10 * 60 * 1000; // 10 minutes

  async transcribe(
    audioId: string,
    audioUrl: string,
    language?: string,
    enableSpeakerDiarization: boolean = true
  ): Promise<Transcript> {
    // Check cache with TTL
    const cacheKey = `transcript:${audioId}`;
    const cached = this.transcriptCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`[Transcription] Cache hit for: ${audioId}`);
      return cached.transcript;
    }

    try {
      console.log(`[Transcription] Starting transcription: ${audioUrl}`);

      const response = await backendApiService.post<Transcript>(
        `${this.baseUrl}/transcribe`,
        {
          audioId,
          audioUrl,
          language,
          enableSpeakerDiarization
        }
      );

      // Cache with timestamp
      this.transcriptCache.set(cacheKey, {
        transcript: response,
        timestamp: Date.now()
      });

      console.log(`[Transcription] Complete: ${response.wordCount} words, ${response.speakerCount} speakers`);
      return response;
    } catch (error) {
      console.error('[Transcription] Failed:', error);
      throw error;
    }
  }

  async generateMontage(request: MontageRequest): Promise<MontageResult> {
    try {
      console.log(`[Transcription] Generating ${request.style} montage`);

      const response = await backendApiService.post<MontageResult>(
        `${this.baseUrl}/generate-montage`,
        request
      );

      // Cache with timestamp
      this.montageCache.set(response.resultId, {
        result: response,
        timestamp: Date.now()
      });

      console.log(`[Transcription] Montage complete: ${response.shots.length} shots, ${response.totalDuration.toFixed(1)}s`);
      return response;
    } catch (error) {
      console.error('[Transcription] Montage generation failed:', error);
      throw error;
    }
  }

  async exportSrt(transcriptId: string): Promise<string> {
    try {
      return await backendApiService.get<string>(
        `${this.baseUrl}/${transcriptId}/export/srt`
      );
    } catch (error) {
      console.error('[Transcription] SRT export failed:', error);
      throw error;
    }
  }

  async exportVtt(transcriptId: string): Promise<string> {
    try {
      return await backendApiService.get<string>(
        `${this.baseUrl}/${transcriptId}/export/vtt`
      );
    } catch (error) {
      console.error('[Transcription] VTT export failed:', error);
      throw error;
    }
  }

  async exportAss(transcriptId: string): Promise<string> {
    try {
      return await backendApiService.get<string>(
        `${this.baseUrl}/${transcriptId}/export/ass`
      );
    } catch (error) {
      console.error('[Transcription] ASS export failed:', error);
      throw error;
    }
  }

  async getTranscript(transcriptId: string): Promise<Transcript | null> {
    // Check cache with TTL
    for (const [key, cached] of this.transcriptCache.entries()) {
      if (cached.transcript.transcriptId === transcriptId || cached.transcript.audioId === transcriptId) {
        if (Date.now() - cached.timestamp < this.cacheTTL) {
          return cached.transcript;
        }
      }
    }

    try {
      const response = await backendApiService.get<Transcript>(
        `${this.baseUrl}/${transcriptId}`
      );

      this.transcriptCache.set(response.audioId, {
        transcript: response,
        timestamp: Date.now()
      });
      return response;
    } catch (error) {
      console.error('[Transcription] Get transcript failed:', error);
      return null;
    }
  }

  async getMontage(resultId: string): Promise<MontageResult | null> {
    // Check cache with TTL
    const cached = this.montageCache.get(resultId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    try {
      const response = await backendApiService.get<MontageResult>(
        `${this.baseUrl}/montage/${resultId}`
      );

      this.montageCache.set(resultId, {
        result: response,
        timestamp: Date.now()
      });
      return response;
    } catch (error) {
      console.error('[Transcription] Get montage failed:', error);
      return null;
    }
  }

  /**
   * Parser un fichier SRT importé
   */
  parseSrt(content: string): Array<{ start: number; end: number; text: string }> {
    const segments: Array<{ start: number; end: number; text: string }> = [];
    const blocks = content.trim().split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      // Parser le temps
      const timeLine = lines[1];
      const [startStr, endStr] = timeLine.split(' --> ');
      
      const start = this.parseTimeCode(startStr.trim());
      const end = this.parseTimeCode(endStr.trim());

      // Parser le texte
      const text = lines.slice(2).join('\n');

      segments.push({ start, end, text });
    }

    return segments;
  }

  /**
   * Parser un code temps SRT
   */
  private parseTimeCode(timeStr: string): number {
    // Format: HH:MM:SS,mmm ou HH:MM:SS.mmm
    const parts = timeStr.replace(',', '.').split(':');
    
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseFloat(parts[2]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Formater en mm:ss
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Rechercher dans la transcription
   */
  searchInTranscript(transcript: Transcript, query: string): TranscriptSegment[] {
    const queryLower = query.toLowerCase();
    
    return transcript.segments.filter(segment =>
      segment.text.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Obtenir les segments par locuteur
   */
  getSegmentsBySpeaker(transcript: Transcript): Record<string, TranscriptSegment[]> {
    const bySpeaker: Record<string, TranscriptSegment[]> = {};

    for (const segment of transcript.segments) {
      const speakerId = segment.speaker?.speakerLabel || 'Unknown';
      
      if (!bySpeaker[speakerId]) {
        bySpeaker[speakerId] = [];
      }
      bySpeaker[speakerId].push(segment);
    }

    return bySpeaker;
  }

  /**
   * Effacer les caches
   */
  clearCaches(): void {
    this.transcriptCache.clear();
    this.montageCache.clear();
  }
}

export const transcriptionService = new TranscriptionServiceImpl();

