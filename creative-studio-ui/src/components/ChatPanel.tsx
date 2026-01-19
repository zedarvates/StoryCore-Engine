import React from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { ChatBox } from './ChatBox';

interface ChatPanelProps {
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ className = '' }) => {
  const { showChat, setShowChat } = useAppStore();

  if (!showChat) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => setShowChat(false)}
      />

      {/* Chat Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col ${className}`}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setShowChat(false)}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 md:hidden"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>

        <ChatBox className="flex-1" />
      </div>
    </>
  );
};
