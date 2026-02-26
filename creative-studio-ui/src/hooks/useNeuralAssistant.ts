
import { useEffect, useCallback } from 'react';
import { intentOrchestration, SystemContext } from '../services/ai/IntentOrchestrationService';
import { actionDispatcher } from '../services/ai/ActionDispatcher';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';
import { logger } from '@/utils/logger';

/**
 * useNeuralAssistant
 * 
 * Global hook that listens for voice or text inputs and routes them through 
 * the Neural Intent Orchestration Engine.
 */
export function useNeuralAssistant() {
  const { project } = useAppStore();
  const selectedShotId = useStore((state) => state.selectedShotId);
  
  const handleProcessInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    logger.info(`[NeuralAssistant] Processing input: "${text}"`);

    // Prepare context
    const context: SystemContext = {
      active_module: window.location.pathname.split('/').pop() || 'dashboard',
      project_open: !!project,
      unsaved_changes: false, // Should be managed by a global state
      selection_type: selectedShotId ? 'shot' : undefined,
    };

    // Run engine
    const response = await intentOrchestration.classifyIntent(text, context);
    
    // Dispatch actions
    await actionDispatcher.dispatch(response);

  }, [project, selectedShotId]);

  useEffect(() => {
    // Listen for voice input events (from useVoiceHotkey)
    const handleVoiceInput = (event: Event) => {
      const customEvent = event as CustomEvent<{ transcript: string }>;
      const { transcript } = customEvent.detail;
      handleProcessInput(transcript);
    };

    // Listen for manual chat input if needed
    const handleChatInput = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      const { message } = customEvent.detail;
      handleProcessInput(message);
    };

    window.addEventListener('storycore:voice-input', handleVoiceInput as EventListener);
    window.addEventListener('storycore:chat-input', handleChatInput as EventListener);

    return () => {
      window.removeEventListener('storycore:voice-input', handleVoiceInput as EventListener);
      window.removeEventListener('storycore:chat-input', handleChatInput as EventListener);
    };
  }, [handleProcessInput]);

  return {
    processInput: handleProcessInput
  };
}
