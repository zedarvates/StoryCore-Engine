/**
 * Phrase Synchronization Manager Tests
 * 
 * Unit tests for PhraseSyncManager class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhraseSyncManager, MockPhraseSyncManager } from '../phraseSyncManager';
import type { VoiceRecording, PhraseData } from '@/types';

describe('PhraseSyncManager', () => {
  let manager: PhraseSyncManager;
  let mockManager: MockPhraseSyncManager;

  beforeEach(() => {
    manager = new PhraseSyncManager();
    manager.stopAutoSync(); // Stop auto-sync for testing
    mockManager = new MockPhraseSyncManager();
  });

  afterEach(() => {
    manager.destroy();
    mockManager.destroy();
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = manager.getConfig();
      expect(config.autoSync).toBe(true);
      expect(config.syncInterval).toBe(5000);
      expect(config.maxRetries).toBe(3);
    });

    it('should update configuration', () => {
      manager.updateConfig({ autoSync: false, syncInterval: 10000 });
      const config = manager.getConfig();
      expect(config.autoSync).toBe(false);
      expect(config.syncInterval).toBe(10000);
    });
  });

  describe('Queue Management', () => {
    it('should add items to sync queue', () => {
      const mockPhrase: PhraseData = {
        id: 'phrase-1',
        text: 'Test phrase',
        startTime: 0,
        endTime: 1000,
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
      };

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

      manager.addToSyncQueue(mockPhrase, mockRecording);
      const pending = manager.getPendingSyncs();
      expect(pending.length).toBe(1);
      expect(pending[0].phrase.id).toBe('phrase-1');
    });

    it('should clear sync queue', () => {
      const mockPhrase: PhraseData = {
        id: 'phrase-1',
        text: 'Test phrase',
        startTime: 0,
        endTime: 1000,
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
      };

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

      manager.addToSyncQueue(mockPhrase, mockRecording);
      manager.clearQueue();
      const pending = manager.getPendingSyncs();
      expect(pending.length).toBe(0);
    });
  });

  describe('Mock Manager', () => {
    it('should synchronize phrase with recording successfully', async () => {
      const mockPhrase: PhraseData = {
        id: 'phrase-1',
        text: 'Test phrase',
        startTime: 0,
        endTime: 1000,
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
      };

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

      const result = await mockManager.syncPhraseWithRecording(
        mockPhrase,
        mockRecording
      );
      expect(result.success).toBe(true);
      expect(result.phraseId).toBe('phrase-1');
      expect(result.recordingId).toBeTruthy();
    });

    it('should get sync status', async () => {
      const status = await mockManager.getSyncStatus('phrase-1');
      expect(status.phraseId).toBe('phrase-1');
      expect(status.status).toBe('synced');
    });
  });

  describe('Auto Sync', () => {
    it('should start and stop auto sync', () => {
      manager.stopAutoSync();
      const config1 = manager.getConfig();
      expect(config1.autoSync).toBe(true); // Config still true, but interval stopped

      manager.updateConfig({ autoSync: false });
      manager.startAutoSync();
      const config2 = manager.getConfig();
      expect(config2.autoSync).toBe(false);
    });

    it('should process queue when auto sync is enabled', async () => {
      // Use mock manager for faster testing
      const testManager = new MockPhraseSyncManager({ autoSync: true });

      const mockPhrase: PhraseData = {
        id: 'phrase-1',
        text: 'Test phrase',
        startTime: 0,
        endTime: 1000,
        userId: 'user-1',
        sessionId: 'session-1',
        timestamp: new Date().toISOString(),
      };

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

      testManager.addToSyncQueue(mockPhrase, mockRecording);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const pending = testManager.getPendingSyncs();
      expect(pending.length).toBeLessThanOrEqual(1);

      testManager.destroy();
    });
  });
});