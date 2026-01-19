/**
 * Type definitions for Sequence Plan data models used in Production Wizards
 */

import { z } from 'zod';
import type { ProductionShot } from './shot.js';

export interface SequencePlan {
  id: string;
  name: string;
  description: string;
  worldId: string;
  templateId?: string;

  // Technical specifications
  targetDuration: number; // seconds
  frameRate: number;
  resolution: {
    width: number;
    height: number;
  };

  // Narrative structure
  acts: Act[];
  scenes: Scene[];
  shots: ProductionShot[];

  // Metadata
  createdAt: number;
  modifiedAt: number;
  status: 'draft' | 'in-progress' | 'completed';
  tags: string[];
}

export interface Act {
  id: string;
  number: number;
  title: string;
  description: string;
  targetDuration: number;
  narrativePurpose: string;
  sceneIds: string[];
}

export interface Scene {
  id: string;
  actId: string;
  number: number;
  title: string;
  description: string;
  locationId: string; // Reference to World location
  characterIds: string[]; // References to Characters
  estimatedShotCount: number;
  shotIds: string[];
  beats: string[]; // Narrative beats/moments
  assetTemplates: string[]; // IDs of AssetTemplate
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const ActSchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  targetDuration: z.number().positive(),
  narrativePurpose: z.string(),
  sceneIds: z.array(z.string()),
});

export const SceneSchema = z.object({
  id: z.string(),
  actId: z.string(),
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  locationId: z.string(),
  characterIds: z.array(z.string()),
  estimatedShotCount: z.number().int().nonnegative(),
  shotIds: z.array(z.string()),
  beats: z.array(z.string()),
  assetTemplates: z.array(z.string()),
});

export const SequencePlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  worldId: z.string(),
  templateId: z.string().optional(),
  targetDuration: z.number().positive(),
  frameRate: z.number().positive(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  acts: z.array(ActSchema),
  scenes: z.array(SceneSchema),
  shots: z.array(z.any()), // Will be validated with Shot schema
  createdAt: z.number(),
  modifiedAt: z.number(),
  status: z.enum(['draft', 'in-progress', 'completed']),
  tags: z.array(z.string()),
});