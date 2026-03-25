import { useAppStore } from '@/stores/useAppStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useWorkflowStore } from '@/stores/workflowStore';
import { useSequencePlanStore } from '@/stores/sequencePlanStore';
import { aiCharacterService } from '../aiCharacterService';
import { AudioMood } from '../aiAudioEnhancementService';
import { logger } from '@/utils/logger';
import { Character, Gender } from '@/types/character';
import { CharacterArchetype, CharacterRole } from '@/types/ai-engines';

/**
 * Interface for plan metadata with scenes
 */
interface PlanMetadata {
  metadata?: {
    scenes?: Array<{
      characters?: string[];
    }>;
  };
}

/**
 * Interface for service profile
 */
interface ServiceProfile {
  id: string;
  name: string;
  appearance?: {
    hairColor?: string;
    hairStyle?: string;
    eyeColor?: string;
    skinTone?: string;
    distinctiveFeatures?: string[];
  };
  personality?: Record<string, unknown>;
  backstory?: string;
}

/**
 * ProjectOrchestrator
 * 
 * Central orchestration service for managing AI-driven project lifecycles.
 * Connects characters, stories, and technical plans.
 */
export class ProjectOrchestrator {
  private static instance: ProjectOrchestrator;

  private constructor() {}

  public static getInstance(): ProjectOrchestrator {
    if (!ProjectOrchestrator.instance) {
      ProjectOrchestrator.instance = new ProjectOrchestrator();
    }
    return ProjectOrchestrator.instance;
  }

  /**
   * Orchestrate: Ensures the project has the necessary characters based on the story plan.
   */
  public async syncCharactersToStory(): Promise<void> {
    const project = useAppStore.getState().project;
    const plan = useSequencePlanStore.getState().currentPlanData;

    if (!project || !plan) {
      logger.warn('[ProjectOrchestrator] Cannot sync: Project or Plan missing.');
      return;
    }

    logger.info(`[ProjectOrchestrator] Syncing characters for project: ${project.name}`);

    // 1. Identify missing characters in the plan
    const existingCharacters = useCharacterStore.getState().characters;
    const existingNames = new Set(existingCharacters.map(c => c.name.toLowerCase()));
    
    // Extract unique character IDs/Names from scenes in the plan
    const requiredCharacterNames = new Set<string>();
    const planMetadata = plan as PlanMetadata;
    planMetadata.metadata?.scenes?.forEach((scene) => {
      scene.characters?.forEach((charName: string) => requiredCharacterNames.add(charName));
    });

    const missingNames = Array.from(requiredCharacterNames).filter(name => !existingNames.has(name.toLowerCase()));

    if (missingNames.length === 0) {
      logger.info('[ProjectOrchestrator] All required characters already exist.');
      return;
    }

    logger.info(`[ProjectOrchestrator] Found ${missingNames.length} missing characters. Generating...`);

    // 2. Generate missing characters
    for (const name of missingNames) {
      try {
        // Use AICharacterService to generate a full profile
        const profile = await aiCharacterService.generateCharacter({
          archetype: CharacterArchetype.HERO,
          role: CharacterRole.SUPPORTING,
          appearanceConstraints: { distinctiveFeatures: [`Named: ${name}`] }
        });

        // Map to internal Character type and add to store
        const newCharacter = this.mapProfileToCharacter(profile);
        await useCharacterStore.getState().addCharacter(project.id, newCharacter);
        
        logger.info(`[ProjectOrchestrator] Successfully generated and added: ${name}`);
      } catch (error) {
        logger.error(`[ProjectOrchestrator] Failed to generate character ${name}:`, error);
      }
    }
  }

  /**
   * Sync Audio: Suggests and configures audio moods and enhancements based on project metadata.
   */
  public async syncAudioMood(): Promise<AudioMood> {
    const project = useAppStore.getState().project;
    if (!project) {
      logger.warn('[ProjectOrchestrator] Cannot sync audio: No project loaded.');
      return AudioMood.RELAXED;
    }

    const metadata = project.metadata as any;
    const genre = metadata?.genre?.toLowerCase() || 'neutral';
    let suggestedMood = AudioMood.RELAXED;

    // Logic to determine mood from genre
    if (genre.includes('horror') || genre.includes('thriller')) suggestedMood = AudioMood.TENSE;
    else if (genre.includes('action') || genre.includes('adventure')) suggestedMood = AudioMood.EPIC;
    else if (genre.includes('drama')) suggestedMood = AudioMood.SAD;
    else if (genre.includes('fantasy')) suggestedMood = AudioMood.MYSTERIOUS;
    else if (genre.includes('comedy')) suggestedMood = AudioMood.HAPPY;

    logger.info(`[ProjectOrchestrator] Suggested audio mood for genre "${genre}": ${suggestedMood}`);
    
    // Auto-configure audio enhancement profile for the project
    // This could be used by the Audio Wizard as a default starting point
    return suggestedMood;
  }

  /**
   * Helper to map Service Profile to Store Character type
   */
  private mapProfileToCharacter(profile: unknown): Character {
    const p = profile as Record<string, unknown>;
    const appearance = (p.appearance || {}) as Record<string, unknown>;
    const personality = (p.personality || {}) as Record<string, unknown>;
    const backstory = (p.backstory || {}) as Record<string, unknown>;

    return {
      character_id: String(p.id || ''),
      name: String(p.name || ''),
      creation_method: 'auto_generated',
      creation_timestamp: Date.now(),
      version: '1.0',
      visual_identity: {
        hair_color: String(appearance.hairColor || ''),
        hair_style: String(appearance.hairStyle || ''),
        hair_length: '',
        eye_color: String(appearance.eyeColor || ''),
        eye_shape: '',
        skin_tone: String(appearance.skinTone || ''),
        facial_structure: '',
        distinctive_features: Array.isArray(appearance.distinctiveFeatures) ? appearance.distinctiveFeatures : [],
        age_range: String(p.age || ''),
        gender: String(p.gender || 'unspecified').toLowerCase() as Gender,
        height: String(appearance.height || ''),
        build: String(appearance.build || ''),
        posture: '',
        clothing_style: String(appearance.clothingStyle || ''),
        color_palette: [],
        reference_images: [],
        reference_sheet_images: []
      },
      personality: {
        traits: personality.traits ? Object.keys(personality.traits as object) : [],
        values: Array.isArray(personality.coreBeliefs) ? personality.coreBeliefs : [],
        fears: Array.isArray(personality.fears) ? personality.fears : [],
        desires: Array.isArray(personality.motivations) ? personality.motivations : [],
        flaws: Array.isArray(personality.weaknesses) ? personality.weaknesses : [],
        strengths: Array.isArray(personality.strengths) ? personality.strengths : [],
        temperament: '',
        communication_style: Array.isArray(personality.speechPatterns) ? personality.speechPatterns[0] : '',
      },
      background: {
        origin: String(backstory.origin || ''),
        occupation: String(p.role || ''),
        education: '',
        family: '',
        significant_events: Array.isArray(backstory.keyEvents) ? backstory.keyEvents : [],
        current_situation: '',
        backstory: String(backstory.origin || '')
      },
      relationships: [],
      role: {
        archetype: String(p.archetype || ''),
        narrative_function: String(p.role || ''),
        character_arc: 'flat'
      }
    };
  }

  /**
   * Progress Update: Advances the workflow stage based on project completeness
   */
  public updateWorkflowIntegrity(): void {
    const workflow = useWorkflowStore.getState();
    const characters = useCharacterStore.getState().characters;
    const plan = useSequencePlanStore.getState().currentPlanData;

    if (characters.length > 0 && plan) {
      workflow.setStage('storytelling');
      logger.info('[ProjectOrchestrator] Workflow advanced to Storytelling stage.');
    }
  }
}

export const projectOrchestrator = ProjectOrchestrator.getInstance();
