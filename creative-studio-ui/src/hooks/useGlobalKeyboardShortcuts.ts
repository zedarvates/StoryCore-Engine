import _React, { useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { voiceTextService } from '@/services/VoiceTextService';
import { soundService } from '@/services/SoundService';

/**
 * Global Keyboard Shortcuts Hook
 * 
 * Provides global keyboard shortcuts for wizard access:
 * - Ctrl/Cmd + Shift + P: Open Sequence Plan Wizard
 * - Ctrl/Cmd + Shift + S: Open Shot Wizard
 * - Ctrl/Cmd + Shift + Q: Open Quick Shot Wizard
 * - Ctrl + Alt: Toggle Voice Activation (push-to-talk style)
 * 
 * Features:
 * - Visual toast feedback when shortcuts are triggered
 * - Ignores shortcuts when user is typing in input fields
 */
export function useGlobalKeyboardShortcuts() {
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);
  const openShotWizard = useAppStore((state) => state.openShotWizard);
  const setShowChat = useAppStore((state) => state.setShowChat);
  const showChat = useAppStore((state) => state.showChat);
  const { toast } = useToast();

  // Voice activation handler for Ctrl+Alt
  const handleVoiceActivation = useCallback(() => {
    const status = voiceTextService.getStatus();

    if (status.isListening) {
      // Stop listening if already active
      voiceTextService.stopListening();
      return;
    }

    // Check if speech recognition is available
    if (!voiceTextService.isSpeechRecognitionAvailable()) {
      toast({
        title: 'Reconnaissance vocale non disponible',
        description: 'Votre navigateur ne supporte pas la reconnaissance vocale.',
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }

    // Start voice recognition
    voiceTextService.startListening({
      onResult: (result) => {
        if (result.isFinal && result.transcript.trim()) {
          console.log('[GlobalShortcuts] Voice input:', result.transcript);
          
          // Play message-sent sound
          soundService.play('message-sent');
          
          // Open chat panel if not visible
          if (!showChat) {
            setShowChat(true);
          }

          // Dispatch custom event with voice input
          window.dispatchEvent(new CustomEvent('storycore:voice-input', {
            detail: {
              transcript: result.transcript,
              confidence: result.confidence,
              language: result.language
            }
          }));
        }
      },
      onError: (error) => {
        console.error('[GlobalShortcuts] Voice error:', error);
        const isRetrying = voiceTextService.isCurrentlyRetrying();
        toast({
          title: 'Erreur vocale',
          description: isRetrying 
            ? `${error} (nouvelle tentative...)`
            : typeof error === 'string' ? error : 'Erreur de reconnaissance',
          variant: 'destructive',
          duration: 3000,
        });
      },
      onStart: () => {
        soundService.play('mic-open');
        window.dispatchEvent(new CustomEvent('storycore:voice-state', {
          detail: { isListening: true }
        }));
        toast({
          title: '🎤 Écoute vocale',
          description: 'Parlez maintenant...',
          duration: 2000,
        });
      },
      onEnd: () => {
        soundService.play('mic-close');
        window.dispatchEvent(new CustomEvent('storycore:voice-state', {
          detail: { isListening: false }
        }));
      }
    });
  }, [showChat, setShowChat, toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl (Windows/Linux) or Cmd (Mac)
      const isModifierPressed = event.ctrlKey || event.metaKey;
      
      // Ignore if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + Shift + P: Open Sequence Plan Wizard
      if (isModifierPressed && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        openSequencePlanWizard({ mode: 'create', sourceLocation: 'editor' });
        
        // Visual feedback
        toast({
          title: 'Sequence Plan Wizard',
          description: 'Opening sequence plan wizard...',
          duration: 2000,
        });
        return;
      }

      // Ctrl/Cmd + Shift + S: Open Shot Wizard
      if (isModifierPressed && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        openShotWizard({ mode: 'create', sourceLocation: 'storyboard' });
        
        // Visual feedback
        toast({
          title: 'Shot Wizard',
          description: 'Opening shot wizard...',
          duration: 2000,
        });
        return;
      }

      // Ctrl/Cmd + Shift + Q: Open Quick Shot Wizard
      if (isModifierPressed && event.shiftKey && event.key === 'Q') {
        event.preventDefault();
        openShotWizard({ mode: 'create', quickMode: true, sourceLocation: 'storyboard' });
        
        // Visual feedback
        toast({
          title: 'Quick Shot Wizard',
          description: 'Opening quick shot wizard...',
          duration: 2000,
        });
        return;
      }

      // Ctrl + Alt: Toggle Voice Activation (push-to-talk style)
      if (event.ctrlKey && event.altKey && !event.repeat) {
        event.preventDefault();
        handleVoiceActivation();
        return;
      }

      // Ctrl + H or Ctrl + Shift + H: Return to Dashboard
      if (isModifierPressed && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('storycore:navigate-to-dashboard'));
        toast({
          title: 'Returning to Dashboard',
          description: 'Navigating to project dashboard...',
          duration: 2000,
        });
        return;
      }

      // Ctrl + W: Exit Project
      if (isModifierPressed && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('storycore:exit-project'));
        return;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openSequencePlanWizard, openShotWizard, setShowChat, showChat, toast, handleVoiceActivation]);
}
