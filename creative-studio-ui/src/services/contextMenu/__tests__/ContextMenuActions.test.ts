import { describe, it, expect, vi } from 'vitest';
import {
  generateDuplicateName,
  duplicateShot,
  duplicateShots,
  requiresDeleteConfirmation,
  confirmDelete,
  deleteShots,
  exportShots
} from '../ContextMenuActions';
import { Shot } from '../../../types';

describe('ContextMenuActions', () => {
  const mockShot: Shot = {
    id: 'shot-1',
    title: 'Test Shot',
    description: 'Test description',
    duration: 5,
    position: 0,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: []
  };

  describe('generateDuplicateName', () => {
    it('generates name with (2) suffix for first duplicate', () => {
      const result = generateDuplicateName('Test Shot', ['Test Shot']);
      expect(result).toBe('Test Shot (2)');
    });

    it('generates name with (3) suffix when (2) exists', () => {
      const result = generateDuplicateName('Test Shot', ['Test Shot', 'Test Shot (2)']);
      expect(result).toBe('Test Shot (3)');
    });

    it('finds next available number', () => {
      const result = generateDuplicateName('Test Shot', [
        'Test Shot',
        'Test Shot (2)',
        'Test Shot (3)',
        'Test Shot (4)'
      ]);
      expect(result).toBe('Test Shot (5)');
    });

    it('handles gaps in numbering', () => {
      const result = generateDuplicateName('Test Shot', [
        'Test Shot',
        'Test Shot (2)',
        'Test Shot (4)' // Gap at (3)
      ]);
      expect(result).toBe('Test Shot (3)');
    });
  });

  describe('duplicateShot', () => {
    it('creates a duplicate with unique ID', () => {
      const duplicate = duplicateShot(mockShot, [mockShot]);
      expect(duplicate.id).not.toBe(mockShot.id);
      expect(duplicate.id).toMatch(/^shot-/);
    });

    it('creates a duplicate with unique name', () => {
      const duplicate = duplicateShot(mockShot, [mockShot]);
      expect(duplicate.title).toBe('Test Shot (2)');
    });

    it('increments position', () => {
      const duplicate = duplicateShot(mockShot, [mockShot]);
      expect(duplicate.position).toBe(mockShot.position + 1);
    });

    it('preserves other properties', () => {
      const duplicate = duplicateShot(mockShot, [mockShot]);
      expect(duplicate.description).toBe(mockShot.description);
      expect(duplicate.duration).toBe(mockShot.duration);
    });

    it('adds metadata about duplication', () => {
      const duplicate = duplicateShot(mockShot, [mockShot]);
      expect(duplicate.metadata?.duplicatedFrom).toBe(mockShot.id);
      expect(duplicate.metadata?.createdAt).toBeDefined();
    });
  });

  describe('duplicateShots', () => {
    it('duplicates multiple shots', () => {
      const shots: Shot[] = [
        { ...mockShot, id: 'shot-1', title: 'Shot 1' },
        { ...mockShot, id: 'shot-2', title: 'Shot 2' }
      ];

      const duplicates = duplicateShots(shots, shots);
      expect(duplicates).toHaveLength(2);
      expect(duplicates[0].title).toBe('Shot 1 (2)');
      expect(duplicates[1].title).toBe('Shot 2 (2)');
    });
  });

  describe('requiresDeleteConfirmation', () => {
    it('returns false for 5 or fewer shots', () => {
      expect(requiresDeleteConfirmation(1)).toBe(false);
      expect(requiresDeleteConfirmation(5)).toBe(false);
    });

    it('returns true for more than 5 shots', () => {
      expect(requiresDeleteConfirmation(6)).toBe(true);
      expect(requiresDeleteConfirmation(10)).toBe(true);
    });
  });

  describe('confirmDelete', () => {
    it('returns true without confirmation for 5 or fewer shots', async () => {
      const result = await confirmDelete(5);
      expect(result).toBe(true);
    });

    it('shows confirmation dialog for more than 5 shots', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const result = await confirmDelete(6);
      expect(confirmSpy).toHaveBeenCalled();
      expect(result).toBe(true);
      confirmSpy.mockRestore();
    });

    it('returns false when user cancels confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const result = await confirmDelete(6);
      expect(result).toBe(false);
      confirmSpy.mockRestore();
    });
  });

  describe('deleteShots', () => {
    it('calls onDelete when confirmed', async () => {
      const onDelete = vi.fn();
      const shots = [mockShot];
      
      const result = await deleteShots(shots, onDelete);
      expect(result).toBe(true);
      expect(onDelete).toHaveBeenCalledWith(['shot-1']);
    });

    it('does not call onDelete when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const onDelete = vi.fn();
      const shots = Array(6).fill(mockShot).map((s, i) => ({ ...s, id: `shot-${i}` }));
      
      const result = await deleteShots(shots, onDelete);
      expect(result).toBe(false);
      expect(onDelete).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });

  describe('exportShots', () => {
    it('creates a download link', () => {
      // Mock URL.createObjectURL for test environment
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();
      
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
      
      exportShots([mockShot]);
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });
});
