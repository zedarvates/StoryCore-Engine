import { eventEmitter, TranscriptPayload, AddonActionPayload } from './eventEmitter';
import { backendApiService } from './backendApiService';
import { notificationService } from './NotificationService';

export interface HermesVoiceResponse {
  feedback: string;
  action: string | null;
  params: Record<string, unknown> | null;
  question: string | null;
  wizard: string | null;
}

class HermesVoiceController {
  private currentProjectId: string | null = null;

  constructor() {
    this.listen();
  }

  public setProject(projectId: string) {
    this.currentProjectId = projectId;
  }

  private listen() {
    eventEmitter.on('addon:hermes:voice-command', async (data: TranscriptPayload) => {
      console.info('[HermesVoiceController] Commande reçue:', data);
      
      try {
        const response = await backendApiService.post<HermesVoiceResponse>('/api/hermes-voice/process', {
          transcript: data.transcript,
          project_id: this.currentProjectId
        });

        if (response) {
          this.handleResponse(response);
        }
      } catch (error) {
        console.error('[HermesVoiceController] Erreur processing:', error);
        notificationService.error('Erreur Hermès', 'Impossible de traiter la commande vocale.');
      }
    });
  }

  private handleResponse(response: HermesVoiceResponse) {
    // 1. Feedback vocal (notif pour l'instant)
    notificationService.info('Hermès', response.feedback);

    // 2. Trigger Wizard if requested
    if (response.wizard) {
      console.info(`[HermesVoiceController] Ouverture du wizard: ${response.wizard}`);
      eventEmitter.emit('ui:open-wizard', { 
        name: response.wizard,
        addonId: 'hermes-novelist',
        verb: 'view',
        timestamp: new Date(),
        source: 'HermesVoiceController'
      } as unknown as AddonActionPayload); 
    }

    // 3. Question proactive
    if (response.question) {
      // On pourrait ouvrir une boîte de dialogue ou simplement afficher en notif
      setTimeout(() => {
        notificationService.warning('Question de Hermès', response.question!);
      }, 2000);
    }

    // 4. Exécution de l'action si présente
    if (response.action) {
      console.info(`[HermesVoiceController] Exécution de l'action: ${response.action}`, response.params);
      
      // On émet l'action sur l'eventEmitter pour que les services concernés puissent réagir
      eventEmitter.emit(response.action, {
        ...response.params,
        timestamp: new Date(),
        source: 'HermesVoiceController'
      } as any);
    }
  }
}

export const hermesVoiceController = new HermesVoiceController();
