/**
 * Validation Schemas using Zod
 * 
 * Provides runtime validation for component props and data structures
 */

import { z } from 'zod';

// ============================================================================
// Basic Type Schemas
// ============================================================================

export const IdSchema = z.string().min(1, 'ID cannot be empty');
export const NameSchema = z.string().min(1, 'Name cannot be empty').max(255, 'Name too long');
export const DescriptionSchema = z.string().max(1000, 'Description too long').optional();

// ============================================================================
// Project Schemas
// ============================================================================

export const ProjectSchema = z.object({
  project_id: IdSchema,
  project_name: NameSchema,
  project_type: z.enum(['short_film', 'commercial', 'music_video', 'animation']),
  description: DescriptionSchema,
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;

// ============================================================================
// Character Schemas
// ============================================================================

export const CharacterSchema = z.object({
  character_id: IdSchema,
  name: NameSchema,
  description: DescriptionSchema,
  role: z.string().optional(),
  appearance: z.string().optional(),
  personality: z.string().optional(),
  creation_method: z.enum(['wizard', 'manual', 'import']).optional(),
  creation_timestamp: z.date().optional(),
  version: z.string().optional(),
});

export type Character = z.infer<typeof CharacterSchema>;

// ============================================================================
// World Schemas
// ============================================================================

export const WorldSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  description: DescriptionSchema,
  setting: z.string().optional(),
  atmosphere: z.string().optional(),
  rules: z.string().optional(),
});

export type World = z.infer<typeof WorldSchema>;

// ============================================================================
// Story Schemas
// ============================================================================

export const StorySchema = z.object({
  id: IdSchema,
  title: NameSchema,
  description: DescriptionSchema,
  genre: z.string().optional(),
  theme: z.string().optional(),
  plot_summary: z.string().optional(),
});

export type Story = z.infer<typeof StorySchema>;

// ============================================================================
// Shot Schemas
// ============================================================================

export const ShotSchema = z.object({
  id: IdSchema,
  name: NameSchema,
  description: DescriptionSchema,
  duration: z.number().positive().optional(),
  camera_angle: z.string().optional(),
  lighting: z.string().optional(),
});

export type Shot = z.infer<typeof ShotSchema>;

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates data against a schema and returns the result
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Object with success flag and either validated data or errors
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      (error as any).errors.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: 'Validation failed' } };
  }
}

/**
 * Validates data and throws an error if validation fails
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated data
 * @throws ZodError if validation fails
 */
export function validateDataOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safely validates data without throwing
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns The validated data or null if validation fails
 */
export function validateDataSafe<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
