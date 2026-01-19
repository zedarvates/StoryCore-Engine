import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceOverGenerator } from '../useVoiceOverGenerator';
import { ttsService } from '../../services/ttsService';
import { useStore } from '../../store';
import type { VoiceOver } from '../../types';

// Mock the TTS service
vi.mock('../../services/ttsService', () => ({
  ttsService: {
    generateVoiceOver: vi.fn(),
  },
}));

describe('useVoiceOverGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      shots: [
        {
          id: 'shot-1',
          title: 'Test Shot',
          description: 'Test',
          duration: 10,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ],
    });
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useVoiceOverGenerator());

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.generateVoiceOver).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });

  it('generates voiceover and adds audio track', async () => {
    const mockAudioUrl = 'blob:mock-audio-url';
    vi.mocked(ttsService.generateVoiceOver).mockResolvedValue(mockAudioUrl);

    const { result } = renderHook(() => useVoiceOverGenerator());

    const voiceOver: VoiceOver = {
      id: 'vo-1',
      text: 'Test voiceover text',
      voice: 'female',
      language: 'en-US',
      speed: 1.0,
      pitch: 0,
      emotion: 'neutral',
    };

    await act(async () => {
      await result.current.generateVoiceOver(voiceOver, 'shot-1');
    });

    // Check that TTS service was called
    expect(ttsService.generateVoiceOver).toHaveBeenCalledWith(voiceOver);

    // Check that audio track was added to store
    const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
    expect(shot?.audioTracks).toHaveLength(1);
    expect(shot?.audioTracks[0].type).toBe('voiceover');
    expect(shot?.audioTracks[0].url).toBe(mockAudioUrl);
  });

  it('sets isGenerating to true during generation', async () => {
    let resolveGeneration: (value: string) => void;
    const generationPromise = new Promise<string>((resolve) => {
      resolveGeneration = resolve;
    });
    vi.mocked(ttsService.generateVoiceOver).mockReturnValue(generationPromise);

    const { result } = renderHook(() => useVoiceOverGenerator());

    const voiceOver: VoiceOver = {
      id: 'vo-2',
      text: 'Test',
      voice: 'male',
      language: 'en-US',
      speed: 1.0,
      pitch: 0,
    };

    act(() => {
      result.current.generateVoiceOver(voiceOver, 'shot-1');
    });

    // Should be generating
    expect(result.current.isGenerating).toBe(true);

    // Resolve the generation
    await act(async () => {
      resolveGeneration!('blob:test-url');
      await generationPromise;
    });

    // Should no longer be generating
    expect(result.current.isGenerating).toBe(false);
  });

  it('handles generation errors', async () => {
    const errorMessage = 'TTS API error';
    vi.mocked(ttsService.generateVoiceOver).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVoiceOverGenerator());

    const voiceOver: VoiceOver = {
      id: 'vo-3',
      text: 'Test',
      voice: 'female',
      language: 'en-US',
      speed: 1.0,
      pitch: 0,
    };

    await act(async () => {
      try {
        await result.current.generateVoiceOver(voiceOver, 'shot-1');
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isGenerating).toBe(false);
  });

  it('clears error when clearError is called', async () => {
    const errorMessage = 'Test error';
    vi.mocked(ttsService.generateVoiceOver).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useVoiceOverGenerator());

    const voiceOver: VoiceOver = {
      id: 'vo-4',
      text: 'Test',
      voice: 'neutral',
      language: 'en-US',
      speed: 1.0,
      pitch: 0,
    };

    // Generate error
    await act(async () => {
      try {
        await result.current.generateVoiceOver(voiceOver, 'shot-1');
      } catch (error) {
        // Expected
      }
    });

    expect(result.current.error).toBe(errorMessage);

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('creates audio track with correct properties', async () => {
    const mockAudioUrl = 'blob:mock-audio-url';
    vi.mocked(ttsService.generateVoiceOver).mockResolvedValue(mockAudioUrl);

    const { result } = renderHook(() => useVoiceOverGenerator());

    const voiceOver: VoiceOver = {
      id: 'vo-5',
      text: 'This is a test voiceover with some text',
      voice: 'male',
      language: 'en-GB',
      speed: 1.2,
      pitch: 3,
      emotion: 'excited',
    };

    await act(async () => {
      await result.current.generateVoiceOver(voiceOver, 'shot-1');
    });

    const shot = useStore.getState().shots.find((s) => s.id === 'shot-1');
    const audioTrack = shot?.audioTracks[0];

    expect(audioTrack).toBeDefined();
    expect(audioTrack?.type).toBe('voiceover');
    expect(audioTrack?.url).toBe(mockAudioUrl);
    expect(audioTrack?.volume).toBe(80);
    expect(audioTrack?.fadeIn).toBe(0.5);
    expect(audioTrack?.fadeOut).toBe(0.5);
    expect(audioTrack?.pan).toBe(0);
    expect(audioTrack?.muted).toBe(false);
    expect(audioTrack?.solo).toBe(false);
    expect(audioTrack?.name).toContain('Voiceover:');
  });
});
