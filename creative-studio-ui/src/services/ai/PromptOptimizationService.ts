
import { ollamaClient } from '../llm/OllamaClient';
import { logger } from '@/utils/logger';

/**
 * PromptOptimizationService
 * 
 * Transforms simple user inputs into high-quality, structured prompts 
 * based on the OpenAI GDPval (General Dual-Process Value) methodology.
 */
export class PromptOptimizationService {
  private static readonly SYSTEM_PROMPT = `
You are the StoryCore "Prompt Booster" engine. Your role is to transform vague or short user prompts into "GDPval-style" professional task descriptions of high economic value, specifically for high-end cinematic production.

GDPval Methodology Principles:
1. PROFESSIONAL IDENTITY: Define a clear high-level Hollywood role (e.g., Director of Photography, VFX Supervisor, Costume Designer).
2. STRUCTURED CONTEXT: Add detailed background, lighting conditions, technical constraints, and mood.
3. CLEAR OBJECTIVE: Define the exact core task.
4. SPECIFIC DELIVERABLES: Specify the expected technical format (e.g., 4K, 24fps, EXR sequence, .cube LUT, MIDI file).

Transformation Rules:
- If user mentions "vidéo" or "image", assume a "Director of Photography" or "Cinematographer" role.
- If user mentions "look" or "couleurs", assume a "Senior Colorist" role.
- If user mentions "vaisseau", "monstre", or "FX", assume a "VFX Lead" role.
- If user mentions "vêtements", "tenue", or "style", assume a "Costume Designer" role.
- If user mentions "musique" or "ambiance sonore", assume a "Music Composer" or "Sound Designer" role.
- If user mentions "personnage" or "acteur", assume a "Casting Director" role.
- If user mentions "lieu" or "décor", assume a "Location Manager" or "Production Designer" role.
- Output ONLY the optimized prompt in French (unless the input is exclusively English), no conversational filler.

[EXAMPLES]
Input: "Fais une scène de forêt le matin"
Output: "En tant que Directeur de la Photographie, je souhaite capturer une séquence d'ouverture dans une forêt de pins. 
Contexte: Lumière rasante du matin filtrant à travers la brume (God rays). Teinte froide (5600K). Brume épaisse au sol.
Livrable attendu: Séquence vidéo 4K LOG, mouvement de steadycam fluide à travers les arbres, profondeur de champ courte."

Input: "Vêtements futuristes pour un soldat"
Output: "En tant que Créateur de Costumes, je dois concevoir une armure tactique modulaire pour une unité de forces spéciales en 2150.
Contexte: Tissus techniques respirants, plaques de protection en polymère mat, éclairage LED intégré pour l'identification. Usure visible au combat (salissures, impacts).
Livrable attendu: Concept art détaillé avec vues éclatées et spécifications des matériaux."

Input: "Thème triste au piano"
Output: "En tant que Compositeur Film, je dois composer le thème mélancolique du protagoniste après sa défaite.
Contexte: Mélodie simple au piano à queue avec une forte réverbération. Accompagnement discret de violoncelles gémissants. Rythme lent et rubato.
Livrable attendu: Fichier MIDI et rendu audio HQ (WAV 96kHz/24bit)."
`;

  /**
   * Optimize a prompt using the GDPval-inspired logic
   */
  public async balancePrompt(input: string): Promise<string> {
    if (!input || input.trim().length < 3) return input;

    try {
      logger.info('[PromptOptimization] Optimizing prompt...', { inputLength: input.length });
      
      const model = await ollamaClient.getBestAvailableModel('storytelling');
      
      const prompt = `
${PromptOptimizationService.SYSTEM_PROMPT}

[USER INPUT]
"${input}"

Optimized GDPval Prompt:`;

      const result = await ollamaClient.generate(model, prompt, {
        temperature: 0.7,
        maxTokens: 500
      });

      const cleanedResult = result.trim();
      
      // If result is too short or just repeats the input, fallback or log
      if (cleanedResult.length < input.length) {
        logger.warn('[PromptOptimization] Optimized prompt is shorter than input, check model response.');
      }

      return cleanedResult;
    } catch (error) {
      logger.error('[PromptOptimization] Failed to optimize prompt:', error);
      return input; // Fallback to original input
    }
  }

  /**
   * Suggests the best GDPval template based on source text
   * @param source The source text to analyze
   * @param availableTasks List of available tasks to choose from
   */
  public async suggestTemplate(source: string, availableTasks: { id: string, title: string, occupation: string }[]): Promise<string | null> {
    if (!source.trim()) return null;

    try {
      const taskList = availableTasks.map(t => `- ID: ${t.id} | Role: ${t.occupation} | Title: ${t.title}`).join('\n');
      
      const prompt = `
Analyze the following source text and choose the MOST RELEVANT professional role and task from the list below.
Return ONLY the ID of the chosen task.

[SOURCE TEXT]
${source}

[AVAILABLE TASKS]
${taskList}

Return the ID only.
`;

      const response = await ollamaClient.generate('gdpval-matcher', prompt, {
        temperature: 0.1 // Low temperature for precise matching
      });

      return response.trim();
    } catch (error) {
      console.error('Error in suggestTemplate:', error);
      return null;
    }
  }
}

export const promptOptimizer = new PromptOptimizationService();
