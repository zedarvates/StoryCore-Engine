/**
 * Tests for PresetManagementService
 * 
 * Validates preset storage, retrieval, and management functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PresetManagementService,
  type PromptPreset,
  type ImagePreset,
  type VideoPreset,
  type AudioPreset,
} from '../PresetManagementService';

describe('PresetManagementService', () => {
  // Clear localStorage before and after each test
  beforeEach(() => {
    localStorage.clear();
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  describe('savePreset', () => {
    it('should save a prompt preset', () => {
      const preset = PresetManagementService.savePreset<PromptPreset>({
        name: 'Cinematic Preset',
        type: 'prompt',
        categories: {
          genre: 'cinematic',
          shotType: 'medium-shot',
          lighting: 'natural',
          sceneElements: [],
          mood: 'neutral',
        },
      });
      
      expect(preset.id).toBeDefined();
      expect(preset.name).toBe('Cinematic Preset');
      expect(preset.type).toBe('prompt');
      expect(preset.createdAt).toBeDefined();
      expect(preset.updatedAt).toBeDefined();
      expect(preset.categories.genre).toBe('cinematic');
    });
    
    it('should save an image preset', () => {
      const preset = PresetManagementService.savePreset<ImagePreset>({
        name: 'High Quality',
        type: 'image',
        params: {
          negativePrompt: 'blurry, low quality',
          width: 1024,
          height: 1024,
          steps: 30,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler_ancestral',
          scheduler: 'normal',
        },
      });
      
      expect(preset.id).toBeDefined();
      expect(preset.name).toBe('High Quality');
      expect(preset.type).toBe('image');
      expect(preset.params.steps).toBe(30);
    });
    
    it('should save a video preset', () => {
      const preset = PresetManagementService.savePreset<VideoPreset>({
        name: 'Short Video',
        type: 'video',
        params: {
          frameCount: 73,
          frameRate: 25,
          width: 768,
          height: 512,
          motionStrength: 0.8,
        },
      });
      
      expect(preset.id).toBeDefined();
      expect(preset.name).toBe('Short Video');
      expect(preset.type).toBe('video');
      expect(preset.params.frameCount).toBe(73);
    });
    
    it('should save an audio preset', () => {
      const preset = PresetManagementService.savePreset<AudioPreset>({
        name: 'Narrator Voice',
        type: 'audio',
        params: {
          voiceType: 'male',
          speed: 1.0,
          pitch: 0,
          language: 'en-US',
          emotion: 'neutral',
        },
      });
      
      expect(preset.id).toBeDefined();
      expect(preset.name).toBe('Narrator Voice');
      expect(preset.type).toBe('audio');
      expect(preset.params.voiceType).toBe('male');
    });
  });
  
  describe('getPresets', () => {
    it('should return empty array when no presets exist', () => {
      const presets = PresetManagementService.getPresets('image');
      expect(presets).toEqual([]);
    });
    
    it('should return all presets of a specific type', () => {
      // Save multiple presets
      PresetManagementService.savePreset<ImagePreset>({
        name: 'Preset 1',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      PresetManagementService.savePreset<ImagePreset>({
        name: 'Preset 2',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 512,
          height: 512,
          steps: 15,
          cfgScale: 7.0,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      const presets = PresetManagementService.getPresets<ImagePreset>('image');
      expect(presets).toHaveLength(2);
      expect(presets[0].name).toBe('Preset 1');
      expect(presets[1].name).toBe('Preset 2');
    });
    
    it('should not return presets of different types', () => {
      // Save presets of different types
      PresetManagementService.savePreset<ImagePreset>({
        name: 'Image Preset',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      PresetManagementService.savePreset<VideoPreset>({
        name: 'Video Preset',
        type: 'video',
        params: {
          frameCount: 121,
          frameRate: 25,
          width: 768,
          height: 512,
          motionStrength: 0.8,
        },
      });
      
      const imagePresets = PresetManagementService.getPresets<ImagePreset>('image');
      const videoPresets = PresetManagementService.getPresets<VideoPreset>('video');
      
      expect(imagePresets).toHaveLength(1);
      expect(videoPresets).toHaveLength(1);
      expect(imagePresets[0].name).toBe('Image Preset');
      expect(videoPresets[0].name).toBe('Video Preset');
    });
  });
  
  describe('getPresetById', () => {
    it('should return null for non-existent preset', () => {
      const preset = PresetManagementService.getPresetById('non-existent');
      expect(preset).toBeNull();
    });
    
    it('should return the correct preset by ID', () => {
      const saved = PresetManagementService.savePreset<ImagePreset>({
        name: 'Test Preset',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      const retrieved = PresetManagementService.getPresetById(saved.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(saved.id);
      expect(retrieved?.name).toBe('Test Preset');
    });
  });
  
  describe('updatePreset', () => {
    it('should update preset name', async () => {
      const preset = PresetManagementService.savePreset<ImagePreset>({
        name: 'Original Name',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updated = PresetManagementService.updatePreset(preset.id, {
        name: 'Updated Name',
      });
      
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(preset.updatedAt);
    });
    
    it('should update preset parameters', () => {
      const preset = PresetManagementService.savePreset<ImagePreset>({
        name: 'Test Preset',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      const updated = PresetManagementService.updatePreset<ImagePreset>(preset.id, {
        params: {
          ...preset.params,
          steps: 30,
          cfgScale: 8.0,
        },
      });
      
      expect(updated).toBeDefined();
      expect(updated?.params.steps).toBe(30);
      expect(updated?.params.cfgScale).toBe(8.0);
    });
    
    it('should return null for non-existent preset', () => {
      const updated = PresetManagementService.updatePreset('non-existent', {
        name: 'New Name',
      });
      
      expect(updated).toBeNull();
    });
  });
  
  describe('deletePreset', () => {
    it('should delete a preset', () => {
      const preset = PresetManagementService.savePreset<ImagePreset>({
        name: 'To Delete',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      const deleted = PresetManagementService.deletePreset(preset.id);
      expect(deleted).toBe(true);
      
      const retrieved = PresetManagementService.getPresetById(preset.id);
      expect(retrieved).toBeNull();
    });
    
    it('should return false for non-existent preset', () => {
      const deleted = PresetManagementService.deletePreset('non-existent');
      expect(deleted).toBe(false);
    });
  });
  
  describe('renamePreset', () => {
    it('should rename a preset', () => {
      const preset = PresetManagementService.savePreset<ImagePreset>({
        name: 'Original',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      const renamed = PresetManagementService.renamePreset(preset.id, 'Renamed');
      expect(renamed).toBeDefined();
      expect(renamed?.name).toBe('Renamed');
    });
  });
  
  describe('getAllPresets', () => {
    it('should return all presets across all types', () => {
      PresetManagementService.savePreset<ImagePreset>({
        name: 'Image',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      PresetManagementService.savePreset<VideoPreset>({
        name: 'Video',
        type: 'video',
        params: {
          frameCount: 121,
          frameRate: 25,
          width: 768,
          height: 512,
          motionStrength: 0.8,
        },
      });
      
      PresetManagementService.savePreset<AudioPreset>({
        name: 'Audio',
        type: 'audio',
        params: {
          voiceType: 'neutral',
          speed: 1.0,
          pitch: 0,
          language: 'en-US',
          emotion: 'neutral',
        },
      });
      
      const allPresets = PresetManagementService.getAllPresets();
      expect(allPresets).toHaveLength(3);
    });
  });
  
  describe('clearPresets', () => {
    it('should clear presets of a specific type', () => {
      PresetManagementService.savePreset<ImagePreset>({
        name: 'Image 1',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      PresetManagementService.savePreset<VideoPreset>({
        name: 'Video 1',
        type: 'video',
        params: {
          frameCount: 121,
          frameRate: 25,
          width: 768,
          height: 512,
          motionStrength: 0.8,
        },
      });
      
      PresetManagementService.clearPresets('image');
      
      const imagePresets = PresetManagementService.getPresets('image');
      const videoPresets = PresetManagementService.getPresets('video');
      
      expect(imagePresets).toHaveLength(0);
      expect(videoPresets).toHaveLength(1);
    });
  });
  
  describe('clearAllPresets', () => {
    it('should clear all presets', () => {
      PresetManagementService.savePreset<ImagePreset>({
        name: 'Image',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      PresetManagementService.savePreset<VideoPreset>({
        name: 'Video',
        type: 'video',
        params: {
          frameCount: 121,
          frameRate: 25,
          width: 768,
          height: 512,
          motionStrength: 0.8,
        },
      });
      
      PresetManagementService.clearAllPresets();
      
      const allPresets = PresetManagementService.getAllPresets();
      expect(allPresets).toHaveLength(0);
    });
  });
  
  describe('exportPresets', () => {
    it('should export presets to JSON', () => {
      PresetManagementService.savePreset<ImagePreset>({
        name: 'Test',
        type: 'image',
        params: {
          negativePrompt: '',
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 7.5,
          seed: -1,
          sampler: 'euler',
          scheduler: 'normal',
        },
      });
      
      const json = PresetManagementService.exportPresets('image');
      expect(json).toBeDefined();
      
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Test');
    });
  });
  
  describe('importPresets', () => {
    it('should import presets from JSON', () => {
      const presets = [
        {
          name: 'Imported',
          type: 'image',
          params: {
            negativePrompt: '',
            width: 1024,
            height: 1024,
            steps: 20,
            cfgScale: 7.5,
            seed: -1,
            sampler: 'euler',
            scheduler: 'normal',
          },
        },
      ];
      
      const json = JSON.stringify(presets);
      const result = PresetManagementService.importPresets(json);
      
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      
      const imported = PresetManagementService.getPresets('image');
      expect(imported).toHaveLength(1);
      expect(imported[0].name).toBe('Imported');
    });
    
    it('should handle invalid JSON', () => {
      expect(() => {
        PresetManagementService.importPresets('invalid json');
      }).toThrow('Invalid JSON format');
    });
  });
});
