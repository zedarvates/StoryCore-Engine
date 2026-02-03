/**
 * StoryCore Service Tests
 * Requirements: 7.2
 */

import { describe, it, expect, vi } from 'vitest';
import {
  executeGenerationPipeline,
  parseProgressOutput,
  formatPipelineError,
  exportProjectToStorycore,
  validateProjectForGeneration,
  type ProjectData,
} from '../storycoreService';

describe('StoryCore Service', () => {
  const mockProjectData: ProjectData = {
    name: 'Test Project',
    shots: [
      {
        id: '1',
        prompt: 'A beautiful sunset',
        parameters: { seed: 42, denoising: 0.7 },
        referenceImages: ['/path/to/image.jpg'],
      },
    ],
    settings: {
      resolution: { width: 1920, height: 1080 },
      fps: 30,
      format: 'mp4',
    },
  };

  describe('executeGenerationPipeline', () => {
    it('should execute pipeline and report progress', async () => {
      const progressUpdates: any[] = [];
      
      const result = await executeGenerationPipeline(mockProjectData, (progress) => {
        progressUpdates.push(progress);
      });

      expect(result.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('grid');
    });

    it('should complete all pipeline stages', async () => {
      const stages = new Set<string>();
      
      await executeGenerationPipeline(mockProjectData, (progress) => {
        stages.add(progress.stage!);
      });

      expect(stages.has('grid')).toBe(true);
      expect(stages.has('promotion')).toBe(true);
      expect(stages.has('qa')).toBe(true);
      expect(stages.has('export')).toBe(true);
    });
  });

  describe('parseProgressOutput', () => {
    it('should parse grid stage progress', () => {
      const output = '[GRID] Generating master coherence sheet... 25%';
      const progress = parseProgressOutput(output);

      expect(progress).not.toBeNull();
      expect(progress?.stage).toBe('grid');
      expect(progress?.progress).toBe(25);
    });

    it('should parse promotion stage progress', () => {
      const output = '[PROMOTION] Processing panel 3/9... 33%';
      const progress = parseProgressOutput(output);

      expect(progress).not.toBeNull();
      expect(progress?.stage).toBe('promotion');
      expect(progress?.progress).toBe(33);
    });

    it('should parse QA stage progress', () => {
      const output = '[QA] Analyzing quality... 75%';
      const progress = parseProgressOutput(output);

      expect(progress).not.toBeNull();
      expect(progress?.stage).toBe('qa');
      expect(progress?.progress).toBe(75);
    });

    it('should parse export stage progress', () => {
      const output = '[EXPORT] Encoding video... 90%';
      const progress = parseProgressOutput(output);

      expect(progress).not.toBeNull();
      expect(progress?.stage).toBe('export');
      expect(progress?.progress).toBe(90);
    });

    it('should return null for invalid output', () => {
      const output = 'Some random output';
      const progress = parseProgressOutput(output);

      expect(progress).toBeNull();
    });
  });

  describe('formatPipelineError', () => {
    it('should format file not found error', () => {
      const error = 'FileNotFoundError: config.json not found';
      const formatted = formatPipelineError(error);

      expect(formatted).toContain('Required files are missing');
    });

    it('should format permission error', () => {
      const error = 'PermissionError: Access denied';
      const formatted = formatPipelineError(error);

      expect(formatted).toContain('Permission denied');
    });

    it('should format ComfyUI connection error', () => {
      const error = 'ComfyUI connection failed: timeout';
      const formatted = formatPipelineError(error);

      expect(formatted).toContain('Cannot connect to ComfyUI');
    });

    it('should format memory error', () => {
      const error = 'CUDA out of memory';
      const formatted = formatPipelineError(error);

      expect(formatted).toContain('GPU memory exhausted');
    });

    it('should return original error for unknown errors', () => {
      const error = 'Unknown error occurred';
      const formatted = formatPipelineError(error);

      expect(formatted).toContain('Unknown error occurred');
    });
  });

  describe('exportProjectToStorycore', () => {
    it('should export project in Data Contract v1 format', () => {
      const exported = exportProjectToStorycore(mockProjectData);
      const parsed = JSON.parse(exported);

      expect(parsed.schema_version).toBe('1.0');
      expect(parsed.project_name).toBe('Test Project');
      expect(parsed.capabilities).toBeDefined();
      expect(parsed.shots).toHaveLength(1);
      expect(parsed.settings).toBeDefined();
    });

    it('should include all required capabilities', () => {
      const exported = exportProjectToStorycore(mockProjectData);
      const parsed = JSON.parse(exported);

      expect(parsed.capabilities.grid_generation).toBe(true);
      expect(parsed.capabilities.promotion_engine).toBe(true);
      expect(parsed.capabilities.qa_engine).toBe(true);
      expect(parsed.capabilities.autofix_engine).toBe(true);
    });

    it('should convert shots correctly', () => {
      const exported = exportProjectToStorycore(mockProjectData);
      const parsed = JSON.parse(exported);

      expect(parsed.shots[0].id).toBe('1');
      expect(parsed.shots[0].prompt).toBe('A beautiful sunset');
      expect(parsed.shots[0].parameters.seed).toBe(42);
      expect(parsed.shots[0].reference_images).toHaveLength(1);
    });
  });

  describe('validateProjectForGeneration', () => {
    it('should validate valid project', () => {
      const validation = validateProjectForGeneration(mockProjectData);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject project without name', () => {
      const invalidProject = { ...mockProjectData, name: '' };
      const validation = validateProjectForGeneration(invalidProject);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Project name is required');
    });

    it('should reject project without shots', () => {
      const invalidProject = { ...mockProjectData, shots: [] };
      const validation = validateProjectForGeneration(invalidProject);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('At least one shot is required');
    });

    it('should reject shots without prompts', () => {
      const invalidProject = {
        ...mockProjectData,
        shots: [{ ...mockProjectData.shots[0], prompt: '' }],
      };
      const validation = validateProjectForGeneration(invalidProject);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('missing a prompt'))).toBe(true);
    });

    it('should reject invalid resolution', () => {
      const invalidProject = {
        ...mockProjectData,
        settings: { ...mockProjectData.settings, resolution: { width: 0, height: 0 } },
      };
      const validation = validateProjectForGeneration(invalidProject);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid resolution settings');
    });

    it('should reject invalid FPS', () => {
      const invalidProject = {
        ...mockProjectData,
        settings: { ...mockProjectData.settings, fps: 0 },
      };
      const validation = validateProjectForGeneration(invalidProject);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid FPS setting');
    });
  });
});
