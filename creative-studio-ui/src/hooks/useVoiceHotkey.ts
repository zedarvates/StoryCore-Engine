import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { voiceTextService, type VoiceHotkeyConfig } from '@/services/VoiceTextService';
import { soundService } from '@/services/SoundService';
import { useToast } from '@/hooks/use-toast';

/**
 * Voice Hotkey Hook
 * 
 * Provides voice activation via configurable keyboard shortcut
 * Supports: Ctrl (push-to-talk), Alt+Space, Shift+Space
 */
export function useVoiceHotkey() {
  const setShowChat = useAppStore((state) => state.setShowChat);
  const showChat = useAppStore((state) => state.showChat);
  const { toast } = useToast();

  const handleVoiceActivation = useCallback(() => {
    const settings = voiceTextService.getSettings();
    if (!settings.activationHotkey.enabled) return false;

    const status = voiceTextService.getStatus();
    if (status.isListening) {
      voiceTextService.stopListening();
      return true;
    }

    if (!voiceTextService.isSpeechRecognitionAvailable()) return false;

    return voiceTextService.startListening({
      onResult: (result) => {
        if (result.isFinal && result.transcript.trim()) {
          soundService.play('message-sent');
          if (!showChat) setShowChat(true);
          window.dispatchEvent(new CustomEvent('storycore:voice-input', {
            detail: { transcript: result.transcript }
          }));
        }
      },
      onError: (error) => {
        if (!voiceTextService.isCurrentlyRetrying()) {
          toast({
            title: 'Erreur vocale',
            description: typeof error === 'string' ? error : 'Erreur de reconnaissance',
            variant: 'destructive',
          });
        }
      },
      onStart: () => {
        soundService.play('mic-open');
        window.dispatchEvent(new CustomEvent('storycore:voice-state', { detail: { isListening: true } }));
      },
      onEnd: () => {
        soundService.play('mic-close');
        window.dispatchEvent(new CustomEvent('storycore:voice-state', { detail: { isListening: false } }));
      }
    });
  }, [showChat, setShowChat, toast]);

  useEffect(() => {
    // Track pressed modifier keys for push-to-talk mode
    let isModifierPressed = false;

    const getModifierKey = (): string => {
      const settings = voiceTextService.getSettings();
      return settings.activationHotkey.modifier;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = getModifierKey();
      
      // Skip if hotkey is disabled
      if (modifier === 'none') return;
      
      // Push-to-talk mode: Ctrl, Alt, or Shift held down
      if (modifier === 'ctrl' && event.key === 'Control' && !event.repeat && !isModifierPressed) {
        const listening = voiceTextService.getStatus().isListening;
        if (!listening) {
          isModifierPressed = true;
          handleVoiceActivation();
        }
      } else if (modifier === 'alt' && event.key === ' ' && event.altKey) {
        // Alt+Space toggle mode
        event.preventDefault();
        handleVoiceActivation();
      } else if (modifier === 'shift' && event.key === ' ' && event.shiftKey) {
        // Shift+Space toggle mode
        event.preventDefault();
        handleVoiceActivation();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const modifier = getModifierKey();
      
      // For push-to-talk mode, stop listening when modifier is released
      if (modifier === 'ctrl' && event.key === 'Control') {
        isModifierPressed = false;
        if (voiceTextService.getStatus().isListening) {
          voiceTextService.stopListening();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Listen for electron IPC events
    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI && window.electronAPI.on) {
      unsubscribe = window.electronAPI.on('voice:toggle', handleVoiceActivation);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (unsubscribe) unsubscribe();
    };
  }, [handleVoiceActivation]);

  return {
    activateVoice: handleVoiceActivation,
    stopVoice: () => voiceTextService.stopListening(),
    getSettings: () => voiceTextService.getSettings(),
    updateHotkey: (config: Partial<VoiceHotkeyConfig>) => {
      const settings = voiceTextService.getSettings();
      voiceTextService.saveSettings({
        activationHotkey: { ...settings.activationHotkey, ...config }
      });
    }
  };
}

export default useVoiceHotkey;