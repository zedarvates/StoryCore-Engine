/**
 * Alignment Repair Service
 * 
 * Translates narrative recommendations into actionable state changes.
 */

import { llmService } from './llmService';
import { logger } from '../utils/logger';
import { Project, Shot } from '@/types';

export interface RepairAction {
  type: 'updateShot' | 'addShot' | 'deleteShot' | 'updateProject';
  payload: Record<string, unknown>; 
}

export class AlignmentRepairService {
  /**
   * Translate a set of recommendations into state actions
   */
  async planRepairs(project: Project, shots: Shot[], recommendations: string[]): Promise<RepairAction[]> {
    if (!recommendations.length) return [];

    try {
      const shotContext = shots.map((s, i) => 
        `Shot ${i + 1} (${s.id}): ${s.name} - Prompt: ${s.prompt} - Lighting: ${s.cinematography?.lighting || 'default'}`
      ).join('\n');

      const prompt = `
        As a cinematic technician, translate these directorial recommendations into specific JSON actions to repair the project state.
        
        Project: ${project.project_name}
        
        Current Shots:
        ${shotContext}
        
        Recommendations to apply:
        ${recommendations.map(r => `- ${r}`).join('\n')}
        
        Return a JSON array of actions with the following format:
        [
          { 
            "type": "updateShot", 
            "payload": { "id": "shot-uuid", "updates": { "cinematography": { "lighting": "..." }, "prompt": "..." } } 
          },
          {
            "type": "addShot",
            "payload": { "newShot": { ... } }
          }
        ]
        
        Rules:
        - Only use 'updateShot', 'addShot', 'deleteShot'.
        - For 'updateShot', specify the 'id' and 'updates' object.
        - Ensure actions are technically precise and consistent across the sequence.
      `;

      const response = await llmService.generateText(prompt, {
        temperature: 0.1, // Highly deterministic
        maxTokens: 2000
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid Repair Action format');
      }

      const actions: RepairAction[] = JSON.parse(jsonMatch[0]);
      logger.info(`[AlignmentRepairService] Planned ${actions.length} repair actions`);
      
      return actions;
    } catch (error) {
      logger.error('[AlignmentRepairService] Repair planning failed:', error);
      return [];
    }
  }
}

export const alignmentRepairService = new AlignmentRepairService();
export default alignmentRepairService;
