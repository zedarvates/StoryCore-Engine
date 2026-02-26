import { useEffect, useCallback } from 'react';
import { eventEmitter, CinematicActionPayload, EventPayload } from '@/services/eventEmitter';
import { ADDON_EVENTS } from '@/services/AddonVoiceCommandRouter';

export interface UseCinematicVoiceCommandsOptions {
  onTabChange?: (tab: string) => void;
  onSelectShot?: (index: number) => void;
  onSetMood?: (mood: string) => void;
  onSetCamera?: (camera: string) => void;
  onPlayback?: (action: 'play' | 'pause') => void;
}

/**
 * useCinematicVoiceCommands
 */
export function useCinematicVoiceCommands(options: UseCinematicVoiceCommandsOptions) {
  const { onTabChange, onSelectShot, onSetMood, onSetCamera, onPlayback } = options;

  const handleTab = useCallback((payload: EventPayload) => {
    const cp = payload as CinematicActionPayload;
    if (onTabChange && cp.tab) {
      onTabChange(cp.tab);
    }
  }, [onTabChange]);

  const handleSelectShot = useCallback((payload: EventPayload) => {
    const cp = payload as CinematicActionPayload;
    if (onSelectShot && cp.shotIndex !== undefined) {
      onSelectShot(cp.shotIndex);
    }
  }, [onSelectShot]);

  const handleMood = useCallback((payload: EventPayload) => {
    const cp = payload as CinematicActionPayload;
    if (onSetMood && cp.mood) {
      onSetMood(cp.mood);
    }
  }, [onSetMood]);

  const handleCamera = useCallback((payload: EventPayload) => {
    const cp = payload as CinematicActionPayload;
    if (onSetCamera && cp.camera) {
      onSetCamera(cp.camera);
    }
  }, [onSetCamera]);

  const handlePlayback = useCallback((payload: EventPayload) => {
    const cp = payload as CinematicActionPayload;
    if (onPlayback && cp.action) {
      onPlayback(cp.action);
    }
  }, [onPlayback]);

  useEffect(() => {
    const subTab = eventEmitter.on(ADDON_EVENTS.CINEMATIC_TAB, handleTab);
    const subShot = eventEmitter.on(ADDON_EVENTS.CINEMATIC_SELECT_SHOT, handleSelectShot);
    const subMood = eventEmitter.on(ADDON_EVENTS.CINEMATIC_SET_MOOD, handleMood);
    const subCam = eventEmitter.on(ADDON_EVENTS.CINEMATIC_SET_CAMERA, handleCamera);
    const subPlay = eventEmitter.on(ADDON_EVENTS.CINEMATIC_PLAYBACK, handlePlayback);

    return () => {
      subTab.unsubscribe();
      subShot.unsubscribe();
      subMood.unsubscribe();
      subCam.unsubscribe();
      subPlay.unsubscribe();
    };
  }, [handleTab, handleSelectShot, handleMood, handleCamera, handlePlayback]);
}
