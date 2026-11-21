/**
 * Visual Style Service Tests
 * 
 * Tests for visual style application functionality
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6
 */

import { describe, it, expect } from 'vitest';
import {
  applyStyleToShot,
  applyStyleToMultipleShots,
  removeStyleFromShot,
  updateStyleIntensity,
  updateStyleParameters,
  haveShotsConsistentStyle,
  getStylePreviewData,
  validateStyleParameters,
  createDefaultStyleParameters,
  mergeStyleParameters,
} from '../visualStyleService';
import type { Asset, Shot, StyleMetadata } from '../../types';

// ============================================================================
// Test Data
// ============================================================================

const mockStyleAsset: Asset = {
  id: 'style-1',
  name: 'Cinematic Blue',
  type: 'visual-style',
  category: 'visual-styles',
  thumbnailUrl: '/assets/styles/cinematic-blue.jpg',
  metadata: {
    description: 'Cool cinematic blue tone',
    styleMetadata: {
      intensity: 80,
      colorPalette: ['#1a2a3a', '#2a4a6a', '#3a6a9a'],
      artisticStyle: 'Cinematic',
    },
  },
  tags: ['cinematic', 'blue', 'cool'],
  source: 'builtin',
  createdAt: new Date('2024-01-01'),
};

const mockShot: Shot = {
  id: 'shot-1',
  name: 'Opening Scene',
  startTime: 0,
  duration: 120,
  layers: [],
  referenceImages: [],
  prompt: 'A beautiful landscape',
  parameters: {
    seed: 12345,
    denoising: 0.75,
    steps: 30,
    guidance: 7.5,
    sampler: 'euler',
    scheduler: 'normal',
  },
  generationStatus: 'pending',
};

// ============================================================================
// Tests
// ============================================================================

describe('visualStyleService', () => {
  describe('applyStyleToShot', () => {
    it('should apply style to shot with default intensity', () => {
      const result = applyStyleToShot(mockShot, mockStyleAsset);

      expect(result.visualStyle).toBeDefined();
      expect(result.visualStyle?.styleId).toBe('style-1');
      expect(result.visualStyle?.styleName).toBe('Cinematic Blue');
      expect(result.visualStyle?.intensity).toBe(100);
      expect(result.modified).toBe(true);
    });

    it('should apply style with custom intensity', () => {
      const result = applyStyleToShot(mockShot, mockStyleAsset, 50);

      expect(result.visualStyle?.intensity).toBe(50);
    });

    it('should include style parameters', () => {
      const result = applyStyleToShot(mockShot, mockStyleAsset);

      expect(result.visualStyle?.parameters).toBeDefined();
      expect(result.visualStyle?.parameters.colorPalette).toEqual([
        '#1a2a3a',
        '#2a4a6a',
        '#3a6a9a',
      ]);
      expect(result.visualStyle?.parameters.artisticStyle).toBe('Cinematic');
    });

    it('should throw error for non-style asset', () => {
      const nonStyleAsset = { ...mockStyleAsset, type: 'character' as const };

      expect(() => applyStyleToShot(mockShot, nonStyleAsset)).toThrow(
        'Asset must be of type visual-style'
      );
    });

    it('should throw error for asset without styleMetadata', () => {
      const assetWithoutMetadata = {
        ...mockStyleAsset,
        metadata: { description: 'Test' },
      };

      expect(() => applyStyleToShot(mockShot, assetWithoutMetadata)).toThrow(
        'Style asset missing styleMetadata'
      );
    });
  });

  describe('applyStyleToMultipleShots', () => {
    it('should apply style to multiple shots', () => {
      const shots = [
        mockShot,
        { ...mockShot, id: 'shot-2', name: 'Scene 2' },
        { ...mockShot, id: 'shot-3', name: 'Scene 3' },
      ];

      const results = applyStyleToMultipleShots(shots, mockStyleAsset, 75);

      expect(results).toHaveLength(3);
      results.forEach((shot) => {
        expect(shot.visualStyle).toBeDefined();
        expect(shot.visualStyle?.styleId).toBe('style-1');
        expect(shot.visualStyle?.intensity).toBe(75);
        expect(shot.modified).toBe(true);
      });
    });

    it('should handle empty array', () => {
      const results = applyStyleToMultipleShots([], mockStyleAsset);

      expect(results).toHaveLength(0);
    });
  });

  describe('removeStyleFromShot', () => {
    it('should remove style from shot', () => {
      const styledShot = applyStyleToShot(mockShot, mockStyleAsset);
      const result = removeStyleFromShot(styledShot);

      expect(result.visualStyle).toBeUndefined();
      expect(result.modified).toBe(true);
    });
  });

  describe('updateStyleIntensity', () => {
    it('should update style intensity', () => {
      const styledShot = applyStyleToShot(mockShot, mockStyleAsset, 100);
      const result = updateStyleIntensity(styledShot, 50);

      expect(result.visualStyle?.intensity).toBe(50);
      expect(result.modified).toBe(true);
    });

    it('should clamp intensity to 0-100 range', () => {
      const styledShot = applyStyleToShot(mockShot, mockStyleAsset);

      const resultLow = updateStyleIntensity(styledShot, -10);
      expect(resultLow.visualStyle?.intensity).toBe(0);

      const resultHigh = updateStyleIntensity(styledShot, 150);
      expect(resultHigh.visualStyle?.intensity).toBe(100);
    });

    it('should throw error if shot has no style', () => {
      expect(() => updateStyleIntensity(mockShot, 50)).toThrow(
        'Shot does not have a visual style applied'
      );
    });
  });

  describe('updateStyleParameters', () => {
    it('should update style parameters', () => {
      const styledShot = applyStyleToShot(mockShot, mockStyleAsset);
      const result = updateStyleParameters(styledShot, {
        saturation: 75,
        contrast: 60,
      });

      expect(result.visualStyle?.parameters.saturation).toBe(75);
      expect(result.visualStyle?.parameters.contrast).toBe(60);
      expect(result.modified).toBe(true);
    });

    it('should throw error if shot has no style', () => {
      expect(() =>
        updateStyleParameters(mockShot, { saturation: 50 })
      ).toThrow('Shot does not have a visual style applied');
    });
  });

  describe('haveShotsConsistentStyle', () => {
    it('should return true for empty array', () => {
      expect(haveShotsConsistentStyle([])).toBe(true);
    });

    it('should return true for single shot', () => {
      expect(haveShotsConsistentStyle([mockShot])).toBe(true);
    });

    it('should return true for shots with same style', () => {
      const shot1 = applyStyleToShot(mockShot, mockStyleAsset, 80);
      const shot2 = applyStyleToShot(
        { ...mockShot, id: 'shot-2' },
        mockStyleAsset,
        80
      );

      expect(haveShotsConsistentStyle([shot1, shot2])).toBe(true);
    });

    it('should return false for shots with different intensities', () => {
      const shot1 = applyStyleToShot(mockShot, mockStyleAsset, 80);
      const shot2 = applyStyleToShot(
        { ...mockShot, id: 'shot-2' },
        mockStyleAsset,
        60
      );

      expect(haveShotsConsistentStyle([shot1, shot2])).toBe(false);
    });

    it('should return false for shots with different styles', () => {
      const shot1 = applyStyleToShot(mockShot, mockStyleAsset);
      const shot2 = applyStyleToShot(
        { ...mockShot, id: 'shot-2' },
        { ...mockStyleAsset, id: 'style-2' }
      );

      expect(haveShotsConsistentStyle([shot1, shot2])).toBe(false);
    });

    it('should return true for shots without styles', () => {
      const shot1 = mockShot;
      const shot2 = { ...mockShot, id: 'shot-2' };

      expect(haveShotsConsistentStyle([shot1, shot2])).toBe(true);
    });

    it('should return false for mixed styled and unstyled shots', () => {
      const shot1 = applyStyleToShot(mockShot, mockStyleAsset);
      const shot2 = { ...mockShot, id: 'shot-2' };

      expect(haveShotsConsistentStyle([shot1, shot2])).toBe(false);
    });
  });

  describe('getStylePreviewData', () => {
    it('should extract preview data from style asset', () => {
      const result = getStylePreviewData(mockStyleAsset);

      expect(result.thumbnailUrl).toBe('/assets/styles/cinematic-blue.jpg');
      expect(result.description).toBe('Cool cinematic blue tone');
      expect(result.colorPalette).toEqual([
        '#1a2a3a',
        '#2a4a6a',
        '#3a6a9a',
      ]);
      expect(result.artisticStyle).toBe('Cinematic');
    });

    it('should throw error for non-style asset', () => {
      const nonStyleAsset = { ...mockStyleAsset, type: 'character' as const };

      expect(() => getStylePreviewData(nonStyleAsset)).toThrow(
        'Asset must be of type visual-style'
      );
    });
  });

  describe('validateStyleParameters', () => {
    it('should validate correct parameters', () => {
      const params = {
        saturation: 50,
        contrast: 60,
        brightness: 70,
        temperature: 50,
      };

      expect(validateStyleParameters(params)).toBe(true);
    });

    it('should reject parameters outside 0-100 range', () => {
      const paramsLow = { saturation: -10 };
      const paramsHigh = { contrast: 150 };

      expect(validateStyleParameters(paramsLow)).toBe(false);
      expect(validateStyleParameters(paramsHigh)).toBe(false);
    });

    it('should accept parameters at boundaries', () => {
      const params = {
        saturation: 0,
        contrast: 100,
      };

      expect(validateStyleParameters(params)).toBe(true);
    });
  });

  describe('createDefaultStyleParameters', () => {
    it('should create default parameters', () => {
      const params = createDefaultStyleParameters();

      expect(params.saturation).toBe(50);
      expect(params.contrast).toBe(50);
      expect(params.brightness).toBe(50);
      expect(params.temperature).toBe(50);
      expect(params.tint).toBe(50);
      expect(params.vignette).toBe(0);
      expect(params.grain).toBe(0);
      expect(params.sharpness).toBe(50);
    });
  });

  describe('mergeStyleParameters', () => {
    it('should merge parameters with defaults', () => {
      const custom = {
        saturation: 75,
        contrast: 80,
      };

      const result = mergeStyleParameters(custom);

      expect(result.saturation).toBe(75);
      expect(result.contrast).toBe(80);
      expect(result.brightness).toBe(50); // default
      expect(result.temperature).toBe(50); // default
    });

    it('should use all defaults when no custom parameters', () => {
      const result = mergeStyleParameters({});

      expect(result).toEqual(createDefaultStyleParameters());
    });
  });
});
