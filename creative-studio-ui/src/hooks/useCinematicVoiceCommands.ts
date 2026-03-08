import { useEffect, useCallback } from 'react';
import { eventEmitter, CinematicActionPayload, EventPayload } from '@/services/eventEmitter';
import { ADDON_EVENTS } from '@/services/AddonVoiceCommandRouter';

export interface UseCinematicVoiceCommandsOptions {
  onTabChange?: (tab: string) => void;
  onSelectShot?: (index: number) => void;
  onSetMood?: (mood: string) => void;
  onSetCamera?: (camera: string) => void;
  onPlayback?: (action: 'play' | 'pause') => void;
  onSetPose?: (target: string, pose: string) => void;
  onRewind?: () => void;
  onGenerateStory?: () => void;
  onGenerateDialogues?: () => void;
  onGeneratePrompt?: () => void;
}

/**
 * useCinematicVoiceCommands
 */
export function useCinematicVoiceCommands(options: UseCinematicVoiceCommandsOptions) {
  const { 
    onTabChange, onSelectShot, onSetMood, onSetCamera, 
    onPlayback, onSetPose, onRewind, onGenerateStory, 
    onGenerateDialogues, onGeneratePrompt 
  } = options;

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

  const handlePose = useCallback((payload: EventPayload) => {
    const cp = payload as CinematicActionPayload;
    if (onSetPose && cp.target && cp.pose) {
      onSetPose(cp.target, cp.pose);
    }
  }, [onSetPose]);

  const handleRewind = useCallback(() => {
    if (onRewind) onRewind();
  }, [onRewind]);

  const handleGenerateStory = useCallback(() => {
    if (onGenerateStory) onGenerateStory();
  }, [onGenerateStory]);

  const handleGenerateDialogues = useCallback(() => {
    if (onGenerateDialogues) onGenerateDialogues();
  }, [onGenerateDialogues]);

  const handleGeneratePrompt = useCallback(() => {
    if (onGeneratePrompt) onGeneratePrompt();
  }, [onGeneratePrompt]);

  useEffect(() => {
    const subTab = eventEmitter.on(ADDON_EVENTS.CINEMATIC_SWITCH_TAB, handleTab);
    const subShot = eventEmitter.on(ADDON_EVENTS.CINEMATIC_SELECT_SHOT, handleSelectShot);
    const subMood = eventEmitter.on(ADDON_EVENTS.CINEMATIC_CHANGE_MOOD, handleMood);
    const subCamera = eventEmitter.on(ADDON_EVENTS.CINEMATIC_SET_CAMERA, handleCamera);
    
    // Create combined handlers for the actions that are split into multiple events
    const subPlay = eventEmitter.on(ADDON_EVENTS.CINEMATIC_PLAY, handlePlayback);
    const subPause = eventEmitter.on(ADDON_EVENTS.CINEMATIC_PAUSE, handlePlayback);
    const subStop = eventEmitter.on(ADDON_EVENTS.CINEMATIC_STOP, handlePlayback);
    const subPose = eventEmitter.on(ADDON_EVENTS.CINEMATIC_SET_POSE, handlePose);
    const subRewind = eventEmitter.on(ADDON_EVENTS.CINEMATIC_REWIND, handleRewind);
    const subStory = eventEmitter.on(ADDON_EVENTS.CINEMATIC_GENERATE_STORY, handleGenerateStory);
    const subDialogues = eventEmitter.on(ADDON_EVENTS.CINEMATIC_GENERATE_DIALOGUES, handleGenerateDialogues);
    const subPrompt = eventEmitter.on(ADDON_EVENTS.CINEMATIC_GENERATE_PROMPT, handleGeneratePrompt);

    return () => {
      subTab.unsubscribe();
      subShot.unsubscribe();
      subMood.unsubscribe();
      subCamera.unsubscribe();
      subPlay.unsubscribe();
      subPause.unsubscribe();
      subStop.unsubscribe();
      subPose.unsubscribe();
      subRewind.unsubscribe();
      subStory.unsubscribe();
      subDialogues.unsubscribe();
      subPrompt.unsubscribe();
    };
  }, [handleTab, handleSelectShot, handleMood, handleCamera, handlePlayback, handlePose, handleRewind, handleGenerateStory, handleGenerateDialogues, handleGeneratePrompt]);
}
