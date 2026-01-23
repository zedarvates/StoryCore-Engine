/**
 * Voice HTTP Client Tests
 * 
 * Unit tests for VoiceHttpClient class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceHttpClient, MockVoiceHttpClient } from '../voiceHttpClient';
import type { VoiceRecording, PhraseData } from '@/types';

describe('VoiceHttpClient', () => {
  let client: VoiceHttpClient;
  let mockClient: MockVoiceHttpClient;

  beforeEach(() => {
    client = new VoiceHttpClient();
    mockClient = new MockVoiceHttpClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = client.getConfig();
      expect(config.baseUrl).toBe('http://localhost:3000');
      expect(config.timeout).toBe(15000);
      expect(config.retryAttempts).toBe(3);
    });

    it('should update configuration', () => {
      client.updateConfig({ timeout: 10000, retryAttempts: 2 });
      const config = client.getConfig();
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(2);
    });
  });

  describe('Mock Client', () => {
    it('should upload voice recording successfully', async () => {
      const mockRecording: VoiceRecording = {
        id: 'rec-1',
        userId: 'user-1',
        sessionId: 'session-1',
        filename: 'test.wav',
        audioBlob: new Blob(['test'], { type: 'audio/wav' }),
        timestamp: new Date().toISOString(),
        duration: 1000,
        sampleRate: 44100,
      };

      const response = await mockClient.uploadVoiceRecording(mockRecording);
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('recordingId');
      expect(response.data?.status).toBe('uploaded');
    });

    it('should synchronize phrase data successfully', async () => {
      const mockPhrase: PhraseData = {
        id: 'phrase-1',
        text: 'Test phrase',
        startTime: 0,
        endTime: 1000,
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
      };

      const response = await mockClient.syncPhraseData(mockPhrase);
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('phraseId');
      expect(response.data?.syncStatus).toBe('synced');
    });

    it('should get recording status', async () => {
      const response = await mockClient.getRecordingStatus('rec-1');
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('recordingId');
      expect(['uploaded', 'processing', 'completed', 'failed']).toContain(response.data?.status);
    });

    it('should get session recordings', async () => {
      const response = await mockClient.getSessionRecordings('session-1');
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should delete recording', async () => {
      const response = await mockClient.deleteRecording('rec-1');
      expect(response.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle upload errors', async () => {
      // Mock fetch to reject
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const mockRecording: VoiceRecording = {
        id: 'rec-1',
        userId: 'user-1',
        sessionId: 'session-1',
        filename: 'test.wav',
        audioBlob: new Blob(['test'], { type: 'audio/wav' }),
        timestamp: new Date().toISOString(),
        duration: 1000,
        sampleRate: 44100,
      };

      const response = await client.uploadVoiceRecording(mockRecording);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Network error');
    });

    it('should handle sync errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const mockPhrase: PhraseData = {
        id: 'phrase-1',
        text: 'Test phrase',
        startTime: 0,
        endTime: 1000,
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
      };

      const response = await client.syncPhraseData(mockPhrase);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Network error');
    });
  });
});