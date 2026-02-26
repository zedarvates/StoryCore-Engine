import React, { useEffect, useMemo } from 'react';
import { LandingChatBox } from '@/components/launcher/LandingChatBox';

/**
 * Detached Chat Page
 * This page is loaded in a separate Electron window
 * allowing the chat to be moved outside the main application window
 */
export function DetachedChatPage() {
  // Check if running in Electron - use useMemo instead of useState for static value
  const isElectron = useMemo(() => {
    return typeof window !== 'undefined' && !!window.electronAPI;
  }, []);

  // Sync state with main window when running in Electron
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.chatWindow) return;

    // Listen for state updates from main window
    const unsubscribe = window.electronAPI.chatWindow.onStateUpdate((state) => {
      console.log('[DetachedChat] Received state update:', state);
    });

    return () => {
      unsubscribe();
    };
  }, [isElectron]);

  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden">
      {/* Header with title */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h1 className="text-lg font-semibold text-white">StoryCore Assistant</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {isElectron ? 'Fenêtre détachée' : 'Mode navigateur'}
          </span>
        </div>
      </div>

      {/* Chat component - full height minus header */}
      <div className="h-[calc(100vh-48px)]">
        <LandingChatBox
          height={window.innerHeight - 48}
          context="landing"
          isDetached={true}
        />
      </div>
    </div>
  );
}

export default DetachedChatPage;