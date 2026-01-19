import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ttsService, MockTTSProvider } from '../ttsService';
import type { VoiceOver } from '../../types';

describe('TTSService', () => {
  beforeEach(() => {
    // Reset to mock provider
    ttsService.setProvider(new MockTTSProvider());
  });

  describe('generateVoiceOver', () => {
    it('generates voiceover audio URL', async () => {
      const voiceOver: VoiceOver = {
        id: 'vo-1',
        text: 'Hello world',
        voice: 'female',
        language: 'en-US',
        speed: 1.0,
        pitch: 0,
        emotion: 'neutral',
      };

      const audioUrl = await ttsService.generateVoiceOver(voiceOver);

      expect(audioUrl).toBeTruthy();
      expect(typeof audioUrl).toBe('string');
      // Mock provider returns blob URL
      expect(audioUrl.startsWith('blob:')).toBe(true);
    });

    it('handles different voice parameters', async () => {
      const voiceOver: VoiceOver = {
        id: 'vo-2',
        text: 'Test with custom parameters',
        voice: 'male',
        language: 'en-GB',
        speed: 1.5,
        pitch: 5,
        emotion: 'excited',
      };

      const audioUrl = await ttsService.generateVoiceOver(voiceOver);

      expect(audioUrl).toBeTruthy();
    });

    it('handles long text', async () => {
      const longText = 'This is a very long text that should be converted to speech. '.repeat(10);
      const voiceOver: VoiceOver = {
        id: 'vo-3',
        text: longText,
        voice: 'neutral',
        language: 'en-US',
        speed: 1.0,
        pitch: 0,
      };

      const audioUrl = await ttsService.generateVoiceOver(voiceOver);

      expect(audioUrl).toBeTruthy();
    });
  });

  describe('getAvailableVoices', () => {
    it('returns list of available voices', async () => {
      const voices = await ttsService.getAvailableVoices();

      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);

      voices.forEach((voice) => {
        expect(voice).toHaveProperty('id');
        expect(voice).toHaveProperty('name');
        expect(voice).toHaveProperty('gender');
        expect(voice).toHaveProperty('language');
        expect(['male', 'female', 'neutral']).toContain(voice.gender);
      });
    });
  });

  describe('MockTTSProvider', () => {
    it('generates mock audio with correct format', async () => {
      const provider = new MockTTSProvider();
      const voiceOver: VoiceOver = {
        id: 'vo-4',
        text: 'Mock test',
        voice: 'female',
        language: 'en-US',
        speed: 1.0,
        pitch: 0,
      };

      const audioUrl = await provider.generateVoiceOver(voiceOver);

      expect(audioUrl).toBeTruthy();
      expect(audioUrl.startsWith('blob:')).toBe(true);
    });

    it('simulates API delay', async () => {
      const provider = new MockTTSProvider();
      const voiceOver: VoiceOver = {
        id: 'vo-5',
        text: 'Delay test',
        voice: 'male',
        language: 'en-US',
        speed: 1.0,
        pitch: 0,
      };

      const startTime = Date.now();
      await provider.generateVoiceOver(voiceOver);
      const endTime = Date.now();

      // Should take at least 1 second (simulated delay)
      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('setProvider', () => {
    it('allows changing TTS provider', async () => {
      const customProvider = new MockTTSProvider();
      const generateSpy = vi.spyOn(customProvider, 'generateVoiceOver');

      ttsService.setProvider(customProvider);

      const voiceOver: VoiceOver = {
        id: 'vo-6',
        text: 'Provider test',
        voice: 'female',
        language: 'en-US',
        speed: 1.0,
        pitch: 0,
      };

      await ttsService.generateVoiceOver(voiceOver);

      expect(generateSpy).toHaveBeenCalledWith(voiceOver);
    });
  });
});
