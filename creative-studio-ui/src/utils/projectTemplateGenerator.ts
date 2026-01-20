/**
 * Project Template Generator
 * 
 * Generates default sequences and shots based on project format
 */

import type { Shot } from '@/types';
import type { SerializableProjectFormat } from '@/components/launcher/CreateProjectDialog';

// ============================================================================
// Types
// ============================================================================

export interface GeneratedSequence {
  id: string;
  name: string;
  description: string;
  duration: number;
  shots: Shot[];
  order: number;
}

export interface ProjectTemplate {
  sequences: GeneratedSequence[];
  totalShots: number;
  totalDuration: number;
}

// ============================================================================
// Generator Functions
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a default shot for a sequence
 */
function generateDefaultShot(
  sequenceId: string,
  sequenceNumber: number,
  shotNumber: number,
  duration: number
): Shot {
  return {
    id: generateId(),
    title: `Shot ${shotNumber}`,
    description: `Default shot ${shotNumber} for Sequence ${sequenceNumber}`,
    duration: duration,
    shot_type: 'medium',
    camera_movement: 'static',
    frame_path: '',
    sequence_id: sequenceId,
    order: shotNumber,
    metadata: {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'draft',
    },
  };
}

/**
 * Generate a sequence with default shot
 */
function generateSequence(
  sequenceNumber: number,
  shotDuration: number
): GeneratedSequence {
  const sequenceId = generateId();
  
  // Create one default shot per sequence
  const shot = generateDefaultShot(sequenceId, sequenceNumber, 1, shotDuration);
  
  return {
    id: sequenceId,
    name: `Sequence ${sequenceNumber}`,
    description: `Default sequence ${sequenceNumber}`,
    duration: shotDuration,
    shots: [shot],
    order: sequenceNumber,
  };
}

/**
 * Generate project template based on format
 */
export function generateProjectTemplate(format: SerializableProjectFormat): ProjectTemplate {
  const sequences: GeneratedSequence[] = [];
  let totalShots = 0;
  let totalDuration = 0;

  // Generate sequences based on format
  for (let i = 1; i <= format.sequences; i++) {
    const sequence = generateSequence(i, format.shotDuration);
    sequences.push(sequence);
    totalShots += sequence.shots.length;
    totalDuration += sequence.duration;
  }

  return {
    sequences,
    totalShots,
    totalDuration,
  };
}

/**
 * Convert generated sequences to flat shot array
 */
export function sequencesToShots(sequences: GeneratedSequence[]): Shot[] {
  const shots: Shot[] = [];
  
  sequences.forEach((sequence) => {
    sequence.shots.forEach((shot) => {
      shots.push(shot);
    });
  });
  
  return shots;
}

/**
 * Generate project structure summary
 */
export function getProjectSummary(template: ProjectTemplate): string {
  return `
Project Structure:
- ${template.sequences.length} sequences
- ${template.totalShots} shots
- ~${Math.round(template.totalDuration / 60)} minutes total duration

Sequences:
${template.sequences.map((seq, idx) => 
  `  ${idx + 1}. ${seq.name} (${seq.shots.length} shot, ${seq.duration}s)`
).join('\n')}
  `.trim();
}

// ============================================================================
// Export
// ============================================================================

export default {
  generateProjectTemplate,
  sequencesToShots,
  getProjectSummary,
};
