/**
 * Story Generation Service Tests
 * 
 * Tests for the story generation service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStoryContent } from '../storyGenerationService';
import type { StoryGenerationParams } from '../../types/story';

// Mock the LLM service
const mockGenerateText = vi.fn();

vi.mock('../llmService', () => ({
  getLLMService: () => ({
    generateText: mockGenerateText,
  }),
}));

describe('Story Generation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateText.mockReset();
  });

  describe('generateStoryContent', () => {
    it('should generate story content with valid parameters', async () => {
      // Arrange
      const mockStoryContent = 'Once upon a time in a magical kingdom...';
      mockGenerateText.mockResolvedValue(mockStoryContent);

      const params: StoryGenerationParams = {
        genre: ['fantasy'],
        tone: ['epic'],
        length: 'short',
        characters: [
          {
            name: 'Aria',
            archetype: 'Hero',
            personality_traits: ['brave', 'determined'],
            backstory: 'A young warrior seeking justice',
            visual_identity: {
              hair_color: 'black',
              eye_color: 'green',
              build: 'athletic',
            },
          },
        ],
        locations: [
          {
            name: 'Crystal Castle',
            type: 'castle',
            description: 'A magnificent fortress made of crystal',
            atmosphere: 'mystical',
            significance: 'The seat of power',
          },
        ],
        worldContext: {
          id: 'world-1',
          name: 'Eldoria',
          genre: ['fantasy'],
          tone: ['epic'],
          rules: [
            {
              id: 'rule-1',
              category: 'magic',
              rule: 'Magic requires sacrifice',
              description: 'All magic comes at a cost',
            },
          ],
          culturalElements: {
            languages: ['Eldorian', 'Ancient Tongue'],
            customs: ['Honor duels', 'Crystal ceremonies'],
            socialStructure: 'Feudal monarchy',
          },
          atmosphere: 'Mystical and ancient',
        },
      };

      // Act
      const result = await generateStoryContent(params);

      // Assert
      expect(result).toBe(mockStoryContent);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      
      // Verify the prompt includes all the context
      const callArgs = mockGenerateText.mock.calls[0];
      const prompt = callArgs[0];
      
      expect(prompt).toContain('fantasy');
      expect(prompt).toContain('epic');
      expect(prompt).toContain('500-1000'); // short length
      expect(prompt).toContain('Aria');
      expect(prompt).toContain('Crystal Castle');
      expect(prompt).toContain('Eldoria');
      expect(prompt).toContain('Magic requires sacrifice');
    });

    it('should handle medium length stories', async () => {
      // Arrange
      mockGenerateText.mockResolvedValue('A medium length story...');

      const params: StoryGenerationParams = {
        genre: ['sci-fi'],
        tone: ['serious'],
        length: 'medium',
        characters: [],
        locations: [],
        worldContext: {
          id: 'world-2',
          name: 'Future Earth',
          genre: ['sci-fi'],
          tone: ['serious'],
          rules: [],
          culturalElements: {},
          atmosphere: 'Dystopian',
        },
      };

      // Act
      await generateStoryContent(params);

      // Assert
      const callArgs = mockGenerateText.mock.calls[0];
      const options = callArgs[1];
      
      expect(options.maxTokens).toBe(3000); // medium length
      expect(callArgs[0]).toContain('1000-2500'); // medium word count
    });

    it('should handle long length stories', async () => {
      // Arrange
      mockGenerateText.mockResolvedValue('A long epic story...');

      const params: StoryGenerationParams = {
        genre: ['adventure'],
        tone: ['light'],
        length: 'long',
        characters: [],
        locations: [],
        worldContext: {
          id: 'world-3',
          name: 'Adventure World',
          genre: ['adventure'],
          tone: ['light'],
          rules: [],
          culturalElements: {},
          atmosphere: 'Exciting',
        },
      };

      // Act
      await generateStoryContent(params);

      // Assert
      const callArgs = mockGenerateText.mock.calls[0];
      const options = callArgs[1];
      
      expect(options.maxTokens).toBe(6000); // long length
      expect(callArgs[0]).toContain('2500-5000'); // long word count
    });

    it('should retry on LLM service failure', async () => {
      // Arrange
      mockGenerateText
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('Story content after retry');

      const params: StoryGenerationParams = {
        genre: ['fantasy'],
        tone: ['dark'],
        length: 'short',
        characters: [],
        locations: [],
        worldContext: {
          id: 'world-4',
          name: 'Dark World',
          genre: ['fantasy'],
          tone: ['dark'],
          rules: [],
          culturalElements: {},
          atmosphere: 'Grim',
        },
      };

      // Act
      const result = await generateStoryContent(params);

      // Assert
      expect(result).toBe('Story content after retry');
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      // Arrange
      mockGenerateText.mockRejectedValue(new Error('Persistent network error'));

      const params: StoryGenerationParams = {
        genre: ['fantasy'],
        tone: ['dark'],
        length: 'short',
        characters: [],
        locations: [],
        worldContext: {
          id: 'world-5',
          name: 'Test World',
          genre: ['fantasy'],
          tone: ['dark'],
          rules: [],
          culturalElements: {},
          atmosphere: 'Test',
        },
      };

      // Act & Assert
      await expect(generateStoryContent(params)).rejects.toThrow();
      expect(mockGenerateText).toHaveBeenCalledTimes(3); // Default max retries
    });

    it('should handle empty response from LLM', async () => {
      // Arrange
      mockGenerateText.mockResolvedValue('');

      const params: StoryGenerationParams = {
        genre: ['fantasy'],
        tone: ['dark'],
        length: 'short',
        characters: [],
        locations: [],
        worldContext: {
          id: 'world-6',
          name: 'Test World',
          genre: ['fantasy'],
          tone: ['dark'],
          rules: [],
          culturalElements: {},
          atmosphere: 'Test',
        },
      };

      // Act & Assert
      await expect(generateStoryContent(params)).rejects.toThrow('Empty response');
    });

    it('should handle multiple genres and tones', async () => {
      // Arrange
      mockGenerateText.mockResolvedValue('Multi-genre story...');

      const params: StoryGenerationParams = {
        genre: ['fantasy', 'adventure', 'mystery'],
        tone: ['dark', 'mysterious', 'epic'],
        length: 'medium',
        characters: [],
        locations: [],
        worldContext: {
          id: 'world-7',
          name: 'Complex World',
          genre: ['fantasy', 'adventure'],
          tone: ['dark', 'mysterious'],
          rules: [],
          culturalElements: {},
          atmosphere: 'Complex',
        },
      };

      // Act
      await generateStoryContent(params);

      // Assert
      const callArgs = mockGenerateText.mock.calls[0];
      const prompt = callArgs[0];
      
      expect(prompt).toContain('fantasy, adventure, mystery');
      expect(prompt).toContain('dark, mysterious, epic');
    });

    it('should handle characters without optional fields', async () => {
      // Arrange
      mockGenerateText.mockResolvedValue('Story with minimal character...');

      const params: StoryGenerationParams = {
        genre: ['fantasy'],
        tone: ['light'],
        length: 'short',
        characters: [
          {
            name: 'Bob',
            // No other fields
          },
        ],
        locations: [],
        worldContext: {
          id: 'world-8',
          name: 'Simple World',
          genre: ['fantasy'],
          tone: ['light'],
          rules: [],
          culturalElements: {},
          atmosphere: 'Simple',
        },
      };

      // Act
      const result = await generateStoryContent(params);

      // Assert
      expect(result).toBe('Story with minimal character...');
      const callArgs = mockGenerateText.mock.calls[0];
      const prompt = callArgs[0];
      expect(prompt).toContain('Bob');
    });

    it('should handle locations without optional fields', async () => {
      // Arrange
      mockGenerateText.mockResolvedValue('Story with minimal location...');

      const params: StoryGenerationParams = {
        genre: ['fantasy'],
        tone: ['light'],
        length: 'short',
        characters: [],
        locations: [
          {
            name: 'The Tavern',
            // No other fields
          },
        ],
        worldContext: {
          id: 'world-9',
          name: 'Simple World',
          genre: ['fantasy'],
          tone: ['light'],
          rules: [],
          culturalElements: {},
          atmosphere: 'Simple',
        },
      };

      // Act
      const result = await generateStoryContent(params);

      // Assert
      expect(result).toBe('Story with minimal location...');
      const callArgs = mockGenerateText.mock.calls[0];
      const prompt = callArgs[0];
      expect(prompt).toContain('The Tavern');
    });

    it('should handle world context without optional fields', async () => {
      // Arrange
      mockGenerateText.mockResolvedValue('Story with minimal world...');

      const params: StoryGenerationParams = {
        genre: ['fantasy'],
        tone: ['light'],
        length: 'short',
        characters: [],
        locations: [],
        worldContext: {
          id: 'world-10',
          name: 'Minimal World',
          genre: ['fantasy'],
          tone: ['light'],
          rules: [],
          culturalElements: {},
          atmosphere: '',
        },
      };

      // Act
      const result = await generateStoryContent(params);

      // Assert
      expect(result).toBe('Story with minimal world...');
    });
  });
});

  describe('generateStorySummary', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockGenerateText.mockReset();
    });

    it('should generate summary from story content', async () => {
      // Arrange
      const { generateStorySummary } = await import('../storyGenerationService');
      const mockSummary = 'A brave hero embarks on a quest to save the kingdom from darkness.';
      mockGenerateText.mockResolvedValue(mockSummary);

      const storyContent = 'Once upon a time in a magical kingdom, a brave hero named Aria set out on a quest...';

      // Act
      const result = await generateStorySummary(storyContent);

      // Assert
      expect(result).toBe(mockSummary);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      
      const callArgs = mockGenerateText.mock.calls[0];
      const prompt = callArgs[0];
      const options = callArgs[1];
      
      expect(prompt).toContain(storyContent);
      expect(options.temperature).toBe(0.5); // Lower temperature for summaries
      expect(options.maxTokens).toBe(500); // Concise summaries
    });

    it('should retry on LLM service failure', async () => {
      // Arrange
      const { generateStorySummary } = await import('../storyGenerationService');
      mockGenerateText
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('Summary after retry');

      // Act
      const result = await generateStorySummary('Story content...');

      // Assert
      expect(result).toBe('Summary after retry');
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });

    it('should handle empty response from LLM', async () => {
      // Arrange
      const { generateStorySummary } = await import('../storyGenerationService');
      mockGenerateText.mockResolvedValue('');

      // Act & Assert
      await expect(generateStorySummary('Story content...')).rejects.toThrow('Empty response');
    });

    it('should throw error after max retries', async () => {
      // Arrange
      const { generateStorySummary } = await import('../storyGenerationService');
      mockGenerateText.mockRejectedValue(new Error('Persistent error'));

      // Act & Assert
      await expect(generateStorySummary('Story content...')).rejects.toThrow();
      expect(mockGenerateText).toHaveBeenCalledTimes(3);
    });
  });

  describe('createCharacter', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockGenerateText.mockReset();
    });

    it('should create character with world context', async () => {
      // Arrange
      const { createCharacter } = await import('../storyGenerationService');
      const mockCharacter = {
        name: 'Zara',
        archetype: 'Warrior',
        personality_traits: ['brave', 'loyal'],
        backstory: 'A skilled fighter from the northern tribes',
        visual_identity: {
          hair_color: 'red',
          eye_color: 'blue',
          build: 'muscular',
        },
      };
      mockGenerateText.mockResolvedValue(JSON.stringify(mockCharacter));

      const request = {
        name: 'Zara',
        role: 'Warrior',
        description: 'A skilled fighter from the northern tribes',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        tone: ['epic'],
        rules: [
          {
            id: 'rule-1',
            category: 'magic',
            rule: 'Magic requires sacrifice',
            description: 'All magic comes at a cost',
          },
        ],
        culturalElements: {
          languages: ['Eldorian'],
          customs: ['Honor duels'],
          socialStructure: 'Tribal confederation',
        },
        atmosphere: 'Mystical and ancient',
      };

      // Act
      const result = await createCharacter(request, worldContext);

      // Assert
      expect(result).toEqual(mockCharacter);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      
      const callArgs = mockGenerateText.mock.calls[0];
      const prompt = callArgs[0];
      
      expect(prompt).toContain('Zara');
      expect(prompt).toContain('Warrior');
      expect(prompt).toContain('Eldoria');
      expect(prompt).toContain('Magic requires sacrifice');
    });

    it('should handle JSON in markdown code blocks', async () => {
      // Arrange
      const { createCharacter } = await import('../storyGenerationService');
      const mockCharacter = {
        name: 'Test',
        archetype: 'Hero',
      };
      const markdownResponse = '```json\n' + JSON.stringify(mockCharacter) + '\n```';
      mockGenerateText.mockResolvedValue(markdownResponse);

      const request = {
        name: 'Test',
        role: 'Hero',
        description: 'A test character',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Test World',
        genre: ['fantasy'],
        tone: ['light'],
        rules: [],
        culturalElements: {},
        atmosphere: 'Test',
      };

      // Act
      const result = await createCharacter(request, worldContext);

      // Assert
      expect(result).toEqual(mockCharacter);
    });

    it('should validate character structure', async () => {
      // Arrange
      const { createCharacter } = await import('../storyGenerationService');
      const invalidCharacter = {
        // Missing required fields
        description: 'Invalid character',
      };
      mockGenerateText.mockResolvedValue(JSON.stringify(invalidCharacter));

      const request = {
        name: 'Invalid',
        role: 'Test',
        description: 'Test',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Test World',
        genre: ['fantasy'],
        tone: ['light'],
        rules: [],
        culturalElements: {},
        atmosphere: 'Test',
      };

      // Act & Assert
      await expect(createCharacter(request, worldContext)).rejects.toThrow('Invalid character structure');
    });

    it('should handle JSON parse errors', async () => {
      // Arrange
      const { createCharacter } = await import('../storyGenerationService');
      mockGenerateText.mockResolvedValue('Not valid JSON');

      const request = {
        name: 'Test',
        role: 'Hero',
        description: 'Test',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Test World',
        genre: ['fantasy'],
        tone: ['light'],
        rules: [],
        culturalElements: {},
        atmosphere: 'Test',
      };

      // Act & Assert
      await expect(createCharacter(request, worldContext)).rejects.toThrow('Failed to parse character JSON');
    });

    it('should retry on LLM service failure', async () => {
      // Arrange
      const { createCharacter } = await import('../storyGenerationService');
      const mockCharacter = {
        name: 'Retry Test',
        archetype: 'Hero',
      };
      mockGenerateText
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(JSON.stringify(mockCharacter));

      const request = {
        name: 'Retry Test',
        role: 'Hero',
        description: 'Test retry',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Test World',
        genre: ['fantasy'],
        tone: ['light'],
        rules: [],
        culturalElements: {},
        atmosphere: 'Test',
      };

      // Act
      const result = await createCharacter(request, worldContext);

      // Assert
      expect(result).toEqual(mockCharacter);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('createLocation', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockGenerateText.mockReset();
    });

    it('should create location with world context', async () => {
      // Arrange
      const { createLocation } = await import('../storyGenerationService');
      const mockLocation = {
        name: 'Mystic Forest',
        type: 'forest',
        description: 'An ancient forest filled with magical creatures',
        atmosphere: 'Enchanting and mysterious',
        significance: 'Home to the ancient spirits',
      };
      mockGenerateText.mockResolvedValue(JSON.stringify(mockLocation));

      const request = {
        name: 'Mystic Forest',
        type: 'forest',
        description: 'An ancient forest filled with magical creatures',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Eldoria',
        genre: ['fantasy'],
        tone: ['mystical'],
        rules: [
          {
            id: 'rule-1',
            category: 'nature',
            rule: 'Nature is sacred',
            description: 'All natural places are protected',
          },
        ],
        culturalElements: {
          languages: ['Eldorian'],
          customs: ['Forest rituals'],
        },
        atmosphere: 'Mystical and ancient',
      };

      // Act
      const result = await createLocation(request, worldContext);

      // Assert
      expect(result).toEqual(mockLocation);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      
      const callArgs = mockGenerateText.mock.calls[0];
      const prompt = callArgs[0];
      
      expect(prompt).toContain('Mystic Forest');
      expect(prompt).toContain('forest');
      expect(prompt).toContain('Eldoria');
      expect(prompt).toContain('Nature is sacred');
    });

    it('should handle JSON in markdown code blocks', async () => {
      // Arrange
      const { createLocation } = await import('../storyGenerationService');
      const mockLocation = {
        name: 'Test Location',
        type: 'castle',
      };
      const markdownResponse = '```json\n' + JSON.stringify(mockLocation) + '\n```';
      mockGenerateText.mockResolvedValue(markdownResponse);

      const request = {
        name: 'Test Location',
        type: 'castle',
        description: 'A test location',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Test World',
        genre: ['fantasy'],
        tone: ['light'],
        rules: [],
        culturalElements: {},
        atmosphere: 'Test',
      };

      // Act
      const result = await createLocation(request, worldContext);

      // Assert
      expect(result).toEqual(mockLocation);
    });

    it('should validate location structure', async () => {
      // Arrange
      const { createLocation } = await import('../storyGenerationService');
      const invalidLocation = {
        // Missing required fields
        description: 'Invalid location',
      };
      mockGenerateText.mockResolvedValue(JSON.stringify(invalidLocation));

      const request = {
        name: 'Invalid',
        type: 'test',
        description: 'Test',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Test World',
        genre: ['fantasy'],
        tone: ['light'],
        rules: [],
        culturalElements: {},
        atmosphere: 'Test',
      };

      // Act & Assert
      await expect(createLocation(request, worldContext)).rejects.toThrow('Invalid location structure');
    });

    it('should handle JSON parse errors', async () => {
      // Arrange
      const { createLocation } = await import('../storyGenerationService');
      mockGenerateText.mockResolvedValue('Not valid JSON');

      const request = {
        name: 'Test',
        type: 'castle',
        description: 'Test',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Test World',
        genre: ['fantasy'],
        tone: ['light'],
        rules: [],
        culturalElements: {},
        atmosphere: 'Test',
      };

      // Act & Assert
      await expect(createLocation(request, worldContext)).rejects.toThrow('Failed to parse location JSON');
    });

    it('should retry on LLM service failure', async () => {
      // Arrange
      const { createLocation } = await import('../storyGenerationService');
      const mockLocation = {
        name: 'Retry Test',
        type: 'castle',
      };
      mockGenerateText
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(JSON.stringify(mockLocation));

      const request = {
        name: 'Retry Test',
        type: 'castle',
        description: 'Test retry',
      };

      const worldContext = {
        id: 'world-1',
        name: 'Test World',
        genre: ['fantasy'],
        tone: ['light'],
        rules: [],
        culturalElements: {},
        atmosphere: 'Test',
      };

      // Act
      const result = await createLocation(request, worldContext);

      // Assert
      expect(result).toEqual(mockLocation);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors with descriptive messages', async () => {
      // Arrange
      const { handleLLMError } = await import('../storyGenerationService');
      const error = new Error('network connection failed');

      // Act
      const message = handleLLMError(error);

      // Assert
      expect(message).toContain('Network error');
      expect(message).toContain('Unable to connect');
    });

    it('should handle timeout errors with descriptive messages', async () => {
      // Arrange
      const { handleLLMError } = await import('../storyGenerationService');
      const error = new Error('request timeout exceeded');

      // Act
      const message = handleLLMError(error);

      // Assert
      expect(message).toContain('Request timeout');
      expect(message).toContain('took too long');
    });

    it('should handle rate limit errors with descriptive messages', async () => {
      // Arrange
      const { handleLLMError } = await import('../storyGenerationService');
      const error = new Error('rate limit exceeded');

      // Act
      const message = handleLLMError(error);

      // Assert
      expect(message).toContain('Rate limit exceeded');
      expect(message).toContain('Too many requests');
    });

    it('should handle content filter errors with descriptive messages', async () => {
      // Arrange
      const { handleLLMError } = await import('../storyGenerationService');
      const error = new Error('content filter triggered');

      // Act
      const message = handleLLMError(error);

      // Assert
      expect(message).toContain('Content filter');
      expect(message).toContain('filtered');
    });

    it('should handle unknown errors with generic message', async () => {
      // Arrange
      const { handleLLMError } = await import('../storyGenerationService');
      const error = new Error('Something unexpected happened');

      // Act
      const message = handleLLMError(error);

      // Assert
      expect(message).toContain('Generation error');
      expect(message).toContain('Something unexpected happened');
    });
  });

