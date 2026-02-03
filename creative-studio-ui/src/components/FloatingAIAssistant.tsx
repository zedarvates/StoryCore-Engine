import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { ChatPanel } from './ChatPanel';
import { loadChatPanelState, updateChatPanelOpenState } from '@/utils/chatPanelStorage';

export const FloatingAIAssistant: React.FC = () => {
  const { 
    showChat, 
    setShowChat,
    setChatPanelPosition,
    setChatPanelSize,
    setChatPanelMinimized
  } = useAppStore();
  
  // Load saved state on mount
  useEffect(() => {
    const savedState = loadChatPanelState();
    if (savedState) {
      setChatPanelPosition(savedState.position);
      setChatPanelSize(savedState.size);
      setChatPanelMinimized(savedState.isMinimized);
      // Optionally restore the open state
      // setShowChat(savedState.isOpen);
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
        
        // If window is off-screen, reposition it
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
  
  // Always render ChatPanel, but it will hide itself when showChat is false
  return <ChatPanel />;
};
