/**
 * Unit tests for scene analysis
 * Tests scene type detection and surround sound preset suggestions
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeScene,
  analyzeMultipleShots,
  getSceneTypeDescription,
  getRecommendedMode,
  type SceneType,
} from '../sceneAnalysis';
import type { Shot } from '../../types';

describe('sceneAnalysis', () => {
  const createShot = (title: string, description: string): Shot => ({
    id: `shot-${Date.now()}`,
    title,
    description,
    duration: 5,
    audioTracks: [],
    effects: [],
    textLayers: [],
    animations: [],
    position: 0,
  });

  describe('analyzeScene', () => {
    it('should detect dialogue scene', () => {
      const shot = createShot(
        'Conversation',
        'Two characters talking and having a discussion'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('dialogue');
      expect(analysis.suggestedPreset).toBe('dialogue');
      expect(analysis.keywords.length).toBeGreaterThan(0);
    });

    it('should detect action scene', () => {
      const shot = createShot(
        'Chase Scene',
        'Intense action with explosions and fighting'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('action');
      expect(analysis.suggestedPreset).toBe('action');
    });

    it('should detect ambient scene', () => {
      const shot = createShot(
        'Forest Atmosphere',
        'Peaceful nature sounds with wind and birds in the background'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('ambient');
      expect(analysis.suggestedPreset).toBe('ambient');
    });

    it('should detect music scene', () => {
      const shot = createShot(
        'Concert Performance',
        'Band playing music on stage with orchestra'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('music');
      expect(analysis.suggestedPreset).toBe('music');
    });

    it('should detect voiceover scene', () => {
      const shot = createShot(
        'Narration',
        'Narrator explains the story and describes the scene'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('voiceover');
      expect(analysis.suggestedPreset).toBe('voiceover');
    });

    it('should detect cinematic scene', () => {
      const shot = createShot(
        'Epic Landscape',
        'Sweeping cinematic shot of majestic mountains'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('cinematic');
      expect(analysis.suggestedPreset).toBe('cinematic');
    });

    it('should return confidence score', () => {
      const shot = createShot('Test', 'dialogue conversation talking');
      const analysis = analyzeScene(shot);

      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);
    });

    it('should include reasoning', () => {
      const shot = createShot('Test', 'dialogue');
      const analysis = analyzeScene(shot);

      expect(analysis.reasoning).toBeDefined();
      expect(typeof analysis.reasoning).toBe('string');
      expect(analysis.reasoning.length).toBeGreaterThan(0);
    });

    it('should handle empty description', () => {
      const shot = createShot('', '');
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBeDefined();
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should be case-insensitive', () => {
      const shot1 = createShot('Test', 'DIALOGUE CONVERSATION');
      const shot2 = createShot('Test', 'dialogue conversation');

      const analysis1 = analyzeScene(shot1);
      const analysis2 = analyzeScene(shot2);

      expect(analysis1.sceneType).toBe(analysis2.sceneType);
    });

    it('should prioritize scene type with most keyword matches', () => {
      const shot = createShot(
        'Test',
        'dialogue talking speaking conversation interview discussion'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('dialogue');
      expect(analysis.keywords.length).toBeGreaterThan(3);
    });

    it('should handle mixed keywords', () => {
      const shot = createShot(
        'Test',
        'dialogue with background music and ambient sounds'
      );
      const analysis = analyzeScene(shot);

      // Should detect the dominant type
      expect(analysis.sceneType).toBeDefined();
      expect(['dialogue', 'music', 'ambient']).toContain(analysis.sceneType);
    });
  });

  describe('analyzeMultipleShots', () => {
    it('should return default for empty array', () => {
      const analysis = analyzeMultipleShots([]);

      expect(analysis.sceneType).toBe('cinematic');
      expect(analysis.confidence).toBe(0);
      expect(analysis.reasoning).toContain('No shots');
    });

    it('should analyze single shot', () => {
      const shot = createShot('Test', 'dialogue conversation');
      const analysis = analyzeMultipleShots([shot]);

      expect(analysis.sceneType).toBe('dialogue');
    });

    it('should find dominant scene type across multiple shots', () => {
      const shots = [
        createShot('Shot 1', 'dialogue conversation'),
        createShot('Shot 2', 'talking discussion'),
        createShot('Shot 3', 'action explosion'),
      ];

      const analysis = analyzeMultipleShots(shots);

      expect(analysis.sceneType).toBe('dialogue'); // 2 dialogue vs 1 action
    });

    it('should calculate average confidence', () => {
      const shots = [
        createShot('Shot 1', 'dialogue'),
        createShot('Shot 2', 'dialogue'),
      ];

      const analysis = analyzeMultipleShots(shots);

      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);
    });

    it('should collect keywords from all shots', () => {
      const shots = [
        createShot('Shot 1', 'dialogue conversation'),
        createShot('Shot 2', 'talking discussion'),
      ];

      const analysis = analyzeMultipleShots(shots);

      expect(analysis.keywords.length).toBeGreaterThan(0);
    });

    it('should include shot count in reasoning', () => {
      const shots = [
        createShot('Shot 1', 'dialogue'),
        createShot('Shot 2', 'dialogue'),
        createShot('Shot 3', 'action'),
      ];

      const analysis = analyzeMultipleShots(shots);

      expect(analysis.reasoning).toContain('3 shots');
    });
  });

  describe('getSceneTypeDescription', () => {
    it('should return description for each scene type', () => {
      const types: SceneType[] = [
        'dialogue',
        'action',
        'ambient',
        'music',
        'voiceover',
        'cinematic',
      ];

      types.forEach((type) => {
        const description = getSceneTypeDescription(type);
        expect(description).toBeDefined();
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });

    it('should return unique descriptions', () => {
      const types: SceneType[] = [
        'dialogue',
        'action',
        'ambient',
        'music',
        'voiceover',
        'cinematic',
      ];

      const descriptions = types.map(getSceneTypeDescription);
      const uniqueDescriptions = new Set(descriptions);

      expect(uniqueDescriptions.size).toBe(descriptions.length);
    });
  });

  describe('getRecommendedMode', () => {
    it('should recommend 5.1 for dialogue', () => {
      expect(getRecommendedMode('dialogue')).toBe('5.1');
    });

    it('should recommend 7.1 for action', () => {
      expect(getRecommendedMode('action')).toBe('7.1');
    });

    it('should recommend 5.1 for ambient', () => {
      expect(getRecommendedMode('ambient')).toBe('5.1');
    });

    it('should recommend 5.1 for music', () => {
      expect(getRecommendedMode('music')).toBe('5.1');
    });

    it('should recommend 5.1 for voiceover', () => {
      expect(getRecommendedMode('voiceover')).toBe('5.1');
    });

    it('should recommend 7.1 for cinematic', () => {
      expect(getRecommendedMode('cinematic')).toBe('7.1');
    });
  });

  describe('Keyword Detection', () => {
    it('should detect multiple dialogue keywords', () => {
      const shot = createShot(
        'Interview',
        'Character speaks and tells their story, asking questions and responding'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('dialogue');
      expect(analysis.keywords).toContain('speaks');
      expect(analysis.keywords).toContain('tells');
      expect(analysis.keywords).toContain('asks');
      expect(analysis.keywords).toContain('responds');
    });

    it('should detect multiple action keywords', () => {
      const shot = createShot(
        'Battle',
        'Intense fight with punching, kicking, and combat'
      );
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('action');
      expect(analysis.keywords.length).toBeGreaterThan(2);
    });

    it('should detect partial keyword matches', () => {
      const shot = createShot('Test', 'character speaking loudly');
      const analysis = analyzeScene(shot);

      expect(analysis.sceneType).toBe('dialogue');
      expect(analysis.keywords).toContain('speaking');
    });
  });

  describe('Confidence Calculation', () => {
    it('should have higher confidence with more keywords', () => {
      const shot1 = createShot('Test', 'dialogue');
      const shot2 = createShot(
        'Test',
        'dialogue conversation talking speaking discussion'
      );

      const analysis1 = analyzeScene(shot1);
      const analysis2 = analyzeScene(shot2);

      expect(analysis2.confidence).toBeGreaterThan(analysis1.confidence);
    });

    it('should indicate low confidence in reasoning', () => {
      const shot = createShot('Test', 'maybe some dialogue');
      const analysis = analyzeScene(shot);

      if (analysis.confidence < 50) {
        expect(analysis.reasoning).toContain('Low confidence');
      }
    });

    it('should indicate high confidence in reasoning', () => {
      const shot = createShot(
        'Test',
        'dialogue conversation talking speaking discussion interview'
      );
      const analysis = analyzeScene(shot);

      if (analysis.confidence >= 80) {
        expect(analysis.reasoning).toContain('High confidence');
      }
    });
  });
});
