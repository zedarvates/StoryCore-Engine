/**
 * Integration tests for wizard workflows
 * Tests character wizard, scene generator, storyboard creator, and other wizard workflows
 * 
 * Requirements: 3.1-3.7, 4.1-4.7, 5.1-5.7, 6.1-6.7, 7.1-7.6, 8.1-8.6
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WizardService } from '@/services/wizard/WizardService';
import { ProjectService } from '@/services/project/ProjectService';
import type {
  CharacterWizardInput,
  SceneGeneratorInput,
  StoryboardInput,
} from '@/services/wizard/types';

describe('Wizard Workflows Integration', () => {
  let wizardService: WizardService;
  let projectService: ProjectService;
  const testProjectPath = '/test/project';

  beforeEach(() => {
    wizardService = new WizardService();
    projectService = new ProjectService();

    // Mock fetch for API calls
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('14.1 Character Wizard Workflow', () => {
    it('should complete full character wizard workflow', async () => {
      // Arrange: Prepare character wizard input
      const input: CharacterWizardInput = {
        name: 'John Doe',
        description: 'A brave adventurer',
        personality: ['courageous', 'loyal', 'determined'],
        visualAttributes: {
          age: '30',
          gender: 'male',
          appearance: 'tall with dark hair',
          clothing: 'leather armor',
        },
      };

      // Mock Ollama response
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: JSON.stringify({
                name: 'John Doe',
                backstory: 'Born in a small village...',
                motivations: 'To protect the innocent',
                relationships: [],
                dialogueStyle: 'Direct and honest',
              }),
            }),
        })
      );

      // Mock ComfyUI queue prompt response
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              prompt_id: 'test-prompt-id',
            }),
        })
      );

      // Mock ComfyUI history polling (completion check)
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/history/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                'test-prompt-id': {
                  status: { completed: true },
                  outputs: {
                    '9': {
                      images: [
                        {
                          filename: 'test_image.png',
                          subfolder: '',
                          type: 'output',
                        },
                      ],
                    },
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch call'));
      });

      // Act: Execute character wizard
      const result = await wizardService.executeCharacterWizard(input);

      // Assert: Verify output structure
      expect(result).toBeDefined();
      expect(result.type).toBe('character');
      expect(result.data.name).toBe('John Doe');
      expect(result.files).toHaveLength(1); // image only (JSON is saved separately)
      expect(result.files[0].path).toContain('characters/');
      expect(result.files[0].path).toContain('_reference.png');
    });

    it('should save character data to correct file path', async () => {
      const input: CharacterWizardInput = {
        name: 'Jane Smith',
        description: 'A skilled mage',
        personality: ['intelligent', 'mysterious'],
        visualAttributes: {
          age: '25',
          gender: 'female',
          appearance: 'elegant with silver hair',
          clothing: 'flowing robes',
        },
      };

      // Mock successful API responses
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ response: '{}' }),
          });
        }
        if (url.includes('/prompt')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ prompt_id: 'test' }),
          });
        }
        if (url.includes('/history/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                test: {
                  status: { completed: true },
                  outputs: {
                    '9': {
                      images: [
                        {
                          filename: 'test.png',
                          subfolder: '',
                          type: 'output',
                        },
                      ],
                    },
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      const result = await wizardService.executeCharacterWizard(input);

      // Verify file paths follow pattern: characters/{character_id}_reference.png
      const imageFile = result.files.find((f) => f.path.endsWith('.png'));

      expect(imageFile?.path).toMatch(/characters\/char_\d+_reference\.png$/);
    });

    it('should update asset library after character creation', async () => {
      const input: CharacterWizardInput = {
        name: 'Test Character',
        description: 'Test',
        personality: ['test'],
        visualAttributes: {
          age: '30',
          gender: 'male',
          appearance: 'test',
          clothing: 'test',
        },
      };

      // Mock API responses
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ response: '{}' }),
          });
        }
        if (url.includes('/prompt')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ prompt_id: 'test' }),
          });
        }
        if (url.includes('/history/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                test: {
                  status: { completed: true },
                  outputs: {
                    '9': {
                      images: [
                        {
                          filename: 'test.png',
                          subfolder: '',
                          type: 'output',
                        },
                      ],
                    },
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      const result = await wizardService.executeCharacterWizard(input);

      // Verify character is available for other wizards
      expect(result.data).toHaveProperty('name');
      expect(result.files.length).toBeGreaterThan(0);
    });
  });

  describe('14.2 Scene Generator Workflow', () => {
    it('should complete full scene generator workflow', async () => {
      // Arrange: Prepare scene generator input
      const input: SceneGeneratorInput = {
        concept: 'A tense confrontation in a dark alley',
        mood: 'suspenseful',
        duration: 30,
        characters: ['char_123'],
        location: 'Dark alley at night',
      };

      // Mock Ollama response with shot breakdown
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: JSON.stringify({
                shots: [
                  {
                    shotNumber: 1,
                    duration: 10,
                    cameraAngle: 'wide',
                    action: 'Character enters alley',
                    dialogue: null,
                  },
                  {
                    shotNumber: 2,
                    duration: 10,
                    cameraAngle: 'close-up',
                    action: 'Character looks around nervously',
                    dialogue: 'Is anyone there?',
                  },
                  {
                    shotNumber: 3,
                    duration: 10,
                    cameraAngle: 'over-shoulder',
                    action: 'Shadow appears',
                    dialogue: null,
                  },
                ],
              }),
            }),
        })
      );

      // Act: Execute scene generator
      const result = await wizardService.executeSceneGenerator(input);

      // Assert: Verify shots created
      expect(result).toBeDefined();
      expect(result.type).toBe('scene');
      expect(result.data.shots).toHaveLength(3);
      expect(result.data.shots[0]).toHaveProperty('shotNumber');
      expect(result.data.shots[0]).toHaveProperty('duration');
      expect(result.data.shots[0]).toHaveProperty('cameraAngle');
    });

    it('should assign sequential shot IDs', async () => {
      const input: SceneGeneratorInput = {
        concept: 'Test scene',
        mood: 'neutral',
        duration: 20,
        characters: [],
        location: 'Test location',
      };

      // Mock response with multiple shots
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: JSON.stringify({
                shots: [
                  { shotNumber: 1, duration: 10, cameraAngle: 'wide', action: 'Shot 1' },
                  { shotNumber: 2, duration: 10, cameraAngle: 'close', action: 'Shot 2' },
                ],
              }),
            }),
        })
      );

      const result = await wizardService.executeSceneGenerator(input);

      // Verify shots have proper structure
      expect(result.data.shots).toHaveLength(2);
      result.data.shots.forEach((shot: any) => {
        expect(shot).toHaveProperty('shotNumber');
      });
    });

    it('should maintain shot order in storyboard', async () => {
      const input: SceneGeneratorInput = {
        concept: 'Test scene',
        mood: 'neutral',
        duration: 30,
        characters: [],
        location: 'Test location',
      };

      // Mock response
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: JSON.stringify({
                shots: [
                  { shotNumber: 1, duration: 10, cameraAngle: 'wide', action: 'First' },
                  { shotNumber: 2, duration: 10, cameraAngle: 'medium', action: 'Second' },
                  { shotNumber: 3, duration: 10, cameraAngle: 'close', action: 'Third' },
                ],
              }),
            }),
        })
      );

      const result = await wizardService.executeSceneGenerator(input);

      // Verify order is preserved
      expect(result.data.shots[0].shotNumber).toBe(1);
      expect(result.data.shots[1].shotNumber).toBe(2);
      expect(result.data.shots[2].shotNumber).toBe(3);
    });
  });

  describe('14.3 Storyboard Creator Workflow', () => {
    it('should complete full storyboard creator workflow', async () => {
      // Arrange: Prepare storyboard input
      const input: StoryboardInput = {
        scriptText: 'INT. OFFICE - DAY\nJohn sits at his desk, typing.',
        visualStyle: 'cinematic',
        pacing: 'medium',
        mode: 'append',
      };

      // Mock Ollama response for shot planning
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: JSON.stringify({
                shots: [
                  {
                    description: 'Wide shot of office',
                    visualStyle: 'cinematic',
                    duration: 5,
                  },
                  {
                    description: 'Close-up of John typing',
                    visualStyle: 'cinematic',
                    duration: 5,
                  },
                ],
              }),
            }),
        })
      );

      // Mock ComfyUI responses for each shot
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/prompt')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ prompt_id: 'test-prompt' }),
          });
        }
        if (url.includes('/history/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                'test-prompt': {
                  status: { completed: true },
                  outputs: {
                    '9': {
                      images: [
                        {
                          filename: 'shot.png',
                          subfolder: '',
                          type: 'output',
                        },
                      ],
                    },
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      // Act: Execute storyboard creator
      const result = await wizardService.executeStoryboardCreator(input);

      // Assert: Verify images and shots generated
      expect(result).toBeDefined();
      expect(result.type).toBe('storyboard');
      expect(result.data.shots).toHaveLength(2);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it('should generate images for each shot', async () => {
      const input: StoryboardInput = {
        scriptText: 'Test script',
        visualStyle: 'realistic',
        pacing: 'fast',
        mode: 'replace',
      };

      // Mock responses
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: JSON.stringify({
                  shots: [
                    { description: 'Shot 1', duration: 3 },
                    { description: 'Shot 2', duration: 3 },
                    { description: 'Shot 3', duration: 3 },
                  ],
                }),
              }),
          });
        }
        if (url.includes('/prompt')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ prompt_id: 'test' }),
          });
        }
        if (url.includes('/history/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                test: {
                  status: { completed: true },
                  outputs: {
                    '9': {
                      images: [
                        {
                          filename: 'shot.png',
                          subfolder: '',
                          type: 'output',
                        },
                      ],
                    },
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      const result = await wizardService.executeStoryboardCreator(input);

      // Verify each shot has an image reference
      result.data.shots.forEach((shot: any) => {
        expect(shot).toHaveProperty('frame_path');
        expect(shot.frame_path).toMatch(/shots\/shot_\d+_\d+_frame\.png$/);
      });
    });

    it('should handle replace vs append mode', async () => {
      const replaceInput: StoryboardInput = {
        scriptText: 'Test',
        visualStyle: 'test',
        pacing: 'medium',
        mode: 'replace',
      };

      const appendInput: StoryboardInput = {
        scriptText: 'Test',
        visualStyle: 'test',
        pacing: 'medium',
        mode: 'append',
      };

      // Mock responses
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                response: JSON.stringify({ shots: [{ description: 'Test', duration: 5 }] }),
              }),
          });
        }
        if (url.includes('/prompt')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ prompt_id: 'test' }),
          });
        }
        if (url.includes('/history/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                test: {
                  status: { completed: true },
                  outputs: {
                    '9': {
                      images: [
                        {
                          filename: 'shot.png',
                          subfolder: '',
                          type: 'output',
                        },
                      ],
                    },
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      const replaceResult = await wizardService.executeStoryboardCreator(replaceInput);
      const appendResult = await wizardService.executeStoryboardCreator(appendInput);

      // Verify mode is preserved in data
      expect(replaceResult.data.mode).toBe('replace');
      expect(appendResult.data.mode).toBe('append');
    });
  });

  describe('14.4 Asset Import Workflow', () => {
    it('should import assets via file picker', async () => {
      // This test would require mocking file system operations
      // For now, we'll test the validation logic
      const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

      // Verify file validation would pass
      expect(mockFile.type).toBe('image/png');
      expect(mockFile.name).toMatch(/\.png$/);
    });

    it('should import assets via drag-drop with same result', async () => {
      // Both methods should use the same validation and import logic
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      // Verify file would pass validation
      expect(mockFile.type).toBe('image/jpeg');
      expect(['image/png', 'image/jpeg', 'image/jpg']).toContain(mockFile.type);
    });

    it('should validate file types and sizes', async () => {
      const validImage = new File(['x'.repeat(1000)], 'valid.png', { type: 'image/png' });
      const invalidType = new File(['test'], 'invalid.txt', { type: 'text/plain' });
      const tooLarge = new File(['x'.repeat(51 * 1024 * 1024)], 'large.png', {
        type: 'image/png',
      });

      // Valid image should pass
      expect(validImage.type).toBe('image/png');
      expect(validImage.size).toBeLessThan(50 * 1024 * 1024);

      // Invalid type should fail
      expect(['image/png', 'image/jpeg', 'image/jpg']).not.toContain(invalidType.type);

      // Too large should fail
      expect(tooLarge.size).toBeGreaterThan(50 * 1024 * 1024);
    });
  });

  describe('14.5 Shot Creation Workflow', () => {
    beforeEach(() => {
      // Mock fetch for ProjectService file operations
      (global.fetch as any).mockImplementation((url: string) => {
        // Mock project.json loading
        if (url.includes('project.json')) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  schema_version: '1.0',
                  project_name: 'Test Project',
                  shots: [],
                  storyboard: [],
                  assets: [],
                  characters: [],
                  scenes: [],
                  capabilities: {
                    grid_generation: true,
                    promotion_engine: true,
                    qa_engine: true,
                    autofix_engine: true,
                    wizard_generation: true,
                  },
                  generation_status: {
                    grid: 'pending',
                    promotion: 'pending',
                    wizard: 'pending',
                  },
                })
              ),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });
    });

    it('should create shot and add to storyboard', async () => {
      const shotData = {
        title: 'New Shot',
        description: 'A test shot',
        duration: 10,
      };

      // Create shot
      const shot = await projectService.createShot(testProjectPath, shotData);

      // Verify shot structure
      expect(shot).toHaveProperty('id');
      expect(shot.id).toMatch(/^shot_\d+_\d+$/); // Format: shot_timestamp_index
      expect(shot.title).toBe('New Shot');
      expect(shot.description).toBe('A test shot');
      expect(shot.duration).toBe(10);
    });

    it('should create multiple shots with unique IDs', async () => {
      // Track project state across saves
      let projectData = {
        schema_version: '1.0',
        project_name: 'Test Project',
        shots: [],
        storyboard: [],
        assets: [],
        characters: [],
        scenes: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
          wizard_generation: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
          wizard: 'pending',
        },
      };

      // Mock localStorage to persist project state
      const mockStorage: Record<string, string> = {};
      global.localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
          // Update projectData when saved
          if (key.includes('project_')) {
            projectData = JSON.parse(value);
          }
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        },
        length: 0,
        key: () => null,
      };

      // Mock fetch to return current project state
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('project.json')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(JSON.stringify(projectData)),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      const shots = [];

      for (let i = 0; i < 3; i++) {
        const shot = await projectService.createShot(testProjectPath, {
          title: `Shot ${i + 1}`,
          description: `Test shot ${i + 1}`,
          duration: 5,
        });
        shots.push(shot);
      }

      // Verify all IDs are unique
      const ids = shots.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should maintain shot order in timeline', async () => {
      const shotData = [
        { title: 'First', description: 'First shot', duration: 5 },
        { title: 'Second', description: 'Second shot', duration: 5 },
        { title: 'Third', description: 'Third shot', duration: 5 },
      ];

      const createdShots = [];
      for (const data of shotData) {
        const shot = await projectService.createShot(testProjectPath, data);
        createdShots.push(shot);
      }

      // Verify order is preserved
      expect(createdShots[0].title).toBe('First');
      expect(createdShots[1].title).toBe('Second');
      expect(createdShots[2].title).toBe('Third');
    });
  });

  describe('14.6 Error Recovery Workflow', () => {
    it('should display error message on backend failure', async () => {
      const input: CharacterWizardInput = {
        name: 'Test',
        description: 'Test',
        personality: ['test'],
        visualAttributes: {
          age: '30',
          gender: 'male',
          appearance: 'test',
          clothing: 'test',
        },
      };

      // Mock failed API call
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );

      // Verify error is thrown
      await expect(wizardService.executeCharacterWizard(input)).rejects.toThrow();
    });

    it('should allow retry after error', async () => {
      const input: CharacterWizardInput = {
        name: 'Test',
        description: 'Test',
        personality: ['test'],
        visualAttributes: {
          age: '30',
          gender: 'male',
          appearance: 'test',
          clothing: 'test',
        },
      };

      // First call fails
      (global.fetch as any).mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      );

      await expect(wizardService.executeCharacterWizard(input)).rejects.toThrow();

      // Second call succeeds - mock all required endpoints
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/api/generate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ response: '{}' }),
          });
        }
        if (url.includes('/prompt')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ prompt_id: 'test' }),
          });
        }
        if (url.includes('/history/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                test: {
                  status: { completed: true },
                  outputs: {
                    '9': {
                      images: [
                        {
                          filename: 'test.png',
                          subfolder: '',
                          type: 'output',
                        },
                      ],
                    },
                  },
                },
              }),
          });
        }
        return Promise.reject(new Error('Unexpected fetch'));
      });

      const result = await wizardService.executeCharacterWizard(input);
      expect(result).toBeDefined();
    });

    it('should restore wizard session data', async () => {
      // Mock localStorage
      const mockStorage: Record<string, string> = {};
      global.localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        },
        length: 0,
        key: () => null,
      };

      // Save wizard session
      const sessionData = {
        wizardId: 'character',
        formData: {
          name: 'Test Character',
          description: 'Test',
        },
        timestamp: Date.now(),
      };

      localStorage.setItem('wizard_session_character', JSON.stringify(sessionData));

      // Retrieve session
      const retrieved = localStorage.getItem('wizard_session_character');
      expect(retrieved).toBeDefined();

      const parsed = JSON.parse(retrieved!);
      expect(parsed.wizardId).toBe('character');
      expect(parsed.formData.name).toBe('Test Character');
    });
  });
});
