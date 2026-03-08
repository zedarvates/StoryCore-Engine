
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptOptimizer } from '../PromptOptimizationService';
import { ollamaClient } from '../../llm/OllamaClient';

// Mock OllamaClient
vi.mock('../../llm/OllamaClient', () => ({
  ollamaClient: {
    generate: vi.fn()
  }
}));

describe('PromptOptimizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('suggestTemplate', () => {
    it('should suggest a template based on source text', async () => {
      // Setup mock response
      vi.mocked(ollamaClient.generate).mockResolvedValue('costume-1');

      const tasks = [
        { id: 'costume-1', title: 'Costume Design', occupation: 'Costume Designer' },
        { id: 'visual-1', title: 'Lighting', occupation: 'Director of Photography' }
      ];

      const result = await promptOptimizer.suggestTemplate('1920s clothes', tasks);

      expect(ollamaClient.generate).toHaveBeenCalled();
      expect(result).toBe('costume-1');
    });

    it('should return null if source is empty', async () => {
      const result = await promptOptimizer.suggestTemplate('', []);
      expect(result).toBeNull();
      expect(ollamaClient.generate).not.toHaveBeenCalled();
    });

    it('should return null if AI fails', async () => {
      vi.mocked(ollamaClient.generate).mockRejectedValue(new Error('AI error'));
      const result = await promptOptimizer.suggestTemplate('test', []);
      expect(result).toBeNull();
    });
  });
});
