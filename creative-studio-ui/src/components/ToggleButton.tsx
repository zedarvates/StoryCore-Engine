import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface ToggleButtonProps {
  position?: 'bottom-left' | 'bottom-right' | 'bottom-center';
  className?: string;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({ 
  position = 'bottom-right',
  className = ''
}) => {
  const { showChat, setShowChat } = useAppStore();
  
  const positionClasses = {
    'bottom-left': 'left-6 bottom-6',
    'bottom-right': 'right-6 bottom-6',
    'bottom-center': 'left-1/2 -translate-x-1/2 bottom-6'
  };
  
  const handleToggle = () => {
    setShowChat(!showChat);
  };
  
  return (
    <button
      onClick={handleToggle}
      className={`
        fixed ${positionClasses[position]} z-40
        w-14 h-14 rounded-full
        bg-pink-500 hover:bg-pink-600 active:bg-pink-700
        shadow-lg hover:shadow-xl
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        focus:outline-none focus:ring-4 focus:ring-pink-300
        ${showChat ? 'ring-4 ring-pink-300 scale-105' : 'scale-100'}
        hover:scale-110
        ${className}
      `}
      aria-label={showChat ? 'Hide AI Assistant' : 'Show AI Assistant'}
      title={showChat ? 'Hide AI Assistant (Ctrl+K)' : 'Show AI Assistant (Ctrl+K)'}
      aria-pressed={showChat}
      role="button"
    >
      <div className={`
        transition-transform duration-200
        ${showChat ? 'rotate-90' : 'rotate-0'}
      `}>
        {showChat ? (
          <X className="w-6 h-6 text-white" aria-hidden="true" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" aria-hidden="true" />
        )}
      </div>
      
      {/* Pulse animation when chat is open */}
      {showChat && (
        <span className="absolute inset-0 rounded-full bg-pink-400 animate-ping opacity-20" />
      )}
    </button>
  );
};
