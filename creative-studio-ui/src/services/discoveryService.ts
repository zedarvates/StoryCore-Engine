import axios from 'axios';
import { sequencePlanService } from './sequencePlanService';
import { Shot } from '@/types';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001') + '/api/llm';

export interface DiscoveryAnalysis {
  themes: string[];
  conflict: string;
  stakes: string;
  rough_structure: {
    act1: string;
    act2: string;
    act3: string;
  };
  raw_text: string;
}

export const discoveryService = {
  /**
   * Analyze raw story content using the Assistant Editor Discovery template
   */
  async analyzeContent(
    projectName: string, 
    projectGoal: string, 
    content: string
  ): Promise<string> {
    // 1. Render the template
    const renderResponse = await axios.post(`${API_BASE_URL}/render-template`, {
      template_name: 'assistant_editor_discovery',
      variables: {
        project_name: projectName,
        project_goal: projectGoal,
        content_to_analyze: content
      }
    });

    const renderedPrompt = renderResponse.data.rendered_prompt;

    // 2. Call the LLM with the rendered prompt
    const generateResponse = await axios.post(`${API_BASE_URL}/generate`, {
      prompt: renderedPrompt,
      max_tokens: 2048,
      temperature: 0.7
    });

    return generateResponse.data.text;
  },

  /**
   * Parse the LLM response into a structured object (heuristics based)
   */
  parseAnalysis(text: string): DiscoveryAnalysis {
    const themes: string[] = [];
    let conflict = "Non identifié";
    let stakes = "Non identifiés";
    const rough_structure = { act1: "", act2: "", act3: "" };

    // Simple regex or keyword search for themes
    const themeMatch = text.match(/THEME[S]? IDENTIFICATION:?\s*([\s\S]*?)(?=\n\d\.|\n[A-Z]|$)/i);
    if (themeMatch) {
      themeMatch[1].split('\n').forEach(line => {
        const cleaned = line.replace(/^\s*[-*•\d.]\s*/, '').trim();
        if (cleaned) themes.push(cleaned);
      });
    }

    const conflictMatch = text.match(/CONFLICT & FRICTION:?\s*([\s\S]*?)(?=\n\d\.|\n[A-Z]|$)/i);
    if (conflictMatch) conflict = conflictMatch[1].trim();

    const stakesMatch = text.match(/STORY STAKES:?\s*([\s\S]*?)(?=\n\d\.|\n[A-Z]|$)/i);
    if (stakesMatch) stakes = stakesMatch[1].trim();

    const act1Match = text.match(/ACT 1:?\s*([\s\S]*?)(?=\nACT 2|$)/i);
    const act2Match = text.match(/ACT 2:?\s*([\s\S]*?)(?=\nACT 3|$)/i);
    const act3Match = text.match(/ACT 3:?\s*([\s\S]*?)(?=$)/i);

    rough_structure.act1 = act1Match ? act1Match[1].trim() : "Acte 1 non défini";
    rough_structure.act2 = act2Match ? act2Match[1].trim() : "Acte 2 non défini";
    rough_structure.act3 = act3Match ? act3Match[1].trim() : "Acte 3 non défini";

    return {
      themes: themes.slice(0, 5),
      conflict,
      stakes,
      rough_structure,
      raw_text: text
    };
  },

  /**
   * Automate the creation of a sequence plan from the analysis result
   */
  async createSequenceFromAnalysis(projectName: string, analysis: DiscoveryAnalysis): Promise<void> {
    const planName = `Discovery: ${projectName}`;
    const description = `Narrative Structure generated from discovery analysis.\nConflict: ${analysis.conflict}`;

    // 1. Create the plan
    const plan = await sequencePlanService.createSequencePlan(planName, description);

    // 2. Create shots for each act
    const shots: Shot[] = [
      {
        id: `shot-${Date.now()}-1`,
        title: "Act I - The Hook",
        description: analysis.rough_structure.act1,
        prompt: `Act 1: ${analysis.rough_structure.act1.substring(0, 100)}...`,
        duration: 20,
        position: 0,
      },
      {
        id: `shot-${Date.now()}-2`,
        title: "Act II - The Conflict",
        description: analysis.rough_structure.act2,
        prompt: `Act 2: ${analysis.rough_structure.act2.substring(0, 100)}...`,
        duration: 30,
        position: 1,
      },
      {
        id: `shot-${Date.now()}-3`,
        title: "Act III - The Resolution",
        description: analysis.rough_structure.act3,
        prompt: `Act 3: ${analysis.rough_structure.act3.substring(0, 100)}...`,
        duration: 15,
        position: 2,
      }
    ];

    // 3. Add shots to the plan
    await sequencePlanService.updateSequencePlan(plan.id, { shots });
    console.log(`[DiscoveryService] Successfully created sequence plan: ${plan.id}`);
  }
};
