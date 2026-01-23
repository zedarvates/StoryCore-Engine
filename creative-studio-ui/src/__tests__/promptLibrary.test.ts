/**
 * Test Suite: Verify All 93 Prompts Are Accessible
 * This test ensures the prompt library is fully functional and all prompts can be loaded
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { promptLibrary } from '../library/PromptLibraryService';
import * as fs from 'fs';
import * as path from 'path';

// Mock fetch for Node environment
global.fetch = vi.fn(async (url: string) => {
  const urlPath = url.toString().replace('/library/', '');
  const filePath = path.join(process.cwd(), '..', 'library', urlPath);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      ok: true,
      json: async () => JSON.parse(content),
    } as Response;
  } catch (error) {
    throw new Error(`Failed to load ${filePath}: ${error}`);
  }
}) as any;

describe('Prompt Library Accessibility', () => {
  beforeAll(async () => {
    // Ensure library is loaded before tests
    await promptLibrary.loadIndex();
  });

  describe('Library Loading', () => {
    it('should load the library index successfully', async () => {
      const index = await promptLibrary.loadIndex();
      expect(index).toBeDefined();
      expect(index.version).toBe('4.0.0');
      expect(index.totalPrompts).toBe(93);
    });

    it('should have 14 categories', async () => {
      const categories = await promptLibrary.getCategories();
      expect(Object.keys(categories)).toHaveLength(14);
    });

    it('should report library as fully loaded', async () => {
      const isLoaded = await promptLibrary.isLibraryLoaded();
      expect(isLoaded).toBe(true);
    });

    it('should get total prompt count of 93', async () => {
      const count = await promptLibrary.getTotalPromptCount();
      expect(count).toBe(93);
    });
  });

  describe('Time of Day Prompts (6 prompts)', () => {
    it('should load all 6 time of day prompts', async () => {
      const prompts = await promptLibrary.getTimeOfDayPrompts();
      expect(prompts).toHaveLength(6);
    });

    it('should have time of day options', async () => {
      const prompts = await promptLibrary.getTimeOfDayPrompts();
      const names = prompts.map(p => p.name.toLowerCase());
      
      // Check that we have time-related prompts
      const hasTimeRelated = names.some(n => 
        n.includes('dawn') || n.includes('morning') || n.includes('afternoon') || 
        n.includes('evening') || n.includes('night')
      );
      expect(hasTimeRelated).toBe(true);
    });
  });

  describe('Mood/Atmosphere Prompts (10 prompts)', () => {
    it('should load all 10 mood prompts', async () => {
      const prompts = await promptLibrary.getMoodPrompts();
      expect(prompts).toHaveLength(10);
    });

    it('should have diverse mood options', async () => {
      const prompts = await promptLibrary.getMoodPrompts();
      expect(prompts.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Shot Type Prompts (7 prompts)', () => {
    it('should load all 7 shot type prompts', async () => {
      const prompts = await promptLibrary.getShotTypePrompts();
      expect(prompts).toHaveLength(7);
    });

    it('should include standard cinematographic shot types', async () => {
      const prompts = await promptLibrary.getShotTypePrompts();
      const names = prompts.map(p => p.name.toLowerCase());
      
      // Check for common shot types
      const hasWideShot = names.some(n => n.includes('wide') || n.includes('establishing'));
      const hasMediumShot = names.some(n => n.includes('medium'));
      const hasCloseUp = names.some(n => n.includes('close'));
      
      expect(hasWideShot).toBe(true);
      expect(hasMediumShot).toBe(true);
      expect(hasCloseUp).toBe(true);
    });
  });

  describe('Camera Angle Prompts (6 prompts)', () => {
    it('should load all 6 camera angle prompts', async () => {
      const prompts = await promptLibrary.getCameraAnglePrompts();
      expect(prompts).toHaveLength(6);
    });

    it('should include standard camera angles', async () => {
      const prompts = await promptLibrary.getCameraAnglePrompts();
      const names = prompts.map(p => p.name.toLowerCase());
      
      const hasEyeLevel = names.some(n => n.includes('eye'));
      const hasHighAngle = names.some(n => n.includes('high'));
      const hasLowAngle = names.some(n => n.includes('low'));
      
      expect(hasEyeLevel).toBe(true);
      expect(hasHighAngle).toBe(true);
      expect(hasLowAngle).toBe(true);
    });
  });

  describe('Camera Movement Prompts (8 prompts)', () => {
    it('should load all 8 camera movement prompts', async () => {
      const prompts = await promptLibrary.getCameraMovementPrompts();
      expect(prompts).toHaveLength(8);
    });

    it('should include standard camera movements', async () => {
      const prompts = await promptLibrary.getCameraMovementPrompts();
      const names = prompts.map(p => p.name.toLowerCase());
      
      const hasStatic = names.some(n => n.includes('static'));
      const hasPan = names.some(n => n.includes('pan'));
      const hasDolly = names.some(n => n.includes('dolly'));
      
      expect(hasStatic).toBe(true);
      expect(hasPan).toBe(true);
      expect(hasDolly).toBe(true);
    });
  });

  describe('Transition Prompts (5 prompts)', () => {
    it('should load all 5 transition prompts', async () => {
      const prompts = await promptLibrary.getTransitionPrompts();
      expect(prompts).toHaveLength(5);
    });

    it('should include standard transitions', async () => {
      const prompts = await promptLibrary.getTransitionPrompts();
      const names = prompts.map(p => p.name.toLowerCase());
      
      const hasCut = names.some(n => n.includes('cut'));
      const hasFade = names.some(n => n.includes('fade'));
      const hasDissolve = names.some(n => n.includes('dissolve'));
      
      expect(hasCut).toBe(true);
      expect(hasFade).toBe(true);
      expect(hasDissolve).toBe(true);
    });
  });

  describe('Lighting Prompts (4 prompts)', () => {
    it('should load all 4 lighting prompts', async () => {
      const prompts = await promptLibrary.getLightingPrompts();
      expect(prompts).toHaveLength(4);
    });
  });

  describe('Genre Prompts (15 prompts)', () => {
    it('should load all 15 genre prompts', async () => {
      const prompts = await promptLibrary.getGenrePrompts();
      expect(prompts).toHaveLength(15);
    });

    it('should include major film genres', async () => {
      const prompts = await promptLibrary.getGenrePrompts();
      const names = prompts.map(p => p.name.toLowerCase());
      
      const hasSciFi = names.some(n => n.includes('sci') || n.includes('science'));
      const hasFantasy = names.some(n => n.includes('fantasy'));
      const hasAction = names.some(n => n.includes('action'));
      
      expect(hasSciFi).toBe(true);
      expect(hasFantasy).toBe(true);
      expect(hasAction).toBe(true);
    });
  });

  describe('Visual Style Prompts (11 prompts)', () => {
    it('should load all 11 visual style prompts', async () => {
      const prompts = await promptLibrary.getVisualStylePrompts();
      expect(prompts).toHaveLength(11);
    });

    it('should include diverse visual styles', async () => {
      const prompts = await promptLibrary.getVisualStylePrompts();
      const names = prompts.map(p => p.name.toLowerCase());
      
      const hasRealistic = names.some(n => n.includes('realistic'));
      const hasStylized = names.some(n => n.includes('stylized'));
      const hasAnime = names.some(n => n.includes('anime'));
      
      expect(hasRealistic).toBe(true);
      expect(hasStylized).toBe(true);
      expect(hasAnime).toBe(true);
    });
  });

  describe('Color Palette Prompts (6 prompts)', () => {
    it('should load all 6 color palette prompts', async () => {
      const prompts = await promptLibrary.getColorPalettePrompts();
      expect(prompts).toHaveLength(6);
    });
  });

  describe('Universe Type Prompts (5 prompts)', () => {
    it('should load all 5 universe type prompts', async () => {
      const prompts = await promptLibrary.getUniverseTypePrompts();
      expect(prompts).toHaveLength(5);
    });

    it('should include major universe types', async () => {
      const prompts = await promptLibrary.getUniverseTypePrompts();
      const names = prompts.map(p => p.name.toLowerCase());
      
      const hasRealistic = names.some(n => n.includes('realistic'));
      const hasFantasy = names.some(n => n.includes('fantasy'));
      const hasSciFi = names.some(n => n.includes('sci'));
      
      expect(hasRealistic).toBe(true);
      expect(hasFantasy).toBe(true);
      expect(hasSciFi).toBe(true);
    });
  });

  describe('Character Archetype Prompts (3 prompts)', () => {
    it('should load all 3 character archetype prompts', async () => {
      const prompts = await promptLibrary.getCharacterArchetypePrompts();
      expect(prompts).toHaveLength(3);
    });
  });

  describe('Master Coherence Prompts (3 prompts)', () => {
    it('should load all 3 master coherence prompts', async () => {
      const prompts = await promptLibrary.getMasterCoherencePrompts();
      expect(prompts).toHaveLength(3);
    });
  });

  describe('Scene Element Prompts (4 prompts)', () => {
    it('should load all 4 scene element prompts', async () => {
      const prompts = await promptLibrary.getSceneElementPrompts();
      expect(prompts).toHaveLength(4);
    });
  });

  describe('Total Prompt Count Verification', () => {
    it('should have exactly 93 prompts across all categories', async () => {
      const [
        timeOfDay,
        mood,
        shotTypes,
        cameraAngles,
        cameraMovements,
        transitions,
        lighting,
        genres,
        visualStyles,
        colorPalettes,
        universeTypes,
        characterArchetypes,
        masterCoherence,
        sceneElements,
      ] = await Promise.all([
        promptLibrary.getTimeOfDayPrompts(),
        promptLibrary.getMoodPrompts(),
        promptLibrary.getShotTypePrompts(),
        promptLibrary.getCameraAnglePrompts(),
        promptLibrary.getCameraMovementPrompts(),
        promptLibrary.getTransitionPrompts(),
        promptLibrary.getLightingPrompts(),
        promptLibrary.getGenrePrompts(),
        promptLibrary.getVisualStylePrompts(),
        promptLibrary.getColorPalettePrompts(),
        promptLibrary.getUniverseTypePrompts(),
        promptLibrary.getCharacterArchetypePrompts(),
        promptLibrary.getMasterCoherencePrompts(),
        promptLibrary.getSceneElementPrompts(),
      ]);

      const totalCount =
        timeOfDay.length +
        mood.length +
        shotTypes.length +
        cameraAngles.length +
        cameraMovements.length +
        transitions.length +
        lighting.length +
        genres.length +
        visualStyles.length +
        colorPalettes.length +
        universeTypes.length +
        characterArchetypes.length +
        masterCoherence.length +
        sceneElements.length;

      expect(totalCount).toBe(93);
    });

    it('should match expected counts per category', async () => {
      const counts = {
        'time-of-day': 6,
        'mood-atmosphere': 10,
        'shot-types': 7,
        'camera-angles': 6,
        'camera-movements': 8,
        transitions: 5,
        lighting: 4,
        genres: 15,
        'visual-styles': 11,
        'color-palettes': 6,
        'universe-types': 5,
        'character-archetypes': 3,
        'master-coherence': 3,
        'scene-elements': 4,
      };

      const [
        timeOfDay,
        mood,
        shotTypes,
        cameraAngles,
        cameraMovements,
        transitions,
        lighting,
        genres,
        visualStyles,
        colorPalettes,
        universeTypes,
        characterArchetypes,
        masterCoherence,
        sceneElements,
      ] = await Promise.all([
        promptLibrary.getTimeOfDayPrompts(),
        promptLibrary.getMoodPrompts(),
        promptLibrary.getShotTypePrompts(),
        promptLibrary.getCameraAnglePrompts(),
        promptLibrary.getCameraMovementPrompts(),
        promptLibrary.getTransitionPrompts(),
        promptLibrary.getLightingPrompts(),
        promptLibrary.getGenrePrompts(),
        promptLibrary.getVisualStylePrompts(),
        promptLibrary.getColorPalettePrompts(),
        promptLibrary.getUniverseTypePrompts(),
        promptLibrary.getCharacterArchetypePrompts(),
        promptLibrary.getMasterCoherencePrompts(),
        promptLibrary.getSceneElementPrompts(),
      ]);

      expect(timeOfDay.length).toBe(counts['time-of-day']);
      expect(mood.length).toBe(counts['mood-atmosphere']);
      expect(shotTypes.length).toBe(counts['shot-types']);
      expect(cameraAngles.length).toBe(counts['camera-angles']);
      expect(cameraMovements.length).toBe(counts['camera-movements']);
      expect(transitions.length).toBe(counts.transitions);
      expect(lighting.length).toBe(counts.lighting);
      expect(genres.length).toBe(counts.genres);
      expect(visualStyles.length).toBe(counts['visual-styles']);
      expect(colorPalettes.length).toBe(counts['color-palettes']);
      expect(universeTypes.length).toBe(counts['universe-types']);
      expect(characterArchetypes.length).toBe(counts['character-archetypes']);
      expect(masterCoherence.length).toBe(counts['master-coherence']);
      expect(sceneElements.length).toBe(counts['scene-elements']);
    });
  });

  describe('Prompt Structure Validation', () => {
    it('should have valid structure for all prompts', async () => {
      const allPrompts = await promptLibrary.getAllPromptsByCategory();
      
      for (const [categoryId, prompts] of Object.entries(allPrompts)) {
        for (const prompt of prompts) {
          expect(prompt.id).toBeDefined();
          expect(prompt.name).toBeDefined();
          expect(prompt.description).toBeDefined();
          expect(prompt.category).toBeDefined();
          expect(prompt.prompt).toBeDefined();
          expect(prompt.tags).toBeInstanceOf(Array);
          expect(prompt.variables).toBeDefined();
        }
      }
    });
  });

  describe('Search Functionality', () => {
    it('should search prompts by text query', async () => {
      const results = await promptLibrary.search('cinematic');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search prompts by tags', async () => {
      const results = await promptLibrary.searchByTags(['camera']);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Prompt Utility Functions', () => {
    it('should fill prompt templates with values', async () => {
      const prompts = await promptLibrary.getGenrePrompts();
      if (prompts.length > 0) {
        const prompt = prompts[0];
        const example = promptLibrary.getRandomExample(prompt);
        
        if (example) {
          const filled = promptLibrary.fillPrompt(prompt, example);
          expect(filled).toBeDefined();
          expect(typeof filled).toBe('string');
        }
      }
    });

    it('should validate prompt values', async () => {
      const prompts = await promptLibrary.getGenrePrompts();
      if (prompts.length > 0) {
        const prompt = prompts[0];
        const example = promptLibrary.getRandomExample(prompt);
        
        if (example) {
          const validation = promptLibrary.validateValues(prompt, example);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toHaveLength(0);
        }
      }
    });
  });

  describe('Load Index and Specific Categories Tests', () => {
    describe('loadIndex method', () => {
      it('should successfully load the library index without throwing errors', async () => {
        const index = await promptLibrary.loadIndex();

        expect(index).toBeDefined();
        expect(typeof index).toBe('object');
        expect(index.version).toBeDefined();
        expect(index.lastUpdated).toBeDefined();
        expect(index.totalPrompts).toBeGreaterThan(0);
        expect(index.categories).toBeDefined();
        expect(typeof index.categories).toBe('object');
      });

      it('should return the same index instance on multiple calls (caching)', async () => {
        const index1 = await promptLibrary.loadIndex();
        const index2 = await promptLibrary.loadIndex();

        expect(index1).toBe(index2);
      });

      it('should contain categories object with expected structure', async () => {
        const index = await promptLibrary.loadIndex();

        expect(Object.keys(index.categories).length).toBeGreaterThan(0);

        // Check that each category has the required properties
        Object.values(index.categories).forEach(category => {
          expect(category).toHaveProperty('name');
          expect(category).toHaveProperty('description');
          expect(category).toHaveProperty('prompts');
          expect(Array.isArray(category.prompts)).toBe(true);
        });
      });
    });

    describe('getPromptsByCategory method', () => {
      describe('02-genres category (genres)', () => {
        it('should load genres category prompts without errors', async () => {
          const prompts = await promptLibrary.getPromptsByCategory('genres');

          expect(Array.isArray(prompts)).toBe(true);
          expect(prompts.length).toBeGreaterThan(0);

          // Verify each prompt has required properties
          prompts.forEach(prompt => {
            expect(prompt).toHaveProperty('id');
            expect(prompt).toHaveProperty('name');
            expect(prompt).toHaveProperty('description');
            expect(prompt).toHaveProperty('category');
            expect(prompt).toHaveProperty('tags');
            expect(prompt).toHaveProperty('prompt');
            expect(prompt).toHaveProperty('variables');
            expect(Array.isArray(prompt.tags)).toBe(true);
            expect(typeof prompt.variables).toBe('object');
          });
        });

        it('should return prompts with genre-related content', async () => {
          const prompts = await promptLibrary.getPromptsByCategory('genres');

          // At least one prompt should contain genre-related keywords
          const hasGenreContent = prompts.some(prompt =>
            prompt.name.toLowerCase().includes('genre') ||
            prompt.description.toLowerCase().includes('genre') ||
            prompt.tags.some(tag => tag.toLowerCase().includes('genre'))
          );

          expect(hasGenreContent).toBe(true);
        });
      });

      describe('06-visual-styles category (visual-styles)', () => {
        it('should load visual styles category prompts without errors', async () => {
          const prompts = await promptLibrary.getPromptsByCategory('visual-styles');

          expect(Array.isArray(prompts)).toBe(true);
          expect(prompts.length).toBeGreaterThan(0);

          // Verify each prompt has required properties
          prompts.forEach(prompt => {
            expect(prompt).toHaveProperty('id');
            expect(prompt).toHaveProperty('name');
            expect(prompt).toHaveProperty('description');
            expect(prompt).toHaveProperty('category');
            expect(prompt).toHaveProperty('tags');
            expect(prompt).toHaveProperty('prompt');
            expect(prompt).toHaveProperty('variables');
            expect(Array.isArray(prompt.tags)).toBe(true);
            expect(typeof prompt.variables).toBe('object');
          });
        });

        it('should return prompts with visual style content', async () => {
          const prompts = await promptLibrary.getPromptsByCategory('visual-styles');

          // At least one prompt should contain visual style keywords
          const hasVisualStyleContent = prompts.some(prompt =>
            prompt.name.toLowerCase().includes('style') ||
            prompt.name.toLowerCase().includes('visual') ||
            prompt.description.toLowerCase().includes('style') ||
            prompt.description.toLowerCase().includes('visual') ||
            prompt.tags.some(tag =>
              tag.toLowerCase().includes('style') ||
              tag.toLowerCase().includes('visual') ||
              tag.toLowerCase().includes('cinematic') ||
              tag.toLowerCase().includes('anime')
            )
          );

          expect(hasVisualStyleContent).toBe(true);
        });
      });

      describe('12-color-palettes category (color-palettes)', () => {
        it('should load color palettes category prompts without errors', async () => {
          const prompts = await promptLibrary.getPromptsByCategory('color-palettes');

          expect(Array.isArray(prompts)).toBe(true);
          expect(prompts.length).toBeGreaterThan(0);

          // Verify each prompt has required properties
          prompts.forEach(prompt => {
            expect(prompt).toHaveProperty('id');
            expect(prompt).toHaveProperty('name');
            expect(prompt).toHaveProperty('description');
            expect(prompt).toHaveProperty('category');
            expect(prompt).toHaveProperty('tags');
            expect(prompt).toHaveProperty('prompt');
            expect(prompt).toHaveProperty('variables');
            expect(Array.isArray(prompt.tags)).toBe(true);
            expect(typeof prompt.variables).toBe('object');
          });
        });

        it('should return prompts with color-related content', async () => {
          const prompts = await promptLibrary.getPromptsByCategory('color-palettes');

          // At least one prompt should contain color-related keywords
          const hasColorContent = prompts.some(prompt =>
            prompt.name.toLowerCase().includes('color') ||
            prompt.name.toLowerCase().includes('palette') ||
            prompt.description.toLowerCase().includes('color') ||
            prompt.description.toLowerCase().includes('palette') ||
            prompt.tags.some(tag =>
              tag.toLowerCase().includes('color') ||
              tag.toLowerCase().includes('palette')
            )
          );

          expect(hasColorContent).toBe(true);
        });
      });

      it('should return empty array for non-existent category', async () => {
        const prompts = await promptLibrary.getPromptsByCategory('non-existent-category');

        expect(Array.isArray(prompts)).toBe(true);
        expect(prompts.length).toBe(0);
      });
    });
  });

  describe('Filtering Methods', () => {
    describe('filterByGenre', () => {
      it('should filter prompts by genre', async () => {
        const allPrompts = await promptLibrary.getGenrePrompts();
        const sciFiPrompts = promptLibrary.filterByGenre(allPrompts, 'sci-fi');

        expect(sciFiPrompts.length).toBeGreaterThan(0);
        expect(sciFiPrompts.length).toBeLessThanOrEqual(allPrompts.length);

        // Verify filtered prompts contain the genre
        sciFiPrompts.forEach(prompt => {
          const hasGenre =
            prompt.tags.some(tag => tag.toLowerCase().includes('sci-fi')) ||
            prompt.description.toLowerCase().includes('sci-fi') ||
            prompt.category.toLowerCase().includes('sci-fi');
          expect(hasGenre).toBe(true);
        });
      });

      it('should return empty array when no prompts match genre', async () => {
        const allPrompts = await promptLibrary.getGenrePrompts();
        const filtered = promptLibrary.filterByGenre(allPrompts, 'nonexistent-genre-xyz');
        expect(filtered).toHaveLength(0);
      });

      it('should be case-insensitive', async () => {
        const allPrompts = await promptLibrary.getGenrePrompts();
        const lower = promptLibrary.filterByGenre(allPrompts, 'fantasy');
        const upper = promptLibrary.filterByGenre(allPrompts, 'FANTASY');
        const mixed = promptLibrary.filterByGenre(allPrompts, 'FaNtAsY');

        expect(lower.length).toBe(upper.length);
        expect(lower.length).toBe(mixed.length);
      });
    });

    describe('filterByStyle', () => {
      it('should filter prompts by visual style', async () => {
        const allPrompts = await promptLibrary.getVisualStylePrompts();
        const realisticPrompts = promptLibrary.filterByStyle(allPrompts, 'realistic');
        
        expect(realisticPrompts.length).toBeGreaterThan(0);
        expect(realisticPrompts.length).toBeLessThanOrEqual(allPrompts.length);
        
        // Verify filtered prompts contain the style
        realisticPrompts.forEach(prompt => {
          const promptText = typeof prompt.prompt === 'string' ? prompt.prompt : JSON.stringify(prompt.prompt);
          const hasStyle = 
            prompt.tags.some(tag => tag.toLowerCase().includes('realistic')) ||
            prompt.description.toLowerCase().includes('realistic') ||
            promptText.toLowerCase().includes('realistic');
          expect(hasStyle).toBe(true);
        });
      });

      it('should return empty array when no prompts match style', async () => {
        const allPrompts = await promptLibrary.getVisualStylePrompts();
        const filtered = promptLibrary.filterByStyle(allPrompts, 'nonexistent-style-xyz');
        expect(filtered).toHaveLength(0);
      });

      it('should be case-insensitive', async () => {
        const allPrompts = await promptLibrary.getVisualStylePrompts();
        const lower = promptLibrary.filterByStyle(allPrompts, 'cinematic');
        const upper = promptLibrary.filterByStyle(allPrompts, 'CINEMATIC');
        const mixed = promptLibrary.filterByStyle(allPrompts, 'CiNeMaTiC');
        
        expect(lower.length).toBe(upper.length);
        expect(lower.length).toBe(mixed.length);
      });
    });

    describe('filterByUniverseType', () => {
      it('should filter prompts by universe type', async () => {
        const allPrompts = await promptLibrary.getUniverseTypePrompts();
        const fantasyPrompts = promptLibrary.filterByUniverseType(allPrompts, 'fantasy');
        
        expect(fantasyPrompts.length).toBeGreaterThan(0);
        expect(fantasyPrompts.length).toBeLessThanOrEqual(allPrompts.length);
        
        // Verify filtered prompts contain the universe type
        fantasyPrompts.forEach(prompt => {
          const hasUniverse = 
            prompt.tags.some(tag => tag.toLowerCase().includes('fantasy')) ||
            prompt.description.toLowerCase().includes('fantasy') ||
            prompt.category.toLowerCase().includes('fantasy') ||
            prompt.subcategory.toLowerCase().includes('fantasy');
          expect(hasUniverse).toBe(true);
        });
      });

      it('should return empty array when no prompts match universe type', async () => {
        const allPrompts = await promptLibrary.getUniverseTypePrompts();
        const filtered = promptLibrary.filterByUniverseType(allPrompts, 'nonexistent-universe-xyz');
        expect(filtered).toHaveLength(0);
      });

      it('should be case-insensitive', async () => {
        const allPrompts = await promptLibrary.getUniverseTypePrompts();
        const lower = promptLibrary.filterByUniverseType(allPrompts, 'sci-fi');
        const upper = promptLibrary.filterByUniverseType(allPrompts, 'SCI-FI');
        const mixed = promptLibrary.filterByUniverseType(allPrompts, 'ScI-Fi');
        
        expect(lower.length).toBe(upper.length);
        expect(lower.length).toBe(mixed.length);
      });
    });

    describe('applyFilters', () => {
      it('should apply multiple filters simultaneously', async () => {
        const allPrompts = await promptLibrary.getAllPromptsByCategory();
        const flatPrompts = Object.values(allPrompts).flat();
        
        const filtered = promptLibrary.applyFilters(flatPrompts, {
          genre: 'sci-fi',
          style: 'cinematic'
        });
        
        // Should have fewer results than single filter
        const genreOnly = promptLibrary.filterByGenre(flatPrompts, 'sci-fi');
        expect(filtered.length).toBeLessThanOrEqual(genreOnly.length);
      });

      it('should return all prompts when no filters applied', async () => {
        const allPrompts = await promptLibrary.getGenrePrompts();
        const filtered = promptLibrary.applyFilters(allPrompts, {});
        
        expect(filtered.length).toBe(allPrompts.length);
      });

      it('should handle tag filtering', async () => {
        const allPrompts = await promptLibrary.getGenrePrompts();
        const filtered = promptLibrary.applyFilters(allPrompts, {
          tags: ['action']
        });
        
        filtered.forEach(prompt => {
          expect(prompt.tags).toContain('action');
        });
      });

      it('should combine all filter types', async () => {
        const allPrompts = await promptLibrary.getAllPromptsByCategory();
        const flatPrompts = Object.values(allPrompts).flat();
        
        const filtered = promptLibrary.applyFilters(flatPrompts, {
          genre: 'fantasy',
          style: 'stylized',
          universeType: 'fantasy',
          tags: ['magic']
        });
        
        // All filters should be applied
        expect(Array.isArray(filtered)).toBe(true);
      });
    });
  });
});
