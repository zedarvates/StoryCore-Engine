import type { SequencePlan } from '../types';
import { logger } from './logger';

export interface SaveSequenceResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Sanitize folder/file names
 */
function sanitizeFolderName(name: string): string {
  return name
    .replace(/\s+/g, '_')
    // Corrected regex to avoid control character lint error
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .substring(0, 100);
}

/**
 * Saves a sequence to the project's sequences directory
 */
export async function saveSequenceToProject(
  projectPath: string,
  sequence: SequencePlan
): Promise<SaveSequenceResult> {
  try {
    if (!window.electronAPI?.fs) {
      return { success: false, error: 'Electron API not available' };
    }

    const sequencesDir = `${projectPath}/sequences`;
    // sanitizedName is used to ensure the directory name is safe if we were creating one per sequence
    // In this current implementation, we just use it for the filename if needed
    const fileName = `sequence_${sequence.id.substring(0, 8)}.json`;
    const filePath = `${sequencesDir}/${fileName}`;

    // Ensure directory exists
    if (window.electronAPI.fs.mkdir) {
      await window.electronAPI.fs.mkdir(sequencesDir, { recursive: true });
    }

    const jsonData = JSON.stringify(sequence, null, 2);
    await window.electronAPI.fs.writeFile(filePath, jsonData);

    return { success: true, filePath };
  } catch (error) {
    logger.error('[sequenceStorage] Failed to save sequence:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Loads all sequences from a project directory
 */
export async function listSequencesInProject(projectPath: string): Promise<SequencePlan[]> {
  try {
    if (!window.electronAPI?.fs) {
      return [];
    }

    const sequencesDir = `${projectPath}/sequences`;
    const exists = await window.electronAPI.fs.exists(sequencesDir);
    if (!exists) return [];

    const files = await window.electronAPI.fs.readdir(sequencesDir);
    const sequenceFiles = files.filter((f: string) => f.startsWith('sequence_') && f.endsWith('.json'));

    const sequences = await Promise.all(
      sequenceFiles.map(async (file: string) => {
        try {
          const content = await window.electronAPI.fs.readFile(`${sequencesDir}/${file}`);
          const data = JSON.parse(new TextDecoder().decode(content));
          return data as SequencePlan;
        } catch (err) {
          logger.warn(`[sequenceStorage] Failed to read sequence file ${file}:`, err);
          return null;
        }
      })
    );

    return (sequences.filter(s => s !== null) as SequencePlan[]).sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0));
  } catch (error) {
    logger.error('[sequenceStorage] Failed to list sequences:', error);
    return [];
  }
}

/**
 * Deletes a sequence file from the project
 */
export async function deleteSequenceFromProject(
  projectPath: string,
  sequenceId: string
): Promise<boolean> {
  try {
    if (!window.electronAPI?.fs) return false;

    const sequencesDir = `${projectPath}/sequences`;
    const fileName = `sequence_${sequenceId.substring(0, 8)}.json`;
    const filePath = `${sequencesDir}/${fileName}`;

    const exists = await window.electronAPI.fs.exists(filePath);
    if (exists) {
      await window.electronAPI.fs.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('[sequenceStorage] Failed to delete sequence:', error);
    return false;
  }
}
