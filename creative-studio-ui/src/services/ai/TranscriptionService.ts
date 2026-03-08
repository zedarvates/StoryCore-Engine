import { API_BASE_URL } from '@/config/apiConfig';

export interface TranscriptionResponse {
  text: string;
  language: string;
  duration: number;
}

export class TranscriptionService {
  private static instance: TranscriptionService;

  private constructor() {}

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  /**
   * Transcribe an audio blob using the backend transcription service (Whisper or Vosk)
   */
  async transcribeAudio(audioBlob: Blob, language: string = 'auto', backend: string = 'whisper'): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    const params = new URLSearchParams();
    params.append('language', language);
    params.append('backend', backend);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/audio/transcribe-file?${params.toString()}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Transcription failed with status ${response.status}`);
      }

      const result = await response.json();
      return {
        text: result.text || '',
        language: result.language || language,
        duration: result.duration || 0,
      };
    } catch (error) {
      console.error('[TranscriptionService] Error during transcription:', error);
      throw error;
    }
  }
}

export const transcriptionService = TranscriptionService.getInstance();
