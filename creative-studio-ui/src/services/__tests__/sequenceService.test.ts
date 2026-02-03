/**
 * Tests for SequenceService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sequenceService, SequenceData } from '../sequenceService';

describe('SequenceService', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Clear window.electronAPI
    (window as any).electronAPI = undefined;
  });

  describe('Environment Detection', () => {
    it('should detect Electron environment when API is available', () => {
      // Mock Electron API
      (window as any).electronAPI = {
        fs: {
          readdir: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
        },
      };

      // Access private method via type assertion
      const isElectron = (sequenceService as any).isElectronAvailable();
      expect(isElectron).toBe(true);
    });

    it('should detect Web environment when Electron API is not available', () => {
      // No Electron API
      (window as any).electronAPI = undefined;

      const isElectron = (sequenceService as any).isElectronAvailable();
      expect(isElectron).toBe(false);
    });
  });

  describe('Load Sequences - Web Mode', () => {
    beforeEach(() => {
      // Ensure we're in web mode
      (window as any).electronAPI = undefined;
      
      // Mock fetch
      global.fetch = vi.fn();
    });

    it('should load sequences via Web API', async () => {
      const mockSequences: SequenceData[] = [
        {
          id: '1',
          name: 'Sequence 1',
          order: 1,
          duration: 10,
          shots_count: 5,
          resume: 'Test sequence',
          shot_ids: ['shot1', 'shot2'],
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sequences: mockSequences, total: 1 }),
      });

      const result = await sequenceService.loadSequences('/test/project');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sequences/')
      );
      expect(result).toEqual(mockSequences);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        sequenceService.loadSequences('/test/project')
      ).rejects.toThrow('Failed to load sequences');
    });
  });

  describe('Load Sequences - Electron Mode', () => {
    beforeEach(() => {
      // Mock Electron API
      (window as any).electronAPI = {
        fs: {
          readdir: vi.fn(),
          readFile: vi.fn(),
        },
      };
    });

    it('should load sequences via Electron API', async () => {
      const mockSequenceData = {
        id: '1',
        name: 'Sequence 1',
        order: 1,
        duration: 10,
        shots_count: 5,
        resume: 'Test sequence',
        shot_ids: ['shot1', 'shot2'],
      };

      // Mock file system operations
      (window as any).electronAPI.fs.readdir.mockResolvedValueOnce([
        'sequence_001.json',
        'other_file.txt',
      ]);

      const encoder = new TextEncoder();
      const buffer = encoder.encode(JSON.stringify(mockSequenceData));
      (window as any).electronAPI.fs.readFile.mockResolvedValueOnce(buffer);

      const result = await sequenceService.loadSequences('/test/project');

      expect((window as any).electronAPI.fs.readdir).toHaveBeenCalledWith(
        '/test/project/sequences'
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(mockSequenceData);
    });

    it('should filter non-sequence files', async () => {
      (window as any).electronAPI.fs.readdir.mockResolvedValueOnce([
        'sequence_001.json',
        'readme.txt',
        'config.json',
      ]);

      const mockSequenceData = {
        id: '1',
        name: 'Sequence 1',
        order: 1,
        duration: 10,
        shots_count: 5,
        resume: 'Test',
        shot_ids: [],
      };

      const encoder = new TextEncoder();
      const buffer = encoder.encode(JSON.stringify(mockSequenceData));
      (window as any).electronAPI.fs.readFile.mockResolvedValueOnce(buffer);

      const result = await sequenceService.loadSequences('/test/project');

      // Should only read sequence files
      expect((window as any).electronAPI.fs.readFile).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('should ensure shot_ids is an array', async () => {
      const mockSequenceData = {
        id: '1',
        name: 'Sequence 1',
        order: 1,
        duration: 10,
        shots_count: 5,
        resume: 'Test',
        // Missing shot_ids
      };

      (window as any).electronAPI.fs.readdir.mockResolvedValueOnce([
        'sequence_001.json',
      ]);

      const encoder = new TextEncoder();
      const buffer = encoder.encode(JSON.stringify(mockSequenceData));
      (window as any).electronAPI.fs.readFile.mockResolvedValueOnce(buffer);

      const result = await sequenceService.loadSequences('/test/project');

      expect(result[0].shot_ids).toEqual([]);
    });

    it('should sort sequences by order', async () => {
      const sequences = [
        { id: '3', order: 3, name: 'Seq 3', duration: 0, shots_count: 0, resume: '', shot_ids: [] },
        { id: '1', order: 1, name: 'Seq 1', duration: 0, shots_count: 0, resume: '', shot_ids: [] },
        { id: '2', order: 2, name: 'Seq 2', duration: 0, shots_count: 0, resume: '', shot_ids: [] },
      ];

      (window as any).electronAPI.fs.readdir.mockResolvedValueOnce([
        'sequence_003.json',
        'sequence_001.json',
        'sequence_002.json',
      ]);

      const encoder = new TextEncoder();
      sequences.forEach((seq) => {
        const buffer = encoder.encode(JSON.stringify(seq));
        (window as any).electronAPI.fs.readFile.mockResolvedValueOnce(buffer);
      });

      const result = await sequenceService.loadSequences('/test/project');

      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(2);
      expect(result[2].order).toBe(3);
    });
  });

  describe('Get Sequence', () => {
    it('should get a specific sequence in Web mode', async () => {
      (window as any).electronAPI = undefined;

      const mockSequence: SequenceData = {
        id: '1',
        name: 'Sequence 1',
        order: 1,
        duration: 10,
        shots_count: 5,
        resume: 'Test',
        shot_ids: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockSequence,
      });

      const result = await sequenceService.getSequence('/test/project', '1');

      expect(result).toEqual(mockSequence);
    });

    it('should return null when sequence not found', async () => {
      (window as any).electronAPI = undefined;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await sequenceService.getSequence('/test/project', '999');

      expect(result).toBeNull();
    });
  });

  describe('Create Sequence', () => {
    it('should create a sequence in Web mode', async () => {
      (window as any).electronAPI = undefined;

      const newSequence: SequenceData = {
        id: '1',
        name: 'New Sequence',
        order: 1,
        duration: 0,
        shots_count: 0,
        resume: '',
        shot_ids: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...newSequence, created_at: '2024-01-01', updated_at: '2024-01-01' }),
      });

      const result = await sequenceService.createSequence('/test/project', newSequence);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sequences/'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(result).toHaveProperty('created_at');
    });
  });

  describe('Update Sequence', () => {
    it('should update a sequence in Web mode', async () => {
      (window as any).electronAPI = undefined;

      const updatedSequence: SequenceData = {
        id: '1',
        name: 'Updated Sequence',
        order: 1,
        duration: 15,
        shots_count: 7,
        resume: 'Updated',
        shot_ids: ['shot1'],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...updatedSequence, updated_at: '2024-01-02' }),
      });

      const result = await sequenceService.updateSequence('/test/project', '1', updatedSequence);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sequences/'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
      expect(result).toHaveProperty('updated_at');
    });
  });

  describe('Delete Sequence', () => {
    it('should delete a sequence in Web mode', async () => {
      (window as any).electronAPI = undefined;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
      });

      await sequenceService.deleteSequence('/test/project', '1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/sequences/'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle delete errors', async () => {
      (window as any).electronAPI = undefined;

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        sequenceService.deleteSequence('/test/project', '999')
      ).rejects.toThrow();
    });
  });
});
