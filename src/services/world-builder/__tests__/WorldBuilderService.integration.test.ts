import { WorldBuilderService } from '../WorldBuilderService';
import { LLMAugmentationService } from '../LLMAugmentationService';
import { PersistenceService } from '../PersistenceService';
import { ValidationService } from '../ValidationService';
import { WorldBuildRequest, World } from '../types';

describe('WorldBuilderService Integration', () => {
  let worldBuilderService: WorldBuilderService;
  let mockLlmService: jest.Mocked<LLMAugmentationService>;
  let mockPersistenceService: jest.Mocked<PersistenceService>;
  let mockValidationService: jest.Mocked<ValidationService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLlmService = {
      generateWorldElement: jest.fn(),
    } as any;

    mockPersistenceService = {
      save: jest.fn(),
      load: jest.fn(),
    } as any;

    mockValidationService = {
      validateWorld: jest.fn(),
    } as any;

    worldBuilderService = new WorldBuilderService(
      mockLlmService,
      mockPersistenceService,
      mockValidationService
    );
  });

  describe('buildWorld - New World Creation', () => {
    const baseRequest: WorldBuildRequest = {
      base_prompt: 'A magical fantasy world with dragons and wizards',
      genre: 'fantasy',
      complexity_level: 'moderate',
    };

    it('should successfully build a new world with all components', async () => {
      // Mock LLM responses
      mockLlmService.generateWorldElement
        .mockResolvedValueOnce('[{"name": "Eldrin the Wise", "role": "Mentor", "background": "Ancient wizard"}]')
        .mockResolvedValueOnce('[{"name": "The Dragon\'s Awakening", "description": "Heroes discover a dragon egg"}]')
        .mockResolvedValueOnce('[{"name": "Crystal Mountain", "type": "mountain", "description": "Home of ancient crystals"}]')
        .mockResolvedValueOnce('[{"name": "The Great Prophecy", "content": "A prophecy about the end of magic"}]')
        .mockResolvedValueOnce('[{"name": "Staff of Eternity", "type": "weapon", "description": "Grants immortality"}]');

      // Mock validation success
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 95,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(baseRequest);

      expect(result.success).toBe(true);
      expect(result.world).toBeDefined();
      expect(result.world?.name).toContain('World');
      expect(result.world?.config.genre).toBe('fantasy');
      expect(result.world?.characters).toHaveLength(1);
      expect(result.world?.scenes).toHaveLength(1);
      expect(result.world?.locations).toHaveLength(1);
      expect(result.world?.lore).toHaveLength(1);
      expect(result.world?.artifacts).toHaveLength(1);
      expect(result.world?.status.completeness_percentage).toBe(100);

      expect(mockLlmService.generateWorldElement).toHaveBeenCalledTimes(5);
      expect(mockValidationService.validateWorld).toHaveBeenCalledTimes(1);
    });

    it('should handle LLM service failures with retry logic', async () => {
      // Mock LLM failures then success
      mockLlmService.generateWorldElement
        .mockRejectedValueOnce(new Error('API rate limit'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce('[{"name": "Test Character"}]')
        .mockResolvedValueOnce('[{"name": "Test Scene"}]')
        .mockResolvedValueOnce('[{"name": "Test Location"}]')
        .mockResolvedValueOnce('[{"name": "Test Lore"}]')
        .mockResolvedValueOnce('[{"name": "Test Artifact"}]');

      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 90,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(baseRequest);

      expect(result.success).toBe(true);
      expect(result.world?.characters).toHaveLength(1);
      // Verify retry happened (more calls than expected components)
      expect(mockLlmService.generateWorldElement).toHaveBeenCalledTimes(7); // 2 retries + 5 successes
    });

    it('should fail when validation fails after maximum retries', async () => {
      mockLlmService.generateWorldElement.mockResolvedValue('[]'); // Empty responses

      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: false,
        errors: [{ field: 'characters', message: 'No characters generated', severity: 'error' }],
        warnings: [],
        score: 10,
        validated_at: new Date().toISOString(),
      });

      await expect(worldBuilderService.buildWorld(baseRequest))
        .rejects.toThrow('World validation failed');

      expect(mockValidationService.validateWorld).toHaveBeenCalledTimes(1);
    });

    it('should generate appropriate prompts for different complexity levels', async () => {
      const simpleRequest = { ...baseRequest, complexity_level: 'simple' as const };
      const complexRequest = { ...baseRequest, complexity_level: 'complex' as const };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "Simple Character"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 85,
        validated_at: new Date().toISOString(),
      });

      await worldBuilderService.buildWorld(simpleRequest);
      await worldBuilderService.buildWorld(complexRequest);

      expect(mockLlmService.generateWorldElement).toHaveBeenCalledWith(
        'characters',
        expect.stringContaining('simple'),
        'simple'
      );
      expect(mockLlmService.generateWorldElement).toHaveBeenCalledWith(
        'characters',
        expect.stringContaining('complex'),
        'complex'
      );
    });
  });

  describe('buildWorld - Existing World Extension', () => {
    const existingWorld: World = {
      world_id: 'existing-123',
      name: 'Existing Fantasy World',
      description: 'A world that already exists',
      schema_version: '1.0',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      config: {
        genre: 'fantasy',
        theme: 'epic',
        tone: 'serious',
        complexity_level: 'moderate',
        target_audience: 'general',
        world_scale: 'regional',
      },
      characters: [{ id: 'char1', name: 'Existing Hero', role: 'protagonist', background: 'Born in a small village' }],
      scenes: [],
      locations: [],
      lore: [],
      artifacts: [],
      status: {
        current_phase: 'building',
        validation_passed: true,
        completeness_percentage: 50,
        ai_generated_content_count: 1,
      },
      metadata: {
        author: 'Test Author',
        tags: ['fantasy'],
        version_history: [],
        ai_assistance_used: true,
      },
    };

    const extensionRequest: WorldBuildRequest = {
      base_prompt: 'Add more dragons and ancient ruins',
      genre: 'fantasy',
      complexity_level: 'moderate',
      existing_world_data: existingWorld,
    };

    it('should extend existing world with additional content', async () => {
      mockLlmService.generateWorldElement
        .mockResolvedValueOnce('[{"name": "New Ally", "role": "sidekick", "background": "Mysterious traveler"}]')
        .mockResolvedValueOnce('[{"name": "Dragon Lair Discovery", "description": "Heroes find an ancient dragon lair"}]')
        .mockResolvedValueOnce('[{"name": "Ancient Temple", "type": "temple", "description": "Forgotten ruins with dragon carvings"}]');

      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 92,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(extensionRequest);

      expect(result.success).toBe(true);
      expect(result.world?.characters).toHaveLength(2); // Existing + 1 new
      expect(result.world?.scenes).toHaveLength(1); // 1 new
      expect(result.world?.locations).toHaveLength(1); // 1 new
      expect(result.world?.status.completeness_percentage).toBeGreaterThan(50);
    });

    it('should fail extension when existing_world_data is missing', async () => {
      const invalidRequest = { ...extensionRequest };
      delete invalidRequest.existing_world_data;

      await expect(worldBuilderService.buildWorld(invalidRequest))
        .rejects.toThrow('Existing world data required for extension');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed JSON from LLM service', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Test world',
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      mockLlmService.generateWorldElement
        .mockResolvedValueOnce('invalid json {') // Malformed JSON
        .mockResolvedValueOnce('[{"name": "Valid Scene"}]')
        .mockResolvedValueOnce('[{"name": "Valid Location"}]')
        .mockResolvedValueOnce('[{"name": "Valid Lore"}]')
        .mockResolvedValueOnce('[{"name": "Valid Artifact"}]');

      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 80,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.success).toBe(true);
      expect(result.world?.characters).toEqual([]); // Should default to empty array
      expect(result.world?.scenes).toHaveLength(1);
    });

    it('should handle partial LLM failures gracefully', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Test world',
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      mockLlmService.generateWorldElement
        .mockRejectedValueOnce(new Error('Characters API down'))
        .mockResolvedValueOnce('[{"name": "Scene 1"}]')
        .mockResolvedValueOnce('[{"name": "Location 1"}]')
        .mockResolvedValueOnce('[{"name": "Lore 1"}]')
        .mockResolvedValueOnce('[{"name": "Artifact 1"}]');

      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 75,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.success).toBe(true);
      expect(result.world?.characters).toEqual([]); // Should continue with empty characters
      expect(result.world?.scenes).toHaveLength(1);
      expect(result.generation_metadata.confidence_score).toBeGreaterThan(0);
    });

    it('should calculate accurate confidence scores', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Test world',
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "Test Item"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 85, // High validation score
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.generation_metadata.confidence_score).toBeGreaterThan(0.8); // Should be high
      expect(result.generation_metadata.total_tokens_used).toBe(0); // Not implemented yet
      expect(result.generation_metadata.generation_time_ms).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages for different failure types', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Test world',
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      mockLlmService.generateWorldElement.mockRejectedValue(new Error('Network timeout'));
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: false,
        errors: [{ field: 'global', message: 'Critical failure', severity: 'error' }],
        warnings: [],
        score: 0,
        validated_at: new Date().toISOString(),
      });

      await expect(worldBuilderService.buildWorld(request))
        .rejects.toThrow('World building failed');

      // Verify all LLM calls were attempted
      expect(mockLlmService.generateWorldElement).toHaveBeenCalledTimes(5);
    });
  });

  describe('Performance and Resource Management', () => {
    it('should parallelize LLM calls for better performance', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Performance test world',
        genre: 'fantasy',
        complexity_level: 'moderate',
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "Test"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 90,
        validated_at: new Date().toISOString(),
      });

      const startTime = Date.now();
      await worldBuilderService.buildWorld(request);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (parallel calls)
      expect(duration).toBeLessThan(1000); // Less than 1 second for mocked calls
      expect(mockLlmService.generateWorldElement).toHaveBeenCalledTimes(5);
    });

    it('should handle memory efficiently with large worlds', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Large complex world',
        genre: 'fantasy',
        complexity_level: 'complex',
      };

      // Mock large responses
      const largeCharacterArray = Array.from({ length: 50 }, (_, i) => ({
        name: `Character ${i}`,
        role: 'inhabitant',
        background: `Background for character ${i}`.repeat(10), // Make it large
      }));

      mockLlmService.generateWorldElement
        .mockResolvedValueOnce(JSON.stringify(largeCharacterArray))
        .mockResolvedValueOnce('[{"name": "Scene"}]')
        .mockResolvedValueOnce('[{"name": "Location"}]')
        .mockResolvedValueOnce('[{"name": "Lore"}]')
        .mockResolvedValueOnce('[{"name": "Artifact"}]');

      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 88,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.success).toBe(true);
      expect(result.world?.characters).toHaveLength(50);
      // Should handle large data without crashing
    });

    it('should implement proper timeout handling', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Timeout test world',
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      // Mock slow LLM responses
      mockLlmService.generateWorldElement.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('[{"name": "Slow"}]'), 100))
      );

      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 85,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.success).toBe(true);
      expect(result.generation_metadata.generation_time_ms).toBeGreaterThan(500); // Should account for all calls
    });
  });

  describe('World Data Integrity', () => {
    it('should generate unique world IDs', async () => {
      const request1: WorldBuildRequest = {
        base_prompt: 'World 1',
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      const request2: WorldBuildRequest = {
        base_prompt: 'World 2',
        genre: 'sci-fi',
        complexity_level: 'simple',
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "Character"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 85,
        validated_at: new Date().toISOString(),
      });

      const result1 = await worldBuilderService.buildWorld(request1);
      const result2 = await worldBuilderService.buildWorld(request2);

      expect(result1.world?.world_id).not.toBe(result2.world?.world_id);
      expect(result1.world?.world_id).toMatch(/^[a-f0-9-]+$/); // UUID format
    });

    it('should maintain data consistency across generations', async () => {
      const request: WorldBuildRequest = {
        base_prompt: 'Consistency test world',
        genre: 'fantasy',
        complexity_level: 'moderate',
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "Consistent Character"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 90,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.world?.schema_version).toBe('1.0');
      expect(result.world?.created_at).toBeDefined();
      expect(result.world?.updated_at).toBeDefined();
      expect(result.world?.config.genre).toBe('fantasy');
      expect(result.world?.metadata.ai_assistance_used).toBe(true);
    });

    it('should handle version history correctly for extensions', async () => {
      const existingWorld: World = {
        world_id: 'version-test',
        name: 'Version Test World',
        description: 'Testing versions',
        schema_version: '1.0',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        config: {
          genre: 'fantasy',
          theme: 'epic',
          tone: 'serious',
          complexity_level: 'moderate',
          target_audience: 'general',
          world_scale: 'regional',
        },
        characters: [],
        scenes: [],
        locations: [],
        lore: [],
        artifacts: [],
        status: {
          current_phase: 'building',
          validation_passed: false,
          completeness_percentage: 50,
          ai_generated_content_count: 0,
        },
        metadata: {
          author: 'Test',
          tags: [],
          version_history: [{
            version: '1.0',
            timestamp: '2024-01-01T00:00:00.000Z',
            changes: 'Initial creation',
            author: 'Test',
          }],
          ai_assistance_used: true,
        },
      };

      const extensionRequest: WorldBuildRequest = {
        base_prompt: 'Add extension content',
        genre: 'fantasy',
        complexity_level: 'moderate',
        existing_world_data: existingWorld,
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "New Element"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 88,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(extensionRequest);

      expect(result.world?.metadata.version_history).toHaveLength(2);
      expect(result.world?.updated_at).not.toBe(existingWorld.updated_at);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty prompts gracefully', async () => {
      const request: WorldBuildRequest = {
        base_prompt: '',
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "Fallback"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 70,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.success).toBe(true);
      expect(result.world?.name).toBeDefined(); // Should generate a fallback name
    });

    it('should handle extremely long prompts', async () => {
      const longPrompt = 'A'.repeat(10000); // 10KB prompt
      const request: WorldBuildRequest = {
        base_prompt: longPrompt,
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "Long Prompt Character"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 85,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.success).toBe(true);
      expect(result.world?.description).toBe(longPrompt);
    });

    it('should handle special characters in prompts', async () => {
      const specialPrompt = 'World with émojis 🌟, spëcial chärs, and 123 numbers!';
      const request: WorldBuildRequest = {
        base_prompt: specialPrompt,
        genre: 'fantasy',
        complexity_level: 'simple',
      };

      mockLlmService.generateWorldElement.mockResolvedValue('[{"name": "Special Character"}]');
      mockValidationService.validateWorld.mockResolvedValue({
        is_valid: true,
        errors: [],
        warnings: [],
        score: 85,
        validated_at: new Date().toISOString(),
      });

      const result = await worldBuilderService.buildWorld(request);

      expect(result.success).toBe(true);
      expect(result.world?.description).toBe(specialPrompt);
      expect(result.world?.name).toMatch(/World/); // Should generate valid name
    });
  });
});