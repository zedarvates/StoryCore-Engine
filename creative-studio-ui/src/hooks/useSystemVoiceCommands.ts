import { useEffect, useCallback } from 'react';
import { eventEmitter, type EventPayload, type SystemNavigatePayload } from '@/services/eventEmitter';
import { ADDON_EVENTS } from '@/services/AddonVoiceCommandRouter';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { projectService } from '@/services/project/ProjectService';
import { ProjectData } from '@/types/project';

/**
 * useSystemVoiceCommands
 * =======================
 * Hook global pour écouter les commandes vocales système (undo, redo, save, navigate).
 *
 * S'assure que les actions déclenchées par la voix sont cohérentes avec l'état de l'application.
 */
export function useSystemVoiceCommands() {
  const { project, setShowLLMSettings, setShowGeneralSettings, setShowProjectTranslator, setShowVideoPublisher } = useAppStore();
  const { toast } = useToast();

  const handleUndo = useCallback(() => {
    console.log('[VoiceCommand] Undo');
    toast({
      title: 'Commande Vocale : Annuler',
      description: "L'action d'annulation n'est pas encore implémentée.",
    });
  }, [toast]);

  const handleRedo = useCallback(() => {
    console.log('[VoiceCommand] Redo');
    toast({
      title: 'Commande Vocale : Rétablir',
      description: "L'action de rétablissement n'est pas encore implémentée.",
    });
  }, [toast]);

  const handleSave = useCallback(async () => {
    console.log('[VoiceCommand] Save');
    if (project && project.path) {
      try {
        // Use the proper projectService to save to disk in Electron
        await projectService.saveProject(project.path, project as unknown as ProjectData);
        toast({
          title: 'Commande Vocale : Sauvegarder',
          description: `Projet "${project.project_name}" sauvegardé sur le disque.`,
        });
      } catch (err) {
        console.error('Save error:', err);
        toast({
          title: 'Erreur de Sauvegarde',
          description: 'Échec de la sauvegarde par commande vocale.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Erreur',
        description: 'Aucun projet actif ou chemin de projet manquant.',
        variant: 'destructive',
      });
    }
  }, [project, toast]);

  const handleNavigate = useCallback((payload: EventPayload) => {
    const navPayload = payload as SystemNavigatePayload;
    const target = (navPayload.target || '').toLowerCase();
    console.log('[VoiceCommand] Navigate to', target);

    if (target.includes('dashboard') || target.includes('accueil') || target.includes('landing')) {
      window.dispatchEvent(new CustomEvent('storycore:navigate-to-dashboard'));
    } else if (target.includes('paramètre') || target.includes('réglage') || target.includes('setting')) {
      setShowGeneralSettings(true);
    } else if (target.includes('ai') || target.includes('llm') || target.includes('intelligence')) {
      setShowLLMSettings(true);
    } else if (target.includes('traduct') || target.includes('translat')) {
      setShowProjectTranslator(true);
    } else if (target.includes('publish') || target.includes('publier') || target.includes('social') || target.includes('hub')) {
      setShowVideoPublisher(true);
    } else {
      toast({
        title: 'Navigation',
        description: `Navigation vers "${target}" non encore supportée par commande vocale.`,
      });
    }
  }, [setShowGeneralSettings, setShowLLMSettings, setShowProjectTranslator, setShowVideoPublisher, toast]);

  useEffect(() => {
    // Souscrire aux événements système émis par le VoiceCommandRouter
    const subUndo = eventEmitter.on(ADDON_EVENTS.SYSTEM_UNDO, handleUndo);
    const subRedo = eventEmitter.on(ADDON_EVENTS.SYSTEM_REDO, handleRedo);
    const subSave = eventEmitter.on(ADDON_EVENTS.SYSTEM_SAVE, handleSave);
    const subNav = eventEmitter.on(ADDON_EVENTS.SYSTEM_NAVIGATE, handleNavigate);
    
    // Listen for addon-specific navigate
    const subTranslatorNav = eventEmitter.on('addon:project-translator:navigate', () => {
      setShowProjectTranslator(true);
    });

    const subPublisherNav = eventEmitter.on('addon:video-publisher:navigate', () => {
      setShowVideoPublisher(true);
    });

    return () => {
      subUndo.unsubscribe();
      subRedo.unsubscribe();
      subSave.unsubscribe();
      subNav.unsubscribe();
      subTranslatorNav.unsubscribe();
      subPublisherNav.unsubscribe();
    };
  }, [handleUndo, handleRedo, handleSave, handleNavigate, setShowProjectTranslator, setShowVideoPublisher]);
}
