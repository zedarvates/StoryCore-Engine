/**
 * Camera Preset Service Tests
 * 
 * Tests for camera preset management functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  getAllCameraPresets,
  getCameraPresetsByType,
  getCameraPresetById,
  getCameraPresetTypes,
  applyCameraPresetToShot,
  createCustomCameraPreset,
  validateCameraPresetParameters,
  type CameraMovementType,
} from '../cameraPresetService';

describe('cameraPresetService', () => {
  describe('getAllCameraPresets', () => {
    it('should return all camera presets', () => {
      const presets = getAllCameraPresets();
      expect(presets).toBeDefined();
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
    });

    it('should return presets with correct structure', () => {
      const presets = getAllCameraPresets();
      const preset = presets[0];
      
      expect(preset).toHaveProperty('id');
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('type', 'camera-preset');
      expect(preset).toHaveProperty('category', 'camera-presets');
      expect(preset).toHaveProperty('metadata');
      expect(preset.metadata).toHaveProperty('cameraMetadata');
    });
  });

  describe('getCameraPresetsByType', () => {
    it('should return presets filtered by movement type', () => {
      const staticPresets = getCameraPresetsByType('static');
      expect(staticPresets.every(p => p.metadata.cameraMetadata.movementType === 'static')).toBe(true);

      const panPresets = getCameraPresetsByType('pan');
      expect(panPresets.every(p => p.metadata.cameraMetadata.movementType === 'pan')).toBe(true);
    });

    it('should return empty array for type with no presets', () => {
      // All types should have presets in our implementation
      const types: CameraMovementType[] = ['static', 'pan', 'tilt', 'dolly', 'zoom', 'crane', 'tracking'];
      types.forEach(type => {
        const presets = getCameraPresetsByType(type);
        expect(Array.isArray(presets)).toBe(true);
      });
    });
  });

  describe('getCameraPresetById', () => {
    it('should return preset by ID', () => {
      const allPresets = getAllCameraPresets();
      const firstPreset = allPresets[0];
      
      const foundPreset = getCameraPresetById(firstPreset.id);
      expect(foundPreset).toBeDefined();
      expect(foundPreset?.id).toBe(firstPreset.id);
    });

    it('should return undefined for non-existent ID', () => {
      const preset = getCameraPresetById('non-existent-id');
      expect(preset).toBeUndefined();
    });
  });

  describe('getCameraPresetTypes', () => {
    it('should return all movement types with counts', () => {
      const types = getCameraPresetTypes();
      
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBe(7); // 7 movement types
      
      types.forEach(typeInfo => {
        expect(typeInfo).toHaveProperty('type');
        expect(typeInfo).toHaveProperty('count');
        expect(typeof typeInfo.count).toBe('number');
        expect(typeInfo.count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include all movement types', () => {
      const types = getCameraPresetTypes();
      const typeIds = types.map(t => t.type);
      
      expect(typeIds).toContain('static');
      expect(typeIds).toContain('pan');
      expect(typeIds).toContain('tilt');
      expect(typeIds).toContain('dolly');
      expect(typeIds).toContain('zoom');
      expect(typeIds).toContain('crane');
      expect(typeIds).toContain('tracking');
    });
  });

  describe('applyCameraPresetToShot', () => {
    it('should return camera parameters from preset', () => {
      const presets = getAllCameraPresets();
      const preset = presets[0];
      
      const parameters = applyCameraPresetToShot(preset, 'shot-123');
      
      expect(parameters).toBeDefined();
      expect(parameters).toHaveProperty('movementType');
      expect(parameters).toHaveProperty('duration');
      expect(parameters).toHaveProperty('focalLength');
      expect(parameters).toHaveProperty('trajectory');
    });

    it('should return independent copy of parameters', () => {
      const presets = getAllCameraPresets();
      const preset = presets[0];
      
      const parameters1 = applyCameraPresetToShot(preset, 'shot-1');
      const parameters2 = applyCameraPresetToShot(preset, 'shot-2');
      
      expect(parameters1).not.toBe(parameters2);
      expect(parameters1).toEqual(parameters2);
    });
  });

  describe('createCustomCameraPreset', () => {
    it('should create custom camera preset', () => {
      const preset = createCustomCameraPreset(
        'My Custom Pan',
        {
          movementType: 'pan',
          duration: 5,
          focalLength: 35,
          trajectory: 'horizontal-left',
          speed: 50,
          easing: 'ease-in-out',
        },
        'Custom pan movement',
        ['custom', 'pan', 'smooth']
      );

      expect(preset).toBeDefined();
      expect(preset.name).toBe('My Custom Pan');
      expect(preset.type).toBe('camera-preset');
      expect(preset.category).toBe('camera-presets');
      expect(preset.source).toBe('user');
      expect(preset.tags).toEqual(['custom', 'pan', 'smooth']);
      expect(preset.metadata.description).toBe('Custom pan movement');
    });

    it('should generate unique ID for custom presets', async () => {
      const preset1 = createCustomCameraPreset(
        'Preset 1',
        { movementType: 'static', duration: 5, focalLength: 50, trajectory: 'none' },
        'Description 1',
        []
      );

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const preset2 = createCustomCameraPreset(
        'Preset 2',
        { movementType: 'static', duration: 5, focalLength: 50, trajectory: 'none' },
        'Description 2',
        []
      );

      expect(preset1.id).not.toBe(preset2.id);
    });
  });

  describe('validateCameraPresetParameters', () => {
    it('should validate valid parameters', () => {
      const result = validateCameraPresetParameters({
        movementType: 'pan',
        duration: 5,
        focalLength: 35,
        trajectory: 'horizontal-left',
        speed: 50,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing movement type', () => {
      const result = validateCameraPresetParameters({
        duration: 5,
        focalLength: 35,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Movement type is required');
    });

    it('should reject invalid duration', () => {
      const result = validateCameraPresetParameters({
        movementType: 'pan',
        duration: 0,
        focalLength: 35,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duration must be greater than 0');
    });

    it('should reject invalid focal length', () => {
      const result1 = validateCameraPresetParameters({
        movementType: 'pan',
        duration: 5,
        focalLength: 5, // Too low
      });

      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('Focal length must be between 10mm and 200mm');

      const result2 = validateCameraPresetParameters({
        movementType: 'pan',
        duration: 5,
        focalLength: 250, // Too high
      });

      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Focal length must be between 10mm and 200mm');
    });

    it('should reject invalid speed', () => {
      const result1 = validateCameraPresetParameters({
        movementType: 'pan',
        duration: 5,
        focalLength: 35,
        speed: -10, // Negative
      });

      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('Speed must be between 0 and 100');

      const result2 = validateCameraPresetParameters({
        movementType: 'pan',
        duration: 5,
        focalLength: 35,
        speed: 150, // Too high
      });

      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain('Speed must be between 0 and 100');
    });

    it('should collect multiple errors', () => {
      const result = validateCameraPresetParameters({
        duration: -5,
        focalLength: 5,
        speed: 150,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Camera Preset Data Integrity', () => {
    it('should have all required metadata for each preset', () => {
      const presets = getAllCameraPresets();
      
      presets.forEach(preset => {
        expect(preset.metadata.cameraMetadata).toBeDefined();
        expect(preset.metadata.cameraMetadata.movementType).toBeDefined();
        expect(preset.metadata.cameraMetadata.duration).toBeGreaterThan(0);
        expect(preset.metadata.cameraMetadata.focalLength).toBeGreaterThan(0);
        expect(preset.metadata.cameraMetadata.trajectory).toBeDefined();
        expect(preset.metadata.cameraMetadata.recommendedUseCases).toBeDefined();
        expect(Array.isArray(preset.metadata.cameraMetadata.recommendedUseCases)).toBe(true);
      });
    });

    it('should have valid subcategories matching movement types', () => {
      const presets = getAllCameraPresets();
      
      presets.forEach(preset => {
        expect(preset.subcategory).toBe(preset.metadata.cameraMetadata.movementType);
      });
    });

    it('should have at least 2 presets per movement type', () => {
      const types = getCameraPresetTypes();
      
      types.forEach(typeInfo => {
        expect(typeInfo.count).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
