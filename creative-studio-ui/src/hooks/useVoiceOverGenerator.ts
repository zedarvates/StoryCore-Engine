import { useState, useCallback } from 'react';
import type { VoiceOver, AudioTrack } from '../types';
import { ttsService } from '../services/ttsService';
import { useStore } from '../store';

export interface UseVoiceOverGeneratorReturn {
  isGenerating: boolean;
  error: string | null;
  generateVoiceOver: (voiceOver: VoiceOver, shotId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for generating voiceovers and adding them to audio tracks
 */
export const useVoiceOverGenerator = (): UseVoiceOverGeneratorReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addAudioTrack = useStore((state) => state.addAudioTrack);

  const generateVoiceOver = useCallback(
    async (voiceOver: VoiceOver, shotId: string) => {
      setIsGenerating(true);
      setError(null);

      try {
        // Generate audio using TTS service
        const audioUrl = await ttsService.generateVoiceOver(voiceOver);

        // Create audio track from generated voiceover
        const audioTrack: AudioTrack = {
          id: `track-${Date.now()}`,
          name: `Voiceover: ${voiceOver.text.substring(0, 30)}...`,
          type: 'voiceover',
          url: audioUrl,
          startTime: 0,
          duration: 5, // Estimate, will be updated when audio loads
          offset: 0,
          volume: 80,
          fadeIn: 0.5,
          fadeOut: 0.5,
          pan: 0,
          muted: false,
          solo: false,
          effects: [],
        };

        // Add track to shot
        addAudioTrack(shotId, audioTrack);

        // Store voiceover metadata in track
        // (In a real implementation, you might want to extend AudioTrack to include voiceOver data)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate voiceover';
        setError(errorMessage);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [addAudioTrack]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isGenerating,
    error,
    generateVoiceOver,
    clearError,
  };
};
