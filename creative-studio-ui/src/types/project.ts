/**
 * Project service type definitions for Data Contract v1 compliance
 */

import type { Shot } from './index';
import type { AssetMetadata } from './asset';
import type { Character } from './character';
import type { World } from './world';

export interface ProjectData {
  schema_version: string;
  project_name: string;
  capabilities: ProjectCapabilities;
  generation_status: GenerationStatus;
  storyboard: Shot[];
  assets: AssetMetadata[];
  characters: CharacterReference[];
  scenes: SceneReference[];
  world?: WorldDefinition;
}

export interface ProjectCapabilities {
  grid_generation: boolean;
  promotion_engine: boolean;
  qa_engine: boolean;
  autofix_engine: boolean;
  wizard_generation: boolean;
}

export interface GenerationStatus {
  grid: 'pending' | 'done' | 'failed' | 'passed';
  promotion: 'pending' | 'done' | 'failed' | 'passed';
  wizard: 'pending' | 'done' | 'failed' | 'passed';
}

export interface CharacterReference {
  id: string;
  name: string;
  reference_image_path: string;
  created_at: string;
}

export interface SceneReference {
  id: string;
  name: string;
  shot_ids: string[];
  created_at: string;
}

export interface WorldDefinition {
  id: string;
  name: string;
  setting: string;
  time_period: string;
  locations: Location[];
  rules: string[];
  lore: string;
  created_at: string;
  metadata: WorldMetadata;
}

export interface Location {
  name: string;
  description: string;
  visual_reference?: string;
}

export interface WorldMetadata {
  generation_prompt: string;
  used_in_wizards: string[];
}

export interface ShotInput {
  title: string;
  description: string;
  duration: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
