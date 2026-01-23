/**
 * Phrase Synchronization Manager
 * 
 * Manages synchronization between voice recordings and phrase data
 * Coordinates with VoiceHttpClient for backend communication
 */

import { VoiceHttpClient, VoiceApiResponse } from './voiceHttpClient';
import type { VoiceRecording, PhraseData, SyncStatus } from '@/types';

/**
 * Phrase Synchronization Manager Configuration
 */
export interface PhraseSyncConfig {
  autoSync: boolean;
  syncInterval: number;
  maxRetries: number;
}

/**
 * Default configuration for Phrase Synchronization Manager
 */
const DEFAULT_SYNC_CONFIG: PhraseSyncConfig = {
  autoSync: true,
  syncInterval: 5000, // 5 seconds
  maxRetries: 3,
};

/**
 * Synchronization result
 */
export interface SyncResult {
  success: boolean;
  phraseId?: string;
  recordingId?: string;
  error?: string;
  timestamp: string;
}

/**
 * Phrase Synchronization Manager Class
 */
export class PhraseSyncManager {
  private voiceClient: VoiceHttpClient;
  private config: PhraseSyncConfig;
  private syncQueue: Array<{ phrase: PhraseData; recording: VoiceRecording }>;
  private isProcessing: boolean;
  private intervalId?: NodeJS.Timeout;

  constructor(
    voiceClient?: VoiceHttpClient,
    config?: Partial<PhraseSyncConfig>
  ) {
    this.voiceClient = voiceClient || new VoiceHttpClient();
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.syncQueue = [];
    this.isProcessing = false;

    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      if (this.syncQueue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Add phrase and recording to synchronization queue
   * 
   * @param phrase - Phrase data to synchronize
   * @param recording - Voice recording to associate
   */
  addToSyncQueue(phrase: PhraseData, recording: VoiceRecording): void {
    this.syncQueue.push({ phrase, recording });
  }

  /**
   * Process synchronization queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process items in queue
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue.shift();
        if (item) {
          await this.syncPhraseWithRecording(item.phrase, item.recording);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Synchronize phrase with voice recording
   * 
   * @param phrase - Phrase data
   * @param recording - Voice recording
   * @returns Synchronization result
   */
  async syncPhraseWithRecording(
    phrase: PhraseData,
    recording: VoiceRecording
  ): Promise<SyncResult> {
    try {
      // First upload the voice recording
      const uploadResponse = await this.voiceClient.uploadVoiceRecording(
        recording
      );

      if (!uploadResponse.success) {
        throw new Error(
          uploadResponse.error || 'Failed to upload voice recording'
        );
      }

      // Associate recording ID with phrase
      const phraseWithRecording: PhraseData = {
        ...phrase,
        recordingId: uploadResponse.data?.recordingId,
      };

      // Synchronize phrase data with backend
      const syncResponse = await this.voiceClient.syncPhraseData(
        phraseWithRecording
      );

      if (!syncResponse.success) {
        throw new Error(
          syncResponse.error || 'Failed to synchronize phrase data'
        );
      }

      return {
        success: true,
        phraseId: phrase.id,
        recordingId: uploadResponse.data?.recordingId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        phraseId: phrase.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get synchronization status for a phrase
   * 
   * @param phraseId - ID of the phrase to check
   * @returns Current synchronization status
   */
  async getSyncStatus(phraseId: string): Promise<SyncStatus> {
    // In a real implementation, this would check backend status
    // For now, return a default status
    return {
      phraseId,
      status: 'synced',
      lastUpdated: new Date().toISOString(),
      retries: 0,
    };
  }

  /**
   * Get all pending synchronizations
   * 
   * @returns Array of pending synchronization items
   */
  getPendingSyncs(): Array<{ phrase: PhraseData; recording: VoiceRecording }> {
    return [...this.syncQueue];
  }

  /**
   * Clear synchronization queue
   */
  clearQueue(): void {
    this.syncQueue = [];
  }

  /**
   * Update synchronization configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<PhraseSyncConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.autoSync && !this.intervalId) {
      this.startAutoSync();
    } else if (!this.config.autoSync && this.intervalId) {
      this.stopAutoSync();
    }
  }

  /**
   * Get current configuration
   * 
   * @returns Current synchronization configuration
   */
  getConfig(): PhraseSyncConfig {
    return { ...this.config };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoSync();
    this.clearQueue();
  }
}

/**
 * Default Phrase Synchronization Manager instance
 */
export const phraseSyncManager = new PhraseSyncManager();

/**
 * Mock Phrase Synchronization Manager for development/testing
 */
export class MockPhraseSyncManager extends PhraseSyncManager {
  private mockDelayMs: number = 200;

  constructor(config?: Partial<PhraseSyncConfig>) {
    super(new MockVoiceHttpClient(), config);
  }

  async syncPhraseWithRecording(
    phrase: PhraseData,
    recording: VoiceRecording
  ): Promise<SyncResult> {
    await this.wait(this.mockDelayMs);

    return {
      success: true,
      phraseId: phrase.id,
      recordingId: `recording-${phrase.id}`,
      timestamp: new Date().toISOString(),
    };
  }

  async getSyncStatus(phraseId: string): Promise<SyncStatus> {
    await this.wait(this.mockDelayMs / 2);

    return {
      phraseId,
      status: 'synced',
      lastUpdated: new Date().toISOString(),
      retries: 0,
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  setMockDelay(ms: number): void {
    this.mockDelayMs = ms;
  }
}

/**
 * Mock Voice HTTP Client for testing
 */
class MockVoiceHttpClient extends VoiceHttpClient {
  async uploadVoiceRecording(
    recording: VoiceRecording
  ): Promise<VoiceApiResponse<{ recordingId: string }>> {
    await this.wait(100);

    return {
      success: true,
      data: {
        recordingId: `recording-${Date.now()}`,
      },
    };
  }

  async syncPhraseData(
    phrase: PhraseData
  ): Promise<VoiceApiResponse<{ phraseId: string; recordingId: string }>> {
    await this.wait(100);

    return {
      success: true,
      data: {
        phraseId: phrase.id,
        recordingId: `recording-${phrase.id}`,
      },
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create Phrase Synchronization Manager based on environment
 */
export function createPhraseSyncManager(
  useMock: boolean = false
): PhraseSyncManager {
  if (useMock || import.meta.env.MODE === 'test') {
    return new MockPhraseSyncManager();
  }
  return new PhraseSyncManager();
}