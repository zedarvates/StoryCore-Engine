import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ChatService, createChatService } from '@/services/chatService';
import type { ChatMessage } from '@/types';

/**
 * Custom hook for managing chat service with project context awareness
 */
export function useChatService() {
  const {
    project,
    shots,
    assets,
    selectedShotId,
    chatMessages,
    addChatMessage,
    addShot,
    updateShot,
    deleteShot,
  } = useAppStore();

  const chatServiceRef = useRef<ChatService | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize chat service
  useEffect(() => {
    if (!chatServiceRef.current) {
      chatServiceRef.current = createChatService({
        project,
        shots,
        assets,
        selectedShotId,
      });
    }
  }, []);

  // Update context when project state changes
  useEffect(() => {
    if (chatServiceRef.current) {
      chatServiceRef.current.updateContext({
        project,
        shots,
        assets,
        selectedShotId,
      });
    }
  }, [project, shots, assets, selectedShotId]);

  /**
   * Send a message and get AI response
   */
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || isProcessing || !chatServiceRef.current) return;

    setIsProcessing(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    addChatMessage(userMessage);
    chatServiceRef.current.addToHistory(userMessage);

    try {
      // Process message and get AI response
      const response = await chatServiceRef.current.processMessage(content);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
      };

      addChatMessage(assistantMessage);
      chatServiceRef.current.addToHistory(assistantMessage);

      // Execute actions
      if (response.actions) {
        response.actions.forEach((action) => {
          switch (action.type) {
            case 'addShot':
              addShot(action.payload);
              break;
            case 'updateShot':
              updateShot(action.payload.id, action.payload.updates);
              break;
            case 'deleteShot':
              deleteShot(action.payload.id);
              break;
            // Add more action handlers as needed
          }
        });
      }
    } catch (error) {
      console.error('Error processing chat message:', error);

      // Add error message
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };

      addChatMessage(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Get conversation history
   */
  const getHistory = (): ChatMessage[] => {
    return chatServiceRef.current?.getHistory() || [];
  };

  /**
   * Clear conversation history
   */
  const clearHistory = (): void => {
    chatServiceRef.current?.clearHistory();
  };

  return {
    sendMessage,
    isProcessing,
    messages: chatMessages,
    getHistory,
    clearHistory,
  };
}
