/**
 * Alignment Service
 * 
 * Scores how well the current shots/sequence align with the intended script.
 */

import { llmService } from './llmService';
import { logger } from '../utils/logger';
import { Project, Shot, Story } from '@/types';
import { AlignmentReport } from '../sequence-editor/components/Alignment/AlignmentDashboard';

export class AlignmentService {
  /**
   * Generate an alignment report for the current project
   */
  async generateReport(project: Project, stories: Story[], shots: Shot[]): Promise<AlignmentReport> {
    if (!stories.length || !shots.length) {
      return this.getEmptyReport();
    }

    try {
      const scriptContent = stories[0].content;
      const shotSequence = shots.map((s, i) => 
        `Shot ${i + 1}: ${s.name || 'Untitled'} - Prompt: ${s.prompt}`
      ).join('\n');

      const prompt = `
        As a cinematic director, evaluate the alignment between this story script and the current shot sequence.
        
        Story Script:
        ${scriptContent}
        
        Shot Sequence:
        ${shotSequence}
        
        Provide a detailed alignment report in JSON format with the following structure:
        {
          "total_score": 0-100,
          "summary": "Brief summary of alignment",
          "categories": {
            "narrative_flow": { "score": 0-100, "issues": [], "recommendations": [] },
            "visual_consistency": { "score": 0-100, "issues": [], "recommendations": [] },
            "pacing": { "score": 0-100, "issues": [], "recommendations": [] },
            "emotional_resonance": { "score": 0-100, "issues": [], "recommendations": [] }
          },
          "recommendations": ["Priority recommendation 1", "..."]
        }
      `;

      const response = await llmService.generateText(prompt, {
        temperature: 0.2,
        maxTokens: 2000
      });

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const report: AlignmentReport = JSON.parse(jsonMatch[0]);
      logger.info(`[AlignmentService] Generated alignment report with score: ${report.total_score}`);
      
      return report;
    } catch (error) {
      logger.error('[AlignmentService] Alignment analysis failed:', error);
      return this.getErrorReport(error as Error);
    }
  }

  private getEmptyReport(): AlignmentReport {
    return {
      total_score: 0,
      summary: "No script or shots found to analyze.",
      categories: {
        "narrative_flow": { score: 0, issues: ["Missing data"] },
        "visual_consistency": { score: 0, issues: ["Missing data"] },
        "pacing": { score: 0, issues: ["Missing data"] }
      },
      recommendations: ["Add a story script", "Add shots to the timeline"]
    };
  }

  private getErrorReport(error: Error): AlignmentReport {
    return {
      total_score: 0,
      summary: `Analysis error: ${error.message}`,
      categories: {
        "system": { score: 0, issues: ["Service failure"] }
      },
      recommendations: ["Try again later", "Check network connection"]
    };
  }
}

export const alignmentService = new AlignmentService();
export default alignmentService;
