/**
 * B-Roll Orchestration Service
 * 
 * Suggests and generates complementary footage based on narrative alignment.
 */

import { llmService } from './llmService';
import { Project, Shot } from '@/types';
import { logger } from '../utils/logger';

export interface BRollSuggestion {
  shotIndex: number;
  description: string;
  reason: string;
  visualStyle: string;
}

export class BRollService {
  /**
   * Identifies gaps in the sequence where B-roll would enhance the narrative flow.
   */
  async suggestBRoll(project: Project, shots: Shot[]): Promise<BRollSuggestion[]> {
    try {
      const sequenceContext = shots.map((s, i) => 
        `Shot ${i + 1}: ${s.name} - ${s.prompt}`
      ).join('\n');

      const prompt = `
        Analyze this cinematic sequence and suggest 3 high-impact B-roll shots to insert.
        These shots should provide texture, atmospheric detail, or character reactions that bridge narrative gaps.
        
        Project: ${project.project_name}
        Sequence:
        ${sequenceContext}
        
        Return a JSON array of suggestions:
        [
          { 
            "shotIndex": number (where to insert, 0-based), 
            "description": "highly descriptive visual prompt", 
            "reason": "why this helps the flow", 
            "visualStyle": "Action/Noir/etc" 
          }
        ]
      `;

      const response = await llmService.generateText(prompt, { temperature: 0.7 });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) return [];
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('[BRollService] Suggestion failed:', error);
      return [];
    }
  }
}

export const bRollService = new BRollService();
export default bRollService;
