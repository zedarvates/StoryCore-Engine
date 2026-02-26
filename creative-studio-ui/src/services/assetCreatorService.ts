/**
 * Asset Creator Service
 * 
 * Handles the generation of specialized assets:
 * - 3D Pantins (dummies) with armatures
 * - 360° Skyboxes via ComfyUI
 * - 3D Box Scenes for layouts
 */

import { backendApi } from './backendApiService';
import type { Character } from '@/types/character';

export interface GenerationResult {
  success: boolean;
  filePath?: string;
  // Associated prompts
  prompts?: string[];

  // 3D/Visualization settings
  material_color?: [number, number, number]; // RGB 0.0-1.0
  script?: string;
  error?: string;
}

export class AssetCreatorService {
  /**
   * Generates a Blender script for a character pantin (3D dummy)
   */
  async generatePantin(character: Character): Promise<GenerationResult> {
    try {
      const response = await backendApi.invokeCliCommand('generate_pantin', {
        character_name: character.name,
        height: character.visual_identity?.height || 1.75,
        position: [0, 0, 0], // Default position
        color: character.material_color || [0.5, 0.5, 0.5]
      });

      if (response.success && response.data) {
        return {
          success: true,
          script: response.data.output,
          filePath: response.data.args?.output_path as string
        };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Generates a 360° Skybox image using ComfyUI
   */
  async generateSkybox(prompt: string, style: string = 'realistic'): Promise<GenerationResult> {
    try {
      const response = await backendApi.invokeCliCommand('generate_skybox', {
        prompt,
        style
      });

      if (response.success && response.data) {
        return {
          success: true,
          filePath: response.data.output // Path to the generated image
        };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Generates a simple 3D box scene layout
   */
  async generateBoxScene(type: 'room' | 'corridor', params: Record<string, unknown>): Promise<GenerationResult> {
    try {
      const response = await backendApi.invokeCliCommand('generate_box_scene', {
        scene_type: type,
        ...params
      });

      if (response.success && response.data) {
        return {
          success: true,
          script: response.data.output
        };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const assetCreatorService = new AssetCreatorService();
