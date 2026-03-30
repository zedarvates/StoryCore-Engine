/**
 * Bulk Production Service v2
 * 
 * Orchestrates parallel generation for full sequences with cross-shot coherence locking.
 * Use this service to generate N cinematic shots simultaneously while maintaining 
 * character and style consistency.
 * 
 * Task: 21.3 - Phase 2: Bulk Generation v2
 */

import { cineProductionAPI, type CineProductionJob, type CineProductionRequest } from './cineProductionAPI';
import { projectMemory } from './ProjectMemoryService';
import type { Project, Shot, Character } from '@/types';

export interface BulkProductionOptions {
  concurrency?: number; // Max parallel jobs
  coherenceLock?: boolean; // If true, share seed and character reference across all shots
  onShotComplete?: (shotId: string, job: CineProductionJob) => void;
  onShotError?: (shotId: string, error: Error) => void;
  onProgress?: (progress: number) => void;
}

export interface BulkProductionResult {
  successful: string[]; // Shot IDs
  failed: Array<{ shotId: string; error: string }>;
}

export class BulkProductionService {
  /**
   * Generates a full sequence in parallel with coherence locking
   */
  public async generateSequenceBulk(
    project: Project,
    shots: Shot[],
    characters: Character[],
    options: BulkProductionOptions = {}
  ): Promise<BulkProductionResult> {
    const { concurrency = 3, coherenceLock = true } = options;
    const results: BulkProductionResult = { successful: [], failed: [] };
    
    // 1. Prepare Coherence Lock
    let globalSeed = -1;
    let mainCharacter: Character | null = null;
    let persistentStyling = '';

    if (coherenceLock) {
      globalSeed = Math.floor(Math.random() * 1000000);
      mainCharacter = characters.length > 0 ? characters[0] : null;
      
      // Get relevant styling insights from memory
      try {
        const insights = await projectMemory.getRelevantInsights('cinematic visual style', 3);
        persistentStyling = insights.map(i => i.text).join(', ');
      } catch (e) {
        console.warn('[BulkProduction] Failed to get styling insights:', e);
      }
    }

    // 2. Prepare Queues
    const queue = [...shots];
    const activeJobs = new Set<Promise<void>>();
    let completedCount = 0;

    // 3. Orchestration Loop
    while (queue.length > 0 || activeJobs.size > 0) {
      // Fill active jobs up to concurrency
      while (queue.length > 0 && activeJobs.size < concurrency) {
        const shot = queue.shift()!;
        const jobPromise = this.processShot(shot, project, mainCharacter, globalSeed, persistentStyling, options)
          .then((job) => {
            results.successful.push(shot.id);
            options.onShotComplete?.(shot.id, job);
          })
          .catch((error) => {
            results.failed.push({ shotId: shot.id, error: error.message });
            options.onShotError?.(shot.id, error);
          })
          .finally(() => {
            activeJobs.delete(jobPromise);
            completedCount++;
            options.onProgress?.(Math.round((completedCount / shots.length) * 100));
          });
        
        activeJobs.add(jobPromise);
      }

      // Wait for at least one job to finish before adding more
      if (activeJobs.size > 0) {
        await Promise.race(activeJobs);
      }
    }

    return results;
  }

  /**
   * Process a single shot in the bulk context
   */
  private async processShot(
    shot: Shot,
    project: Project,
    mainCharacter: Character | null,
    globalSeed: number,
    persistentStyling: string,
    options: BulkProductionOptions
  ): Promise<CineProductionJob> {
    
    const request: CineProductionRequest = {
      projectId: project.id,
      sceneId: shot.id,
      chainType: 'generate_scene',
      sceneDescription: shot.prompt || `Cinematic shot: ${shot.name || 'Untitled'}`,
      style: `${shot.visualStyle?.styleName || 'Photorealistic Cinematic'}. ${persistentStyling}`,
      overrides: {
        ...(shot.parameters || {}),
        seed: globalSeed !== -1 ? globalSeed : (shot.parameters?.seed || -1),
        // Coherence Locking
        coherenceLock: {
          characterId: mainCharacter?.character_id,
          characterName: mainCharacter?.name,
          consistencyRef: mainCharacter?.visual_identity?.generated_portrait || project.metadata?.style_guide_url
        }
      }
    };

    // Start production
    const { jobId } = await cineProductionAPI.startProduction(request);
    
    // Monitor progress (individual progress ignored for bulk unless handled by caller)
    return cineProductionAPI.monitorJob(jobId);
  }
}

export const bulkProductionService = new BulkProductionService();
