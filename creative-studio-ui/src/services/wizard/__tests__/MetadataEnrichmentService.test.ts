/**
 * Tests for MetadataEnrichmentService
 * Validates metadata completeness checking and validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MetadataEnrichmentService,
  type EnhancedSceneBreakdown,
  type EnhancedShotPlan,
  type CompletenessReport,
} from '../MetadataEnrichmentService';

describe('MetadataEnrichmentService', () => {
  let service: MetadataEnrichmentService;

  beforeEach(() => {
    service = new MetadataEnrichmentService();
  });

  describe('checkSceneCompleteness', () => {
    it('should return 100% completeness for fully populated scene', () => {
      const scene: EnhancedSceneBreakdown = {
        id: 'scene-1',
        sceneNumber: 1,
        sceneName: 'Opening Scene',
        durationMinutes: 5,
        locationId: 'loc-1',
        characterIds: ['char-1', 'char-2'],
        timeOfDay: 'morning',
        emotionalBeat: 'hopeful',
        keyActions: ['character enters', 'dialogue exchange'],
        order: 1,
        promptMetadata: {
          timeOfDayPrompt: {
            promptId: 'tod-morning',
            category: 'time-of-day',
            name: 'Morning Light',
          },
          moodPrompts: [
            {
              promptId: 'mood-hopeful',
              category: 'mood',
              name: 'Hopeful',
            },
          ],
          lightingPrompt: {
            promptId: 'light-natural',
            category: 'lighting',
            name: 'Natural Light',
          },
          colorPalettePrompt: {
            promptId: 'palette-warm',
            category: 'color',
            name: 'Warm Tones',
          },
        },
        technicalSpecs: {
          lighting: {
            type: 'natural',
            intensity: 'medium',
            direction: 'side',
            colorTemp: '5600K',
            shadowQuality: 'soft',
          },
          colorTemperature: '5600K',
          atmosphere: {
            mood: 'hopeful',
            intensity: 7,
            effects: ['lens flare', 'soft glow'],
          },
          suggestedDuration: 5,
        },
      };

      const result = service.checkSceneCompleteness(scene);

      expect(result.entityId).toBe('scene-1');
      expect(result.entityType).toBe('scene');
      expect(result.completenessScore).toBe(100);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should identify missing required fields', () => {
      const scene: EnhancedSceneBreakdown = {
        id: 'scene-2',
        sceneNumber: 2,
        sceneName: '',
        durationMinutes: 0,
        locationId: '',
        characterIds: [],
        timeOfDay: 'afternoon',
        emotionalBeat: '',
        keyActions: [],
        order: 2,
      };

      const result = service.checkSceneCompleteness(scene);

      expect(result.completenessScore).toBeLessThan(100);
      expect(result.missingFields.length).toBeGreaterThan(0);
      expect(result.missingFields).toContain('sceneName');
      expect(result.missingFields).toContain('locationId');
    });

    it('should calculate weighted completeness correctly', () => {
      const sceneWithCoreFields: EnhancedSceneBreakdown = {
        id: 'scene-3',
        sceneNumber: 3,
        sceneName: 'Test Scene',
        durationMinutes: 3,
        locationId: 'loc-1',
        characterIds: ['char-1'],
        timeOfDay: 'evening',
        emotionalBeat: 'tense',
        keyActions: ['action'],
        order: 3,
        // Missing all enhanced metadata
      };

      const result = service.checkSceneCompleteness(sceneWithCoreFields);

      // Should have decent score because core fields (weight 1.0) are complete
      // but missing enhanced metadata reduces overall score
      expect(result.completenessScore).toBeGreaterThan(60);
      expect(result.completenessScore).toBeLessThan(100);
      expect(result.optionalFields.length).toBeGreaterThan(0);
    });
  });

  describe('checkShotCompleteness', () => {
    it('should return 100% completeness for fully populated shot', () => {
      const shot: EnhancedShotPlan = {
        id: 'shot-1',
        sceneId: 'scene-1',
        shotNumber: 1,
        shotType: 'medium',
        cameraAngle: 'eye-level',
        cameraMovement: 'dolly',
        transition: 'cut',
        compositionNotes: 'Rule of thirds',
        order: 1,
        promptMetadata: {
          shotTypePrompt: {
            promptId: 'shot-medium',
            category: 'shot-type',
            name: 'Medium Shot',
          },
          cameraAnglePrompt: {
            promptId: 'angle-eye',
            category: 'camera-angle',
            name: 'Eye Level',
          },
          cameraMovementPrompt: {
            promptId: 'move-dolly',
            category: 'camera-movement',
            name: 'Dolly',
          },
          transitionPrompt: {
            promptId: 'trans-cut',
            category: 'transition',
            name: 'Cut',
          },
        },
        technicalSpecs: {
          framing: {
            type: 'medium',
            aspectRatio: '16:9',
            composition: 'rule-of-thirds',
            focusPoint: 'center',
          },
          perspective: {
            angle: 'eye-level',
            height: 'medium',
            psychologicalEffect: 'neutral',
            commonUses: ['dialogue', 'action'],
          },
          motion: {
            type: 'dolly',
            speed: 'medium',
            direction: 'forward',
            purpose: 'reveal',
          },
          editing: {
            transitionType: 'cut',
            duration: 0,
            effect: 'none',
            purpose: 'continuity',
          },
        },
        combinedPrompt: {
          base: 'Medium shot at eye level with dolly movement',
          positive: 'professional cinematography, smooth motion',
          negative: 'shaky, amateur',
          technical: { fps: 24, resolution: '4K' },
        },
      };

      const result = service.checkShotCompleteness(shot);

      expect(result.entityId).toBe('shot-1');
      expect(result.entityType).toBe('shot');
      expect(result.completenessScore).toBe(100);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should identify missing cinematography metadata', () => {
      const shot: EnhancedShotPlan = {
        id: 'shot-2',
        sceneId: 'scene-1',
        shotNumber: 2,
        shotType: 'close-up',
        cameraAngle: 'high-angle',
        cameraMovement: 'static',
        transition: 'fade',
        compositionNotes: '',
        order: 2,
        // Missing all enhanced metadata
      };

      const result = service.checkShotCompleteness(shot);

      expect(result.completenessScore).toBeLessThan(100);
      expect(result.optionalFields.length).toBeGreaterThan(0);
      expect(result.optionalFields.some((f) => f.includes('promptMetadata'))).toBe(true);
    });
  });

  describe('checkCompleteness', () => {
    it('should achieve 90%+ completeness with fully enriched data', () => {
      const scenes: EnhancedSceneBreakdown[] = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          sceneName: 'Opening',
          durationMinutes: 5,
          locationId: 'loc-1',
          characterIds: ['char-1'],
          timeOfDay: 'morning',
          emotionalBeat: 'hopeful',
          keyActions: ['enter', 'greet'],
          order: 1,
          promptMetadata: {
            timeOfDayPrompt: {
              promptId: 'tod-1',
              category: 'time',
              name: 'Morning',
            },
            moodPrompts: [
              {
                promptId: 'mood-1',
                category: 'mood',
                name: 'Hopeful',
              },
            ],
            lightingPrompt: {
              promptId: 'light-1',
              category: 'lighting',
              name: 'Natural',
            },
            colorPalettePrompt: {
              promptId: 'palette-1',
              category: 'color',
              name: 'Warm',
            },
          },
          technicalSpecs: {
            lighting: {
              type: 'natural',
              intensity: 'medium',
              direction: 'side',
              colorTemp: '5600K',
              shadowQuality: 'soft',
            },
            colorTemperature: '5600K',
            atmosphere: {
              mood: 'hopeful',
              intensity: 7,
              effects: ['soft glow'],
            },
            suggestedDuration: 5,
          },
        },
      ];

      const shots: EnhancedShotPlan[] = [
        {
          id: 'shot-1',
          sceneId: 'scene-1',
          shotNumber: 1,
          shotType: 'medium',
          cameraAngle: 'eye-level',
          cameraMovement: 'static',
          transition: 'cut',
          compositionNotes: 'Centered',
          order: 1,
          promptMetadata: {
            shotTypePrompt: {
              promptId: 'shot-1',
              category: 'shot',
              name: 'Medium',
            },
            cameraAnglePrompt: {
              promptId: 'angle-1',
              category: 'angle',
              name: 'Eye Level',
            },
            cameraMovementPrompt: {
              promptId: 'move-1',
              category: 'movement',
              name: 'Static',
            },
            transitionPrompt: {
              promptId: 'trans-1',
              category: 'transition',
              name: 'Cut',
            },
          },
          technicalSpecs: {
            framing: {
              type: 'medium',
              aspectRatio: '16:9',
              composition: 'center',
              focusPoint: 'subject',
            },
            perspective: {
              angle: 'eye-level',
              height: 'medium',
              psychologicalEffect: 'neutral',
              commonUses: ['dialogue', 'action'],
            },
            motion: {
              type: 'static',
              speed: 'none',
              direction: 'none',
              purpose: 'stability',
            },
            editing: {
              transitionType: 'cut',
              duration: 0,
              effect: 'none',
              purpose: 'continuity',
            },
          },
          combinedPrompt: {
            base: 'Medium shot',
            positive: 'professional',
            negative: 'amateur',
            technical: { fps: 24, resolution: '4K' },
          },
        },
      ];

      const report = service.checkCompleteness(scenes, shots);

      expect(report.overallScore).toBeGreaterThanOrEqual(90);
      expect(report.meetsThreshold).toBe(true);
      expect(report.sceneCompleteness).toHaveLength(1);
      expect(report.shotCompleteness).toHaveLength(1);
    });

    it('should fail to meet 90% threshold with minimal data', () => {
      const scenes: EnhancedSceneBreakdown[] = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          sceneName: 'Test',
          durationMinutes: 1,
          locationId: 'loc-1',
          characterIds: ['char-1'],
          timeOfDay: 'morning',
          emotionalBeat: '',
          keyActions: [],
          order: 1,
          // No enhanced metadata
        },
      ];

      const shots: EnhancedShotPlan[] = [
        {
          id: 'shot-1',
          sceneId: 'scene-1',
          shotNumber: 1,
          shotType: 'medium',
          cameraAngle: 'eye-level',
          cameraMovement: 'static',
          transition: 'cut',
          compositionNotes: '',
          order: 1,
          // No enhanced metadata
        },
      ];

      const report = service.checkCompleteness(scenes, shots);

      expect(report.overallScore).toBeLessThan(90);
      expect(report.meetsThreshold).toBe(false);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide actionable recommendations', () => {
      const scenes: EnhancedSceneBreakdown[] = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          sceneName: 'Test Scene',
          durationMinutes: 3,
          locationId: 'loc-1',
          characterIds: ['char-1'],
          timeOfDay: 'afternoon',
          emotionalBeat: 'neutral',
          keyActions: ['action'],
          order: 1,
        },
      ];

      const shots: EnhancedShotPlan[] = [
        {
          id: 'shot-1',
          sceneId: 'scene-1',
          shotNumber: 1,
          shotType: 'wide',
          cameraAngle: 'eye-level',
          cameraMovement: 'static',
          transition: 'cut',
          compositionNotes: 'Standard',
          order: 1,
        },
      ];

      const report = service.checkCompleteness(scenes, shots);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some((r) => r.includes('prompt'))).toBe(true);
    });

    it('should calculate statistics correctly', () => {
      const scenes: EnhancedSceneBreakdown[] = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          sceneName: 'Scene 1',
          durationMinutes: 2,
          locationId: 'loc-1',
          characterIds: ['char-1'],
          timeOfDay: 'morning',
          emotionalBeat: 'happy',
          keyActions: ['walk'],
          order: 1,
        },
        {
          id: 'scene-2',
          sceneNumber: 2,
          sceneName: 'Scene 2',
          durationMinutes: 3,
          locationId: 'loc-2',
          characterIds: ['char-2'],
          timeOfDay: 'evening',
          emotionalBeat: 'sad',
          keyActions: ['sit'],
          order: 2,
        },
      ];

      const shots: EnhancedShotPlan[] = [
        {
          id: 'shot-1',
          sceneId: 'scene-1',
          shotNumber: 1,
          shotType: 'wide',
          cameraAngle: 'eye-level',
          cameraMovement: 'static',
          transition: 'cut',
          compositionNotes: 'Wide',
          order: 1,
        },
      ];

      const report = service.checkCompleteness(scenes, shots);

      expect(report.sceneCompleteness).toHaveLength(2);
      expect(report.shotCompleteness).toHaveLength(1);
      expect(report.totalFields).toBeGreaterThan(0);
      expect(report.completedFields).toBeGreaterThan(0);
      expect(report.completedFields).toBeLessThanOrEqual(report.totalFields);
    });
  });

  describe('validateMetadata', () => {
    it('should pass validation for valid data', () => {
      const scenes: EnhancedSceneBreakdown[] = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          sceneName: 'Valid Scene',
          durationMinutes: 5,
          locationId: 'loc-1',
          characterIds: ['char-1'],
          timeOfDay: 'morning',
          emotionalBeat: 'happy',
          keyActions: ['action'],
          order: 1,
        },
      ];

      const shots: EnhancedShotPlan[] = [
        {
          id: 'shot-1',
          sceneId: 'scene-1',
          shotNumber: 1,
          shotType: 'medium',
          cameraAngle: 'eye-level',
          cameraMovement: 'static',
          transition: 'cut',
          compositionNotes: 'Standard',
          order: 1,
        },
      ];

      const result = service.validateMetadata(scenes, shots);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required scene fields', () => {
      const scenes: EnhancedSceneBreakdown[] = [
        {
          id: '',
          sceneNumber: 1,
          sceneName: '',
          durationMinutes: 0,
          locationId: '',
          characterIds: [],
          timeOfDay: 'morning',
          emotionalBeat: '',
          keyActions: [],
          order: 1,
        },
      ];

      const shots: EnhancedShotPlan[] = [];

      const result = service.validateMetadata(scenes, shots);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.field.includes('id'))).toBe(true);
      expect(result.errors.some((e) => e.field.includes('sceneName'))).toBe(true);
    });

    it('should detect invalid shot references', () => {
      const scenes: EnhancedSceneBreakdown[] = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          sceneName: 'Scene 1',
          durationMinutes: 5,
          locationId: 'loc-1',
          characterIds: ['char-1'],
          timeOfDay: 'morning',
          emotionalBeat: 'happy',
          keyActions: ['action'],
          order: 1,
        },
      ];

      const shots: EnhancedShotPlan[] = [
        {
          id: 'shot-1',
          sceneId: 'non-existent-scene',
          shotNumber: 1,
          shotType: 'medium',
          cameraAngle: 'eye-level',
          cameraMovement: 'static',
          transition: 'cut',
          compositionNotes: 'Standard',
          order: 1,
        },
      ];

      const result = service.validateMetadata(scenes, shots);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('non-existent'))).toBe(true);
    });

    it('should generate warnings for missing enhanced metadata', () => {
      const scenes: EnhancedSceneBreakdown[] = [
        {
          id: 'scene-1',
          sceneNumber: 1,
          sceneName: 'Scene 1',
          durationMinutes: 5,
          locationId: 'loc-1',
          characterIds: ['char-1'],
          timeOfDay: 'morning',
          emotionalBeat: 'happy',
          keyActions: ['action'],
          order: 1,
          // No promptMetadata
        },
      ];

      const shots: EnhancedShotPlan[] = [
        {
          id: 'shot-1',
          sceneId: 'scene-1',
          shotNumber: 1,
          shotType: 'medium',
          cameraAngle: 'eye-level',
          cameraMovement: 'static',
          transition: 'cut',
          compositionNotes: 'Standard',
          order: 1,
          // No promptMetadata or combinedPrompt
        },
      ];

      const result = service.validateMetadata(scenes, shots);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.message.includes('prompt'))).toBe(true);
    });
  });

  describe('90% completeness threshold', () => {
    it('should meet 90% threshold with comprehensive metadata', () => {
      // Create 10 scenes with full metadata
      const scenes: EnhancedSceneBreakdown[] = Array.from({ length: 10 }, (_, i) => ({
        id: `scene-${i + 1}`,
        sceneNumber: i + 1,
        sceneName: `Scene ${i + 1}`,
        durationMinutes: 3,
        locationId: `loc-${i + 1}`,
        characterIds: [`char-${i + 1}`],
        timeOfDay: 'morning',
        emotionalBeat: 'neutral',
        keyActions: ['action'],
        order: i + 1,
        promptMetadata: {
          timeOfDayPrompt: {
            promptId: 'tod-1',
            category: 'time',
            name: 'Morning',
          },
          moodPrompts: [
            {
              promptId: 'mood-1',
              category: 'mood',
              name: 'Neutral',
            },
          ],
          lightingPrompt: {
            promptId: 'light-1',
            category: 'lighting',
            name: 'Natural',
          },
        },
        technicalSpecs: {
          lighting: {
            type: 'natural',
            intensity: 'medium',
            direction: 'front',
            colorTemp: '5600K',
            shadowQuality: 'soft',
          },
          colorTemperature: '5600K',
          atmosphere: {
            mood: 'neutral',
            intensity: 5,
            effects: [],
          },
          suggestedDuration: 3,
        },
      }));

      // Create 30 shots with full metadata (3 per scene)
      const shots: EnhancedShotPlan[] = Array.from({ length: 30 }, (_, i) => ({
        id: `shot-${i + 1}`,
        sceneId: `scene-${Math.floor(i / 3) + 1}`,
        shotNumber: i + 1,
        shotType: 'medium',
        cameraAngle: 'eye-level',
        cameraMovement: 'static',
        transition: 'cut',
        compositionNotes: 'Standard composition',
        order: i + 1,
        promptMetadata: {
          shotTypePrompt: {
            promptId: 'shot-1',
            category: 'shot',
            name: 'Medium',
          },
          cameraAnglePrompt: {
            promptId: 'angle-1',
            category: 'angle',
            name: 'Eye Level',
          },
          cameraMovementPrompt: {
            promptId: 'move-1',
            category: 'movement',
            name: 'Static',
          },
          transitionPrompt: {
            promptId: 'trans-1',
            category: 'transition',
            name: 'Cut',
          },
        },
        technicalSpecs: {
          framing: {
            type: 'medium',
            aspectRatio: '16:9',
            composition: 'center',
            focusPoint: 'subject',
          },
          perspective: {
            angle: 'eye-level',
            height: 'medium',
            psychologicalEffect: 'neutral',
            commonUses: ['dialogue'],
          },
          motion: {
            type: 'static',
            speed: 'none',
            direction: 'none',
            purpose: 'stability',
          },
          editing: {
            transitionType: 'cut',
            duration: 0,
            effect: 'none',
            purpose: 'continuity',
          },
        },
        combinedPrompt: {
          base: 'Medium shot at eye level',
          positive: 'professional, clear',
          negative: 'blurry, shaky',
          technical: { fps: 24 },
        },
      }));

      const report = service.checkCompleteness(scenes, shots);

      expect(report.overallScore).toBeGreaterThanOrEqual(90);
      expect(report.meetsThreshold).toBe(true);
      expect(report.recommendations.some((r) => r.includes('✓'))).toBe(true);
    });

    it('should not meet 90% threshold with minimal metadata', () => {
      // Create 10 scenes with only required fields
      const scenes: EnhancedSceneBreakdown[] = Array.from({ length: 10 }, (_, i) => ({
        id: `scene-${i + 1}`,
        sceneNumber: i + 1,
        sceneName: `Scene ${i + 1}`,
        durationMinutes: 3,
        locationId: `loc-${i + 1}`,
        characterIds: [`char-${i + 1}`],
        timeOfDay: 'morning',
        emotionalBeat: '',
        keyActions: [],
        order: i + 1,
        // No enhanced metadata
      }));

      // Create 30 shots with only required fields
      const shots: EnhancedShotPlan[] = Array.from({ length: 30 }, (_, i) => ({
        id: `shot-${i + 1}`,
        sceneId: `scene-${Math.floor(i / 3) + 1}`,
        shotNumber: i + 1,
        shotType: 'medium',
        cameraAngle: 'eye-level',
        cameraMovement: 'static',
        transition: 'cut',
        compositionNotes: '',
        order: i + 1,
        // No enhanced metadata
      }));

      const report = service.checkCompleteness(scenes, shots);

      expect(report.overallScore).toBeLessThan(90);
      expect(report.meetsThreshold).toBe(false);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });
});

