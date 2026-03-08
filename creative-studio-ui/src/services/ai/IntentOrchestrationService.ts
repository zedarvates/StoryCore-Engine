
import { ollamaClient } from '../llm/OllamaClient';
import { logger } from '@/utils/logger';

export type IntentName = 
  | 'CREATE_PROJECT' | 'OPEN_PROJECT' | 'SAVE_PROJECT' | 'SAVE_AS' | 'CLOSE_PROJECT' | 'EXPORT_PROJECT'
  | 'ADD_SCENE' | 'DELETE_SCENE' | 'DUPLICATE_SCENE' | 'RENAME_SCENE'
  | 'GENERATE_IMAGE' | 'GENERATE_VIDEO' | 'GENERATE_AUDIO' | 'MODIFY_GENERATION' | 'CREATE_MUSIC_VIDEO'
  | 'STABILIZE_CLIP' | 'REMOVE_BACKGROUND' | 'ADD_STICKER' | 'ADJUST_SPEED' | 'AUTO_LYRICS'
  | 'PLAY_TIMELINE' | 'STOP_TIMELINE' | 'ADD_CLIP' | 'REMOVE_CLIP' | 'MOVE_CLIP'
  | 'UNDO' | 'REDO' | 'OPEN_SETTINGS' | 'TOGGLE_AUTOSAVE' | 'SHOW_STATUS'
  | 'CONTEXT_ANALYSIS' | 'WORKFLOW_SUGGESTION' | 'BATCH_OPERATION' | 'PLUGIN_ACTION' | 'CAPTURE_SCREEN'
  | 'LIP_SYNC' | 'GENERATE_RECAP' | 'OPEN_MCP'
  | 'NONE';

export interface IntentResponse {
  intent: IntentName;
  confidence: number;
  entities: Record<string, unknown>;
  context_awareness: Record<string, unknown>;
  requires_confirmation: boolean;
  execution_priority: 'low' | 'medium' | 'high' | 'critical';
  feedback: string;
  suggestions?: string[];
}

export interface SystemContext {
  active_module: string;
  current_scene?: string;
  project_open: boolean;
  unsaved_changes: boolean;
  selection_type?: string;
}

/**
 * IntentOrchestrationService
 * 
 * deterministic engine for user intent classification and action orchestration.
 * Powered by LLM but constrained to strict JSON output and predefined intent catalog.
 */
export class IntentOrchestrationService {
  private static SYSTEM_PROMPT = `
  You are the StoryCore Intent engine. Your role is to transform user natural language into formal action structures.
  
  CATALOG OF INTENTS:
  - PROJECT: CREATE_PROJECT, OPEN_PROJECT, SAVE_PROJECT, SAVE_AS, CLOSE_PROJECT, EXPORT_PROJECT
  - SCENES: ADD_SCENE, DELETE_SCENE, DUPLICATE_SCENE, RENAME_SCENE
  - IA: GENERATE_IMAGE, GENERATE_VIDEO, GENERATE_AUDIO, MODIFY_GENERATION
  - TIMELINE: PLAY_TIMELINE, STOP_TIMELINE, ADD_CLIP, REMOVE_CLIP, MOVE_CLIP
  - SYSTEM: UNDO, REDO, OPEN_SETTINGS, TOGGLE_AUTOSAVE, SHOW_STATUS, CAPTURE_SCREEN
  - ADVANCED: CONTEXT_ANALYSIS, WORKFLOW_SUGGESTION, BATCH_OPERATION, PLUGIN_ACTION, LIP_SYNC, GENERATE_RECAP, OPEN_MCP

  RULES:
  1. Internal deterministic logic: No conversational filler.
  2. STRICT JSON output only.
  3. Extract entities: project_name, scene_name, style, duration, resolution, position, etc.
     - DEDUCTION: If "trailer", "teaser" or "bande-annonce" is mentioned, set duration to "short" or "90s".
     - DEDUCTION: If a future date (e.g. 2048, 2077) is mentioned in title/prompt, set style to "futuristic".
  4. If instruction is ambiguous and relates to improving work or asking what to do, use WORKFLOW_SUGGESTION with a 'suggestions' array.
  5. Security: Set requires_confirmation=true for destructive actions (DELETE, CLOSE with unsaved changes).
  6. Feedback: Short, professional, and concise in French. Mention deductions in feedback (e.g., "Projet futuriste détecté").
  7. If NO intent matches, return intent: "NONE".

  OUTPUT SCHEMA:
  {
    "intent": "INTENT_NAME",
    "confidence": 0.0-1.0,
    "entities": {},
    "context_awareness": {},
    "requires_confirmation": boolean,
    "execution_priority": "low|medium|high|critical",
    "feedback": "Concise feedback",
    "suggestions": [] (optional)
  }
  `;

  /**
   * Classify user intent and prepare action structure
   */
  public async classifyIntent(
    input: string, 
    context: SystemContext
  ): Promise<IntentResponse> {
    try {
      const model = await ollamaClient.getBestAvailableModel('quick');
      
      const fullPrompt = `
      ${IntentOrchestrationService.SYSTEM_PROMPT}

      [CURRENT SYSTEM CONTEXT]
      ${JSON.stringify(context, null, 2)}

      [USER INPUT]
      "${input}"

      Response (JSON only):`;

      const response = await ollamaClient.generate(model, fullPrompt, {
        temperature: 0.1, // High determinism
        maxTokens: 500
      });

      // Extract JSON from response (in case LLM adds markdown blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
         throw new Error("Invalid response format from LLM");
      }

      const parsed: IntentResponse = JSON.parse(jsonMatch[0]);
      
      // Safety layer: Force confirmation for destructive actions if LLM forgot
      if (['DELETE_SCENE', 'CLOSE_PROJECT'].includes(parsed.intent)) {
        parsed.requires_confirmation = true;
      }
      
      if (parsed.intent === 'CLOSE_PROJECT' && context.unsaved_changes) {
        parsed.requires_confirmation = true;
        parsed.feedback = "Changements non sauvegardés. Confirmer la fermeture ?";
      }

      return parsed;

    } catch (error) {
      logger.error('[IntentOrchestration] Classification failed:', error);
      return {
        intent: 'NONE',
        confidence: 0,
        entities: {},
        context_awareness: {},
        requires_confirmation: false,
        execution_priority: 'low',
        feedback: "Erreur de traitement de l'intention."
      };
    }
  }
}

export const intentOrchestration = new IntentOrchestrationService();
