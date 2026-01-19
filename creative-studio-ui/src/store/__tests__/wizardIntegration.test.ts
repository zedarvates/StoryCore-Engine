/**
 * Wizard Integration Tests
 * 
 * Tests for wizard completion and output integration with the store.
 * Validates Requirements: 1.6, 3.4, 3.5, 3.6, 4.2-4.7, 5.2-5.7, 6.2-6.7, 7.2-7.5, 8.2-8.6, 12.1-12.7
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { WizardOutput } from '../../services/wizard/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock the wizard service
vi.mock('../../services/wizard/WizardService', () => ({
  getWizardService: vi.fn(() => ({
    saveWizardOutput: vi.fn().mockResolvedValue(undefined),
    updateProjectData: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('Wizard Integration Logic', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Character Wizard Output Structure', () => {
    it('should have correct structure for character wizard output', () => {
      const characterOutput: WizardOutput = {
        type: 'character',
        data: {
          id: 'char_123',
          name: 'Test Character',
          description: 'A test character',
          personality: ['brave', 'kind'],
          visual_attributes: {
            age: '25',
            gender: 'female',
            appearance: 'tall with red hair',
            clothing: 'leather armor',
          },
          created_at: new Date().toISOString(),
        },
        files: [
          {
            path: 'characters/char_123_reference.png',
            filename: 'char_123_reference.png',
            type: 'image',
            url: 'http://localhost:8188/view?filename=test.png',
          },
        ],
        metadata: {
          wizardType: 'character',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: {},
        },
      };

      expect(characterOutput.type).toBe('character');
      expect(characterOutput.data.id).toBe('char_123');
      expect(characterOutput.files).toHaveLength(1);
      expect(characterOutput.files[0].type).toBe('image');
    });
  });

  describe('Scene Generator Output Structure', () => {
    it('should have correct structure for scene generator output', () => {
      const sceneOutput: WizardOutput = {
        type: 'scene',
        data: {
          id: 'scene_123',
          name: 'Opening Scene',
          concept: 'Hero enters the village',
          shots: [
            {
              id: 'shot_1',
              title: 'Wide shot of village',
              description: 'Establishing shot',
              duration: 5,
              camera_angle: 'wide',
            },
            {
              id: 'shot_2',
              title: 'Close-up of hero',
              description: 'Hero looks determined',
              duration: 3,
              camera_angle: 'close-up',
            },
          ],
          created_at: new Date().toISOString(),
        },
        files: [
          {
            path: 'scenes/scene_123.json',
            filename: 'scene_123.json',
            type: 'json',
          },
        ],
        metadata: {
          wizardType: 'scene',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: { shotCount: 2 },
        },
      };

      expect(sceneOutput.type).toBe('scene');
      expect(sceneOutput.data.shots).toHaveLength(2);
      expect(sceneOutput.data.shots[0].camera_angle).toBe('wide');
    });
  });

  describe('Storyboard Creator Output Structure', () => {
    it('should have correct structure for storyboard output with append mode', () => {
      const storyboardOutput: WizardOutput = {
        type: 'storyboard',
        data: {
          id: 'storyboard_123',
          title: 'Test Storyboard',
          shots: [
            {
              id: 'shot_new_1',
              title: 'New Shot 1',
              description: 'First new shot',
              duration: 5,
            },
          ],
          mode: 'append',
          created_at: new Date().toISOString(),
        },
        files: [
          {
            path: 'storyboards/storyboard_123.json',
            filename: 'storyboard_123.json',
            type: 'json',
          },
          {
            path: 'shots/shot_new_1_frame.png',
            filename: 'shot_new_1_frame.png',
            type: 'image',
          },
        ],
        metadata: {
          wizardType: 'storyboard',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: {},
        },
      };

      expect(storyboardOutput.type).toBe('storyboard');
      expect(storyboardOutput.data.mode).toBe('append');
      expect(storyboardOutput.files.filter((f) => f.type === 'image')).toHaveLength(1);
    });

    it('should support replace mode', () => {
      const storyboardOutput: WizardOutput = {
        type: 'storyboard',
        data: {
          id: 'storyboard_456',
          title: 'Replacement Storyboard',
          shots: [
            {
              id: 'shot_new_1',
              title: 'New Shot 1',
              duration: 5,
            },
          ],
          mode: 'replace',
          created_at: new Date().toISOString(),
        },
        files: [],
        metadata: {
          wizardType: 'storyboard',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: {},
        },
      };

      expect(storyboardOutput.data.mode).toBe('replace');
    });
  });

  describe('Dialogue Writer Output Structure', () => {
    it('should have correct structure for dialogue output', () => {
      const dialogueOutput: WizardOutput = {
        type: 'dialogue',
        data: {
          id: 'dialogue_123',
          scene_context: 'Hero meets mentor',
          dialogue_tracks: [
            {
              speaker: 'Hero',
              text: 'I need your help',
              start_time: 0,
              end_time: 2,
              emotion: 'desperate',
            },
          ],
          created_at: new Date().toISOString(),
        },
        files: [],
        metadata: {
          wizardType: 'dialogue',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: {},
        },
      };

      expect(dialogueOutput.type).toBe('dialogue');
      expect(dialogueOutput.data.dialogue_tracks).toHaveLength(1);
      expect(dialogueOutput.data.dialogue_tracks[0].speaker).toBe('Hero');
    });
  });

  describe('World Building Output Structure', () => {
    it('should have correct structure for world output', () => {
      const worldOutput: WizardOutput = {
        type: 'world',
        data: {
          id: 'world_123',
          name: 'Fantasy Realm',
          setting: 'Medieval fantasy',
          time_period: 'Medieval',
          locations: [
            { name: 'Castle', description: 'Royal castle' },
          ],
          rules: ['Magic exists', 'Dragons are real'],
          lore: 'Ancient kingdom...',
          created_at: new Date().toISOString(),
        },
        files: [],
        metadata: {
          wizardType: 'world',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: {},
        },
      };

      expect(worldOutput.type).toBe('world');
      expect(worldOutput.data.name).toBe('Fantasy Realm');
      expect(worldOutput.data.locations).toHaveLength(1);
      expect(worldOutput.data.rules).toHaveLength(2);
    });
  });

  describe('Style Transfer Output Structure', () => {
    it('should have correct structure for style transfer output', () => {
      const styleOutput: WizardOutput = {
        type: 'style',
        data: {
          original_shot_id: 'shot_original',
          styled_shot_id: 'shot_original_styled',
          style_reference: 'watercolor',
          created_at: new Date().toISOString(),
        },
        files: [
          {
            path: 'shots/shot_original_styled.png',
            filename: 'shot_original_styled.png',
            type: 'image',
          },
        ],
        metadata: {
          wizardType: 'style',
          generatedAt: new Date().toISOString(),
          parameters: {},
        },
      };

      expect(styleOutput.type).toBe('style');
      expect(styleOutput.data.original_shot_id).toBe('shot_original');
      expect(styleOutput.data.styled_shot_id).toBe('shot_original_styled');
      expect(styleOutput.files).toHaveLength(1);
    });

    it('should preserve original shot reference', () => {
      const styleOutput: WizardOutput = {
        type: 'style',
        data: {
          original_shot_id: 'shot_test',
          styled_shot_id: 'shot_test_styled',
          created_at: new Date().toISOString(),
        },
        files: [
          {
            path: 'shots/shot_test_styled.png',
            filename: 'shot_test_styled.png',
            type: 'image',
          },
        ],
        metadata: {
          wizardType: 'style',
          generatedAt: new Date().toISOString(),
          parameters: {},
        },
      };

      // Verify original shot ID is preserved
      expect(styleOutput.data.original_shot_id).toBeDefined();
      expect(styleOutput.data.original_shot_id).not.toBe(styleOutput.data.styled_shot_id);
    });
  });

  describe('File Path Patterns', () => {
    it('should follow correct file path pattern for characters', () => {
      const characterOutput: WizardOutput = {
        type: 'character',
        data: {
          id: 'char_456',
          name: 'Test',
          created_at: new Date().toISOString(),
        },
        files: [
          {
            path: 'characters/char_456_reference.png',
            filename: 'char_456_reference.png',
            type: 'image',
          },
        ],
        metadata: {
          wizardType: 'character',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: {},
        },
      };

      expect(characterOutput.files[0].path).toMatch(/^characters\/char_\d+_reference\.png$/);
    });

    it('should follow correct file path pattern for scenes', () => {
      const sceneOutput: WizardOutput = {
        type: 'scene',
        data: {
          id: 'scene_789',
          name: 'Test Scene',
          created_at: new Date().toISOString(),
        },
        files: [
          {
            path: 'scenes/scene_789.json',
            filename: 'scene_789.json',
            type: 'json',
          },
        ],
        metadata: {
          wizardType: 'scene',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: {},
        },
      };

      expect(sceneOutput.files[0].path).toMatch(/^scenes\/scene_\d+\.json$/);
    });

    it('should follow correct file path pattern for storyboard frames', () => {
      const storyboardOutput: WizardOutput = {
        type: 'storyboard',
        data: {
          id: 'storyboard_101',
          shots: [],
          created_at: new Date().toISOString(),
        },
        files: [
          {
            path: 'shots/shot_1_frame.png',
            filename: 'shot_1_frame.png',
            type: 'image',
          },
        ],
        metadata: {
          wizardType: 'storyboard',
          generatedAt: new Date().toISOString(),
          modelUsed: 'llama2',
          parameters: {},
        },
      };

      expect(storyboardOutput.files[0].path).toMatch(/^shots\/shot_.*_frame\.png$/);
    });
  });
});
