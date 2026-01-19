import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface ChatToggleButtonProps {
  className?: string;
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({ className = '' }) => {
  const { showChat, setShowChat, chatMessages } = useAppStore();

  // Count unread messages (messages since last time chat was opened)
  const unreadCount = 0; // In a real app, track this properly

  const handleToggle = () => {
    setShowChat(!showChat);
  };

  return (
    <button
      onClick={handleToggle}
      className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all duration-200 hover:scale-110 ${className}`}
      aria-label={showChat ? 'Close chat' : 'Open chat'}
      title={showChat ? 'Close chat' : 'Open chat assistant'}
    >
      {showChat ? (
        <X className="w-6 h-6" />
      ) : (
        <>
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};
