
import { IntentResponse } from './IntentOrchestrationService';
import { ADDON_EVENTS } from '../AddonVoiceCommandRouter';
import { 
  eventEmitter, 
  UIConfirmationPayload, 
  UISuggestionsPayload, 
  AddonActionPayload,
  SystemActionPayload
} from '@/services/eventEmitter';
import { useAppStore } from '@/stores/useAppStore';
import { notificationService } from '../NotificationService';
import { logger } from '@/utils/logger';

/**
 * ActionDispatcher
 * 
 * Responsible for executing the formal action structure produced by the IntentOrchestrationService.
 * Connects high-level intents to specific store actions and electronic events.
 */
export class ActionDispatcher {
  
  /**
   * Dispatch and execute an intent
   */
  public async dispatch(response: IntentResponse): Promise<void> {
    if (response.intent === 'NONE' || response.confidence < 0.4) {
      logger.info('[ActionDispatcher] Intent ignored (None or low confidence)');
      return;
    }

    logger.info(`[ActionDispatcher] Executing intent: ${response.intent}`, response.entities);

    // Context check for confirmation
    if (response.requires_confirmation) {
      // we emit a confirmation request event.
      eventEmitter.emit<UIConfirmationPayload>('ui:request-confirmation', {
        timestamp: new Date(),
        source: 'NeuralDispatcher',
        message: response.feedback,
        intent: response.intent,
        entities: response.entities
      });
      return;
    }

    // Execute based on intent
    switch (response.intent) {
      // --- PROJECT ---
      case 'SAVE_PROJECT':
        this.emitSystemEvent(ADDON_EVENTS.SYSTEM_SAVE, 'save');
        break;
      
      case 'UNDO':
        this.emitSystemEvent(ADDON_EVENTS.SYSTEM_UNDO, 'undo');
        break;
      
      case 'REDO':
        this.emitSystemEvent(ADDON_EVENTS.SYSTEM_REDO, 'redo');
        break;

      case 'OPEN_SETTINGS':
        useAppStore.getState().setShowGeneralSettings(true);
        break;

      // --- TIMELINE ---
      case 'PLAY_TIMELINE':
        this.emitSystemEvent(ADDON_EVENTS.CINEMATIC_PLAY, 'play');
        break;
      
      case 'STOP_TIMELINE':
        this.emitSystemEvent(ADDON_EVENTS.CINEMATIC_PAUSE, 'pause');
        break;

      // --- IA GENERATION ---
      case 'CREATE_MUSIC_VIDEO':
        notificationService.info('Assistant Clip', 'Ouverture de l\'assistant Music Visionary...');
        // Logic to open the wizard could be added here
        break;

      case 'STABILIZE_CLIP':
        notificationService.info('Edition IA', 'Stabilisation de la séquence en cours...');
        this.emitAddonEvent('video-stabilizer', 'process', response.feedback);
        break;

      case 'REMOVE_BACKGROUND':
        notificationService.info('Edition IA', 'Suppression de l\'arrière-plan...');
        this.emitAddonEvent('segment-anything', 'remove-bg', response.feedback);
        break;

      case 'ADJUST_SPEED':
        notificationService.info('Edition IA', 'Ajustement de la vitesse de lecture...');
        this.emitAddonEvent('video-speed-adjuster', 'adjust', response.feedback);
        break;

      case 'AUTO_LYRICS':
        notificationService.info('Assistant Paroles', 'Génération des paroles via IA...');
        this.emitAddonEvent('lyrics-generator', 'generate', response.feedback);
        break;

      case 'GENERATE_IMAGE':
        this.emitAddonEvent('grok-imagine', 'create', (response.entities.prompt as string) || response.feedback);
        break;

      case 'GENERATE_VIDEO':
        this.emitAddonEvent('seedance', 'create', (response.entities.prompt as string) || response.feedback);
        break;

      // --- SCENES ---
      case 'ADD_SCENE':
        // Implementation logic for adding scene via store
        notificationService.info('Action Système', 'Ajout d\'une nouvelle scène...');
        break;

      // --- ADVANCED ---
      case 'WORKFLOW_SUGGESTION':
        if (response.suggestions && response.suggestions.length > 0) {
           eventEmitter.emit<UISuggestionsPayload>('ui:show-suggestions', { 
             timestamp: new Date(),
             source: 'NeuralDispatcher',
             suggestions: response.suggestions 
           });
        }
        break;

      default:
        logger.warn(`[ActionDispatcher] Intent ${response.intent} not fully implemented in dispatcher.`);
        notificationService.warning('Action non supportée', `L'intention ${response.intent} n'est pas encore pilotable.`);
    }

    // Always show concise feedback
    if (response.feedback) {
      notificationService.success('Neural Command', response.feedback);
    }
  }

  private emitSystemEvent(eventName: string, action: 'undo' | 'redo' | 'save' | 'play' | 'pause') {
    // We emit complex payloads for system actions to satisfy both AddonRouter and internal listeners
    eventEmitter.emit<SystemActionPayload>(eventName, {
      timestamp: new Date(),
      source: 'NeuralDispatcher',
      action
    });
  }

  private emitAddonEvent(addonId: string, verb: string, prompt: string) {
    eventEmitter.emit<AddonActionPayload>(`addon:${addonId}:${verb}`, {
      timestamp: new Date(),
      source: 'NeuralDispatcher',
      addonId,
      verb,
      prompt
    });
  }
}

export const actionDispatcher = new ActionDispatcher();
