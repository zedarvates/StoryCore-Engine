/**
 * Tests for Lighting Rig Service
 */

import { describe, it, expect } from 'vitest';
import {
  lightingRigService,
  LightingRig,
  LightingRigParameters
} from '../lightingRigService';

describe('LightingRigService', () => {
  describe('getAllRigs', () => {
    it('should return all lighting rig presets', () => {
      const rigs = lightingRigService.getAllRigs();
      
      expect(rigs).toBeDefined();
      expect(Array.isArray(rigs)).toBe(true);
      expect(rigs.length).toBeGreaterThan(0);
    });

    it('should return rigs with required properties', () => {
      const rigs = lightingRigService.getAllRigs();
      
      rigs.forEach(rig => {
        expect(rig).toHaveProperty('id');
        expect(rig).toHaveProperty('name');
        expect(rig).toHaveProperty('mood');
        expect(rig).toHaveProperty('description');
        expect(rig).toHaveProperty('metadata');
        expect(rig).toHaveProperty('parameters');
      });
    });
  });

  describe('getRigsByMood', () => {
    it('should return rigs filtered by dramatic mood', () => {
      const rigs = lightingRigService.getRigsByMood('dramatic');
      
      expect(rigs.length).toBeGreaterThan(0);
      rigs.forEach(rig => {
        expect(rig.mood).toBe('dramatic');
      });
    });

    it('should return rigs filtered by soft mood', () => {
      const rigs = lightingRigService.getRigsByMood('soft');
      
      expect(rigs.length).toBeGreaterThan(0);
      rigs.forEach(rig => {
        expect(rig.mood).toBe('soft');
      });
    });

    it('should return rigs filtered by cinematic mood', () => {
      const rigs = lightingRigService.getRigsByMood('cinematic');
      
      expect(rigs.length).toBeGreaterThan(0);
      rigs.forEach(rig => {
        expect(rig.mood).toBe('cinematic');
      });
    });
  });

  describe('getRigById', () => {
    it('should return a specific rig by ID', () => {
      const allRigs = lightingRigService.getAllRigs();
      const firstRig = allRigs[0];
      
      const rig = lightingRigService.getRigById(firstRig.id);
      
      expect(rig).toBeDefined();
      expect(rig?.id).toBe(firstRig.id);
    });

    it('should return undefined for non-existent ID', () => {
      const rig = lightingRigService.getRigById('non-existent-id');
      
      expect(rig).toBeUndefined();
    });
  });

  describe('searchRigs', () => {
    it('should search rigs by name', () => {
      const rigs = lightingRigService.searchRigs('dramatic');
      
      expect(rigs.length).toBeGreaterThan(0);
      rigs.forEach(rig => {
        const matchesName = rig.name.toLowerCase().includes('dramatic');
        const matchesDescription = rig.description.toLowerCase().includes('dramatic');
        const matchesTags = rig.metadata.tags.some(tag => 
          tag.toLowerCase().includes('dramatic')
        );
        
        expect(matchesName || matchesDescription || matchesTags).toBe(true);
      });
    });

    it('should search rigs by tags', () => {
      const rigs = lightingRigService.searchRigs('soft');
      
      expect(rigs.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-matching query', () => {
      const rigs = lightingRigService.searchRigs('xyz123nonexistent');
      
      expect(rigs).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const lowerRigs = lightingRigService.searchRigs('dramatic');
      const upperRigs = lightingRigService.searchRigs('DRAMATIC');
      
      expect(lowerRigs.length).toBe(upperRigs.length);
    });
  });

  describe('getAvailableMoods', () => {
    it('should return all available moods', () => {
      const moods = lightingRigService.getAvailableMoods();
      
      expect(moods).toContain('dramatic');
      expect(moods).toContain('soft');
      expect(moods).toContain('natural');
      expect(moods).toContain('studio');
      expect(moods).toContain('cinematic');
      expect(moods).toContain('horror');
      expect(moods).toContain('romantic');
    });
  });

  describe('applyRigToShot', () => {
    it('should return a deep copy of rig parameters', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      
      expect(parameters).toBeDefined();
      expect(parameters).not.toBe(rig.parameters);
      expect(parameters.lights).not.toBe(rig.parameters.lights);
    });

    it('should preserve all parameter properties', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      
      expect(parameters.lights.length).toBe(rig.parameters.lights.length);
      expect(parameters.ambientLight).toEqual(rig.parameters.ambientLight);
      expect(parameters.shadows).toEqual(rig.parameters.shadows);
    });
  });

  describe('modifyLight', () => {
    it('should update light intensity', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      const lightId = parameters.lights[0].id;
      
      const updated = lightingRigService.modifyLight(
        parameters,
        lightId,
        { intensity: 75 }
      );
      
      const updatedLight = updated.lights.find(l => l.id === lightId);
      expect(updatedLight?.intensity).toBe(75);
    });

    it('should update light color', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      const lightId = parameters.lights[0].id;
      
      const updated = lightingRigService.modifyLight(
        parameters,
        lightId,
        { color: '#FF0000' }
      );
      
      const updatedLight = updated.lights.find(l => l.id === lightId);
      expect(updatedLight?.color).toBe('#FF0000');
    });

    it('should not modify original parameters', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      const originalIntensity = parameters.lights[0].intensity;
      const lightId = parameters.lights[0].id;
      
      lightingRigService.modifyLight(
        parameters,
        lightId,
        { intensity: 50 }
      );
      
      expect(parameters.lights[0].intensity).toBe(originalIntensity);
    });
  });

  describe('adjustAmbientLight', () => {
    it('should update ambient light intensity', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      
      const updated = lightingRigService.adjustAmbientLight(
        parameters,
        { intensity: 60 }
      );
      
      expect(updated.ambientLight.intensity).toBe(60);
    });

    it('should update ambient light color', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      
      const updated = lightingRigService.adjustAmbientLight(
        parameters,
        { color: '#00FF00' }
      );
      
      expect(updated.ambientLight.color).toBe('#00FF00');
    });
  });

  describe('adjustShadows', () => {
    it('should update shadow intensity', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      
      const updated = lightingRigService.adjustShadows(
        parameters,
        { intensity: 80 }
      );
      
      expect(updated.shadows.intensity).toBe(80);
    });

    it('should update shadow softness', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      
      const updated = lightingRigService.adjustShadows(
        parameters,
        { softness: 45 }
      );
      
      expect(updated.shadows.softness).toBe(45);
    });

    it('should toggle shadow enabled state', () => {
      const rigs = lightingRigService.getAllRigs();
      const rig = rigs[0];
      const parameters = lightingRigService.applyRigToShot(rig, 'shot-1');
      
      const updated = lightingRigService.adjustShadows(
        parameters,
        { enabled: false }
      );
      
      expect(updated.shadows.enabled).toBe(false);
    });
  });

  describe('createCustomRig', () => {
    it('should create a custom lighting rig', () => {
      const rigs = lightingRigService.getAllRigs();
      const baseRig = rigs[0];
      
      const customRig = lightingRigService.createCustomRig(
        'My Custom Rig',
        'dramatic',
        'A custom lighting setup',
        baseRig.parameters
      );
      
      expect(customRig.name).toBe('My Custom Rig');
      expect(customRig.mood).toBe('dramatic');
      expect(customRig.description).toBe('A custom lighting setup');
      expect(customRig.id).toContain('custom-');
    });

    it('should calculate metadata from parameters', () => {
      const rigs = lightingRigService.getAllRigs();
      const baseRig = rigs[0];
      
      const customRig = lightingRigService.createCustomRig(
        'My Custom Rig',
        'dramatic',
        'A custom lighting setup',
        baseRig.parameters
      );
      
      expect(customRig.metadata.lightCount).toBe(baseRig.parameters.lights.length);
      expect(customRig.metadata.intensityRange).toBeDefined();
      expect(customRig.metadata.colorTemperature).toBeGreaterThan(0);
    });
  });
});
