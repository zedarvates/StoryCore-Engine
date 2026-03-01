import { useEffect, useMemo } from 'react';
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
    <div className="flex flex-col h-screen w-screen bg-gray-900 overflow-hidden">
      {/* Header with title */}
      <div className="flex-none flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="flex items-center gap-3">
          <img 
            src="/StorycoreIconeV2.png" 
            alt="Logo" 
            className="w-6 h-6 object-contain"
            onError={(e) => {
              // Fallback if image not found (public folder might not be served correctly in some contexts)
              (e.target as HTMLImageElement).style.display = 'none';
              const span = (e.target as HTMLImageElement).parentElement?.querySelector('span');
              if (span) span.style.display = 'block';
            }}
          />
          <span className="text-xl hidden" aria-hidden="true">🤖</span>
          <h1 className="text-base font-bold text-white tracking-tight">StoryCore Assistant</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {isElectron ? 'Fenêtre détachée' : 'Mode navigateur'}
          </span>
        </div>
      </div>

      {/* Chat component - full height remaining */}
      <div className="flex-1 overflow-hidden">
        <LandingChatBox
          height="100%"
          isDetached={true}
        />
      </div>
    </div>
  );
}

export default DetachedChatPage;