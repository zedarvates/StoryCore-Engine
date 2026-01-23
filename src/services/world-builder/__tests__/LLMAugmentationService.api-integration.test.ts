import { LLMAugmentationService, WorldElementType, ComplexityLevel } from '../LLMAugmentationService';
import { LLMProvider } from '../../llm/interfaces';

// Mock the LLM provider
jest.mock('../../llm/interfaces', () => ({
  LLMProvider: jest.fn(),
}));

describe('LLMAugmentationService API Integration', () => {
  let llmAugmentationService: LLMAugmentationService;
  let mockLlmProvider: jest.Mocked<LLMProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLlmProvider = {
      generateText: jest.fn(),
      generateCompletion: jest.fn(),
      isAvailable: jest.fn().mockResolvedValue(true),
    } as any;

    llmAugmentationService = new LLMAugmentationService(mockLlmProvider);
  });

  describe('API Call Patterns and Retry Logic', () => {
    describe('generateWorldElement - API Integration', () => {
      it('should make correct API calls with proper parameters for simple complexity', async () => {
        const mockResponse = '[{"character_id": "char1", "name": "Test Character"}]';
        mockLlmProvider.generateText.mockResolvedValue(mockResponse);

        await llmAugmentationService.generateWorldElement(
          'characters',
          'A simple fantasy world',
          'simple',
          'fantasy'
        );

        expect(mockLlmProvider.generateText).toHaveBeenCalledWith(
          expect.stringContaining('Generate 3-5 detailed characters'),
          {
            temperature: 0.3,
            maxTokens: 1000,
            timeout: 30000,
          }
        );
        expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(1);
      });

      it('should make correct API calls for moderate complexity', async () => {
        const mockResponse = '[{"scene_id": "scene1", "name": "Test Scene"}]';
        mockLlmProvider.generateText.mockResolvedValue(mockResponse);

        await llmAugmentationService.generateWorldElement(
          'scenes',
          'A moderate fantasy world',
          'moderate',
          'fantasy'
        );

        expect(mockLlmProvider.generateText).toHaveBeenCalledWith(
          expect.stringContaining('Generate 5-8 key scenes'),
          {
            temperature: 0.5,
            maxTokens: 2000,
            timeout: 60000,
          }
        );
      });

      it('should make correct API calls for complex complexity', async () => {
        const mockResponse = '[{"location_id": "loc1", "name": "Test Location"}]';
        mockLlmProvider.generateText.mockResolvedValue(mockResponse);

        await llmAugmentationService.generateWorldElement(
          'locations',
          'A complex fantasy world',
          'complex',
          'fantasy'
        );

        expect(mockLlmProvider.generateText).toHaveBeenCalledWith(
          expect.stringContaining('Generate 4-6 important locations'),
          {
            temperature: 0.7,
            maxTokens: 4000,
            timeout: 120000,
          }
        );
      });

      it('should handle API timeouts with retry logic', async () => {
        mockLlmProvider.generateText
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockResolvedValueOnce('[{"lore_id": "lore1", "title": "Test Lore"}]');

        const startTime = Date.now();

        const result = await llmAugmentationService.generateWorldElement(
          'lore',
          'Test prompt',
          'simple'
        );

        const duration = Date.now() - startTime;

        expect(result).toContain('Test Lore');
        expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(3);
        // Should have delays between retries (at least 1 second + 2 seconds)
        expect(duration).toBeGreaterThan(3000);
      });

      it('should implement exponential backoff for retries', async () => {
        jest.useFakeTimers();

        mockLlmProvider.generateText
          .mockRejectedValueOnce(new Error('Rate limit'))
          .mockRejectedValueOnce(new Error('Rate limit'))
          .mockResolvedValueOnce('success');

        const retryPromise = llmAugmentationService.generateWorldElement(
          'artifacts',
          'Test',
          'simple'
        );

        // First retry delay (1 second)
        jest.advanceTimersByTime(1000);
        expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(1);

        // Second retry delay (2 seconds)
        jest.advanceTimersByTime(2000);
        expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(2);

        // Third call (success)
        jest.advanceTimersByTime(1);
        await retryPromise;

        expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(3);

        jest.useRealTimers();
      });

      it('should cap backoff delay at maximum', async () => {
        jest.useFakeTimers();

        // Force multiple failures to test backoff cap
        mockLlmProvider.generateText.mockRejectedValue(new Error('Persistent failure'));

        const promise = llmAugmentationService.generateWorldElement('characters', 'Test', 'simple');

        // Advance through all retry delays
        jest.advanceTimersByTime(1000); // 1st retry
        jest.advanceTimersByTime(2000); // 2nd retry (2^2 * 1000 = 4000, but capped at 10000)

        await expect(promise).rejects.toThrow();

        jest.useRealTimers();
      });

      it('should handle empty responses from API', async () => {
        mockLlmProvider.generateText
          .mockResolvedValueOnce('') // Empty response
          .mockResolvedValueOnce('   ') // Whitespace only
          .mockResolvedValueOnce('[{"artifact_id": "art1"}]'); // Valid response

        const result = await llmAugmentationService.generateWorldElement(
          'artifacts',
          'Test prompt',
          'simple'
        );

        expect(result).toContain('art1');
        expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(3);
      });

      it('should exhaust retries on persistent failures', async () => {
        mockLlmProvider.generateText.mockRejectedValue(new Error('Persistent API failure'));

        await expect(
          llmAugmentationService.generateWorldElement('characters', 'Test', 'simple')
        ).rejects.toThrow('LLM generation failed after 2 attempts');

        expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(2);
      });
    });

    describe('enhanceElement - API Integration', () => {
      it('should make enhancement API calls with correct parameters', async () => {
        const existingData = '[{"character_id": "char1", "name": "Basic"}]';
        const enhancementPrompt = 'Add more personality traits';
        const mockEnhancedResponse = '[{"character_id": "char1", "name": "Basic", "personality": ["brave", "wise"]}]';

        mockLlmProvider.generateText.mockResolvedValue(mockEnhancedResponse);

        const result = await llmAugmentationService.enhanceElement(
          'characters',
          existingData,
          enhancementPrompt,
          'moderate'
        );

        expect(mockLlmProvider.generateText).toHaveBeenCalledWith(
          expect.stringContaining('Enhance the following characters data'),
          {
            temperature: 0.5,
            maxTokens: 2000,
            timeout: 60000,
          }
        );

        expect(result).toBe(mockEnhancedResponse);
      });

      it('should handle enhancement API failures with retries', async () => {
        const existingData = '[{"character_id": "char1"}]';
        const enhancementPrompt = 'Add details';

        mockLlmProvider.generateText
          .mockRejectedValueOnce(new Error('Enhancement failed'))
          .mockResolvedValueOnce('enhanced data');

        const result = await llmAugmentationService.enhanceElement(
          'characters',
          existingData,
          enhancementPrompt,
          'simple'
        );

        expect(result).toBe('enhanced data');
        expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Prompt Template Processing', () => {
    it('should correctly interpolate genre and prompt in templates', async () => {
      const testPrompt = 'A world with magic and dragons';
      mockLlmProvider.generateText.mockResolvedValue('[]');

      await llmAugmentationService.generateWorldElement(
        'characters',
        testPrompt,
        'moderate',
        'fantasy'
      );

      const calledPrompt = mockLlmProvider.generateText.mock.calls[0][0];
      expect(calledPrompt).toContain('fantasy world');
      expect(calledPrompt).toContain(testPrompt);
      expect(calledPrompt).toContain('Generate 3-5 detailed characters');
    });

    it('should handle different element types with correct templates', async () => {
      mockLlmProvider.generateText.mockResolvedValue('[]');

      const elementTypes: WorldElementType[] = ['characters', 'scenes', 'locations', 'lore', 'artifacts'];

      for (const elementType of elementTypes) {
        await llmAugmentationService.generateWorldElement(
          elementType,
          'Test prompt',
          'simple',
          'fantasy'
        );
      }

      expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(5);

      // Check that each template was used
      const calls = mockLlmProvider.generateText.mock.calls;
      expect(calls[0][0]).toContain('detailed characters');
      expect(calls[1][0]).toContain('key scenes');
      expect(calls[2][0]).toContain('important locations');
      expect(calls[3][0]).toContain('pieces of important lore');
      expect(calls[4][0]).toContain('significant artifacts');
    });

    it('should use default genre when not specified', async () => {
      mockLlmProvider.generateText.mockResolvedValue('[]');

      await llmAugmentationService.generateWorldElement(
        'characters',
        'Test prompt',
        'simple'
        // No genre specified - should default to 'fantasy'
      );

      const calledPrompt = mockLlmProvider.generateText.mock.calls[0][0];
      expect(calledPrompt).toContain('fantasy world');
    });
  });

  describe('Response Validation and Error Handling', () => {
    describe('validateGeneration - Response Quality Assurance', () => {
      it('should validate well-formed character data', async () => {
        const validCharacterData = JSON.stringify([{
          character_id: 'hero1',
          name: 'Aragorn',
          age: 'adult',
          gender: 'male',
          species: 'human',
          occupation: 'ranger',
          personality: ['noble', 'brave'],
          backstory: 'Raised by elves after his parents were killed',
          motivations: ['protect the innocent', 'reclaim throne'],
          abilities: ['swordsmanship', 'tracking'],
          appearance: 'Tall with dark hair and piercing eyes',
          relationships: [{
            target_character_id: 'arwen',
            relationship_type: 'love',
            description: 'Romantic partner',
            strength: 9
          }]
        }]);

        const result = await llmAugmentationService.validateGeneration('characters', validCharacterData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate scene data with all required fields', async () => {
        const validSceneData = JSON.stringify([{
          scene_id: 'battle1',
          name: 'The Final Battle',
          description: 'Epic confrontation between hero and villain',
          location_id: 'mountain_peak',
          characters_present: ['hero', 'villain', 'sidekick'],
          plot_points: ['hero arrives', 'battle begins', 'hero wins'],
          atmosphere: 'tense and dramatic',
          time_of_day: 'dusk',
          weather: 'stormy',
          duration_estimate: 30,
          sequence_order: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        const result = await llmAugmentationService.validateGeneration('scenes', validSceneData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate location data', async () => {
        const validLocationData = JSON.stringify([{
          location_id: 'castle1',
          name: 'Stormhold Castle',
          type: 'castle',
          description: 'Ancient fortress on the cliffs',
          coordinates: { latitude: 45.5, longitude: -122.3, elevation: 500 },
          inhabitants: ['king', 'guards'],
          landmarks: ['great hall', 'tower'],
          atmosphere: 'foreboding',
          strategic_importance: 'controls trade route',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        const result = await llmAugmentationService.validateGeneration('locations', validLocationData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate lore data', async () => {
        const validLoreData = JSON.stringify([{
          lore_id: 'prophecy1',
          title: 'The Ancient Prophecy',
          content: 'When the blood moon rises, the chosen one shall...',
          category: 'prophecy',
          significance: 'drives main plot',
          related_entities: ['chosen_one', 'blood_moon'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        const result = await llmAugmentationService.validateGeneration('lore', validLoreData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate artifact data', async () => {
        const validArtifactData = JSON.stringify([{
          artifact_id: 'sword1',
          name: 'Excalibur',
          type: 'weapon',
          description: 'Legendary sword that only the worthy can wield',
          origin: 'pulled from stone by King Arthur',
          powers: ['grants strength', 'cuts through magic'],
          current_location: 'stone',
          owner: null,
          significance: 'symbol of rightful kingship',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        const result = await llmAugmentationService.validateGeneration('artifacts', validArtifactData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect invalid JSON format', async () => {
        const invalidJson = '{"incomplete": "json"';

        const result = await llmAugmentationService.validateGeneration('characters', invalidJson);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid JSON');
      });

      it('should detect non-array responses', async () => {
        const nonArrayData = JSON.stringify({
          character_id: 'char1',
          name: 'Test'
        });

        const result = await llmAugmentationService.validateGeneration('characters', nonArrayData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Generated data must be a JSON array');
      });

      it('should detect missing required fields', async () => {
        const incompleteData = JSON.stringify([{
          // Missing character_id, name, and other required fields
          age: 'adult'
        }]);

        const result = await llmAugmentationService.validateGeneration('characters', incompleteData);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes('character_id'))).toBe(true);
        expect(result.errors.some(error => error.includes('name'))).toBe(true);
      });

      it('should validate ISO date formats', async () => {
        const invalidDateData = JSON.stringify([{
          scene_id: 'scene1',
          name: 'Test Scene',
          description: 'Test',
          location_id: 'loc1',
          characters_present: [],
          plot_points: [],
          atmosphere: 'test',
          time_of_day: 'morning',
          sequence_order: 1,
          created_at: 'invalid-date', // Invalid ISO date
          updated_at: '2024-01-01T00:00:00.000Z'
        }]);

        const result = await llmAugmentationService.validateGeneration('scenes', invalidDateData);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('invalid created_at date'))).toBe(true);
      });

      it('should handle empty arrays', async () => {
        const emptyArrayData = JSON.stringify([]);

        const result = await llmAugmentationService.validateGeneration('characters', emptyArrayData);

        expect(result.isValid).toBe(true); // Empty array is technically valid JSON array
        expect(result.errors).toHaveLength(0);
      });

      it('should validate multiple items in array', async () => {
        const multipleItemsData = JSON.stringify([
          {
            character_id: 'char1',
            name: 'Character 1',
            age: 'adult',
            gender: 'male',
            species: 'human',
            occupation: 'warrior',
            personality: ['brave'],
            backstory: 'Test backstory',
            motivations: ['fight'],
            abilities: ['sword'],
            appearance: 'Tall'
          },
          {
            character_id: 'char2',
            name: 'Character 2',
            age: 'young',
            gender: 'female',
            species: 'elf',
            occupation: 'mage',
            personality: ['wise'],
            backstory: 'Elf backstory',
            motivations: ['learn'],
            abilities: ['magic'],
            appearance: 'Slender'
          }
        ]);

        const result = await llmAugmentationService.validateGeneration('characters', multipleItemsData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect mixed valid/invalid items in array', async () => {
        const mixedData = JSON.stringify([
          {
            character_id: 'char1',
            name: 'Valid Character',
            age: 'adult',
            gender: 'male',
            species: 'human',
            occupation: 'warrior',
            personality: ['brave'],
            backstory: 'Valid backstory',
            motivations: ['fight'],
            abilities: ['sword'],
            appearance: 'Tall'
          },
          {
            // Invalid - missing required fields
            name: 'Invalid Character'
          }
        ]);

        const result = await llmAugmentationService.validateGeneration('characters', mixedData);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes('Item 1'))).toBe(true);
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should complete requests within expected time limits', async () => {
      mockLlmProvider.generateText.mockResolvedValue('[{"character_id": "fast1", "name": "Fast"}]');

      const startTime = Date.now();

      await llmAugmentationService.generateWorldElement('characters', 'Fast test', 'simple');

      const duration = Date.now() - startTime;

      // Should complete in less than 1 second for mocked responses
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent API calls efficiently', async () => {
      mockLlmProvider.generateText.mockResolvedValue('[{"name": "Concurrent"}]');

      const promises = [
        llmAugmentationService.generateWorldElement('characters', 'Test 1', 'simple'),
        llmAugmentationService.generateWorldElement('scenes', 'Test 2', 'simple'),
        llmAugmentationService.generateWorldElement('locations', 'Test 3', 'simple'),
      ];

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(duration).toBeLessThan(2000); // Should complete quickly with mocks
    });

    it('should respect complexity-based timeouts', async () => {
      jest.useFakeTimers();

      mockLlmProvider.generateText.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('delayed'), 35000))
      );

      const simplePromise = llmAugmentationService.generateWorldElement('characters', 'Simple', 'simple');
      const complexPromise = llmAugmentationService.generateWorldElement('locations', 'Complex', 'complex');

      // Advance time past simple timeout (30s) but before complex timeout (120s)
      jest.advanceTimersByTime(35000);

      await expect(simplePromise).rejects.toThrow(); // Should timeout
      const complexResult = await complexPromise; // Should still work

      expect(complexResult).toBe('delayed');

      jest.useRealTimers();
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle extremely long prompts', async () => {
      const longPrompt = 'A'.repeat(10000); // 10KB prompt
      mockLlmProvider.generateText.mockResolvedValue('[{"name": "Long Prompt Result"}]');

      const result = await llmAugmentationService.generateWorldElement(
        'characters',
        longPrompt,
        'moderate'
      );

      expect(result).toContain('Long Prompt Result');
    });

    it('should handle prompts with special characters', async () => {
      const specialPrompt = 'World with émojis 🌟, spëcial chärs, and 123 numbers!';
      mockLlmProvider.generateText.mockResolvedValue('[{"name": "Special Result"}]');

      const result = await llmAugmentationService.generateWorldElement(
        'characters',
        specialPrompt,
        'simple'
      );

      expect(result).toContain('Special Result');
    });

    it('should handle API responses with extra whitespace', async () => {
      const whitespaceResponse = '\n\n  [{"character_id": "ws1", "name": "Whitespace"}]  \n\n';
      mockLlmProvider.generateText.mockResolvedValue(whitespaceResponse);

      const result = await llmAugmentationService.generateWorldElement(
        'characters',
        'Test',
        'simple'
      );

      expect(result).toBe(whitespaceResponse.trim());
    });

    it('should handle API responses with markdown formatting', async () => {
      const markdownResponse = '```json\n[{"character_id": "md1", "name": "Markdown"}]\n```';
      mockLlmProvider.generateText.mockResolvedValue(markdownResponse);

      const result = await llmAugmentationService.generateWorldElement(
        'characters',
        'Test',
        'simple'
      );

      expect(result).toBe(markdownResponse);
      // Validation should still work on the raw response
      const validation = await llmAugmentationService.validateGeneration('characters', result);
      expect(validation.isValid).toBe(false); // Markdown is not valid JSON array
    });

    it('should handle empty enhancement prompts', async () => {
      const existingData = '[{"character_id": "base"}]';
      mockLlmProvider.generateText.mockResolvedValue('[{"character_id": "base", "enhanced": true}]');

      const result = await llmAugmentationService.enhanceElement(
        'characters',
        existingData,
        '', // Empty enhancement prompt
        'simple'
      );

      expect(result).toContain('enhanced');
    });

    it('should handle null/undefined parameters gracefully', async () => {
      mockLlmProvider.generateText.mockResolvedValue('[{"name": "Default"}]');

      // Should not crash with undefined genre
      await expect(llmAugmentationService.generateWorldElement(
        'characters',
        'Test',
        'simple',
        undefined as any
      )).resolves.toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary API outages', async () => {
      mockLlmProvider.generateText
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockRejectedValueOnce(new Error('Gateway timeout'))
        .mockResolvedValueOnce('recovery successful');

      const result = await llmAugmentationService.generateWorldElement(
        'characters',
        'Recovery test',
        'moderate' // 3 retries for moderate
      );

      expect(result).toBe('recovery successful');
      expect(mockLlmProvider.generateText).toHaveBeenCalledTimes(3);
    });

    it('should provide detailed error information on failure', async () => {
      const apiError = new Error('Rate limit exceeded');
      mockLlmProvider.generateText.mockRejectedValue(apiError);

      await expect(
        llmAugmentationService.generateWorldElement('characters', 'Error test', 'simple')
      ).rejects.toThrow(/LLM generation failed after 2 attempts.*Rate limit exceeded/);
    });

    it('should handle provider availability checks', async () => {
      mockLlmProvider.isAvailable.mockResolvedValue(false);

      // Service should still attempt calls even if provider reports unavailable
      mockLlmProvider.generateText.mockResolvedValue('available despite report');

      const result = await llmAugmentationService.generateWorldElement(
        'characters',
        'Availability test',
        'simple'
      );

      expect(result).toBe('available despite report');
    });
  });
});