import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useGenerationStore } from '@/stores/generationStore';
import { ChatPanel } from './ChatPanel';
import { loadChatPanelState, updateChatPanelOpenState } from '@/utils/chatPanelStorage';
import { PipelineAwareLLM } from '@/services/llm/PipelineAwareLLM';

export const FloatingAIAssistant: React.FC = () => {
  const {
    showChat,
    setShowChat,
    setChatPanelPosition,
    setChatPanelSize,
    setChatPanelMinimized
  } = useAppStore();

  // Subscribe to pipeline state for notification badge
  const currentPipeline = useGenerationStore((state) => state.currentPipeline);

  // Compute notification badge from pipeline state
  const notificationBadge = useMemo(() => {
    return PipelineAwareLLM.getNotificationBadge();
  }, [currentPipeline]);

  // Tooltip summary
  const tooltipText = useMemo(() => {
    const suggestions = PipelineAwareLLM.getContextualSuggestions();
    if (suggestions.length === 0) return 'Assistant StoryCore (Ctrl+K)';
    const firstSuggestion = suggestions[0];
    return `${firstSuggestion.title} — Ctrl+K pour ouvrir`;
  }, [currentPipeline]);

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadChatPanelState();
    if (savedState) {
      setChatPanelPosition(savedState.position);
      setChatPanelSize(savedState.size);
      setChatPanelMinimized(savedState.isMinimized);
    }
  }, [setChatPanelPosition, setChatPanelSize, setChatPanelMinimized]);

  // Save open state when it changes
  useEffect(() => {
    updateChatPanelOpenState(showChat);
  }, [showChat]);

  // Keyboard shortcut: Ctrl+K / Cmd+K to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowChat(!showChat);
      }

      // Escape to close
      if (e.key === 'Escape' && showChat) {
        setShowChat(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showChat, setShowChat]);

  // Handle window resize - reposition if off-screen
  useEffect(() => {
    const handleResize = () => {
      const savedState = loadChatPanelState();
      if (savedState) {
        const { position, size } = savedState;
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;

        if (position.x > maxX || position.y > maxY) {
          const newPosition = {
            x: Math.max(0, Math.min(position.x, maxX)),
            y: Math.max(0, Math.min(position.y, maxY)),
          };
          setChatPanelPosition(newPosition);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setChatPanelPosition]);

  // Notification badge colors
  const badgeColors: Record<string, string> = {
    error: '#ff4444',
    warning: '#ffaa00',
    info: '#4488ff',
    success: '#44cc44',
  };

  return (
    <>
      <ChatPanel />
      {/* Notification badge overlay — visible when chat is closed */}
      {!showChat && notificationBadge.count > 0 && (
        <div
          title={tooltipText}
          onClick={() => setShowChat(true)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            border: `2px solid ${badgeColors[notificationBadge.type]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10000,
            boxShadow: `0 4px 20px ${badgeColors[notificationBadge.type]}40`,
            transition: 'all 0.3s ease',
            fontSize: '20px',
          }}
        >
          🤖
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: badgeColors[notificationBadge.type],
              color: '#fff',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {notificationBadge.count}
          </span>
        </div>
      )}
    </>
  );
};
