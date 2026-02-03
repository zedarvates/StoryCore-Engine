import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface ChatToggleButtonProps {
  className?: string;
  dashboardContext?: string;
  position?: 'fixed' | 'relative' | 'absolute';
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({ className = '', dashboardContext, position }) => {
  const { showChat, setShowChat, chatMessages } = useAppStore();
  const [isHovered, setIsHovered] = React.useState(false);

  // Count unread messages (messages since last time chat was opened)
  const unreadCount = 0; // In a real app, track this properly

  const handleToggle = () => {
    setShowChat(!showChat);
  };

  // Apply dashboard-specific positioning logic
  const getPositionClasses = () => {
    switch (dashboardContext) {
      case 'project-dashboard':
        return 'relative inline-flex items-center justify-center w-8 h-8 ml-2';
      case 'editor':
        return 'fixed bottom-6 right-6';
      default:
        return position === 'relative' ? 'relative' : 'fixed bottom-6 right-6';
    }
  };

  const positionClasses = getPositionClasses();

  // Get visual state classes
  const getVisualStateClasses = () => {
    let stateClasses = 'bg-purple-600 hover:bg-purple-700 chat-toggle-btn';
    
    if (showChat) {
      stateClasses = 'bg-green-600 hover:bg-green-700 chat-toggle-btn';
    }
    
    if (unreadCount > 0) {
      stateClasses += ' chat-unread-indicator';
    }
    
    return stateClasses;
  };

  const visualStateClasses = getVisualStateClasses();

  return (
    <button
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center justify-center w-14 h-14 text-white rounded-full shadow-lg transition-all duration-200 ${visualStateClasses} ${positionClasses} ${className} z-50`}
      aria-label={showChat ? 'Close chat' : 'Open chat'}
      title={showChat ? 'Close chat assistant' : 'Open chat assistant'}
      data-state={showChat ? 'active' : 'inactive'}
    >
      {showChat ? (
        <X className="w-6 h-6 chat-toggle-icon" />
      ) : (
        <>
          <MessageSquare className="w-6 h-6 chat-toggle-icon" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold bg-red-500 rounded-full animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};
