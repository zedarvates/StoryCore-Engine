import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minimize2, Maximize2, Move, Grip, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { LandingChatBox } from './launcher/LandingChatBox';
import { 
  loadChatPanelState, 
  saveChatPanelState,
  DEFAULT_CHAT_PANEL_STATE 
} from '@/utils/chatPanelStorage';
import './ChatPanel.css';

interface ChatPanelProps {
  className?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

const DEFAULT_POSITION = { x: 24, y: 24 };
const DEFAULT_SIZE = { width: 384, height: 500 };
const MIN_SIZE = { width: 300, height: 400 };
const MAX_SIZE_RATIO = 0.9;
const MINIMIZED_HEIGHT = 48;

// Calculate dynamic MAX_SIZE based on viewport
const getMaxSize = () => ({
  width: Math.floor(window.innerWidth * MAX_SIZE_RATIO),
  height: Math.floor(window.innerHeight * MAX_SIZE_RATIO),
});

export const ChatPanel: React.FC<ChatPanelProps> = ({
  className = '',
  position: initialPosition,
  size: initialSize,
}) => {
  const { showChat, setShowChat, chatPanelMinimized, setChatPanelMinimized, project } = useAppStore();
  const [position, setPosition] = useState(initialPosition || DEFAULT_POSITION);
  const [size, setSize] = useState(initialSize || DEFAULT_SIZE);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [previousState, setPreviousState] = useState<{ position: typeof position; size: typeof size } | null>(null);
  const [zIndex, setZIndex] = useState(50);
  const [maxSize, setMaxSize] = useState(getMaxSize());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });
  const animationFrameRef = useRef<number | null>(null);

  // Update max size on window resize
  useEffect(() => {
    const handleResize = () => setMaxSize(getMaxSize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dashboard-context aware positioning
  const getContextAwarePosition = useCallback(() => {
    // If a project is loaded, position closer to the center-right area
    if (project) {
      return {
        x: Math.floor(window.innerWidth * 0.6),
        y: Math.floor(window.innerHeight * 0.1),
      };
    }
    return DEFAULT_POSITION;
  }, [project]);

  // Load position and size from local storage
  useEffect(() => {
    const savedState = loadChatPanelState();
    if (savedState) {
      setPosition(savedState.position);
      setSize(savedState.size);
      setChatPanelMinimized(savedState.isMinimized);
    }
  }, [setChatPanelMinimized]);

  // Save position and size to local storage (debounced)
  useEffect(() => {
    if (showChat) {
      const timeoutId = setTimeout(() => {
        saveChatPanelState({
          position,
          size,
          isOpen: showChat,
          isMinimized: chatPanelMinimized,
        });
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [position, size, showChat, chatPanelMinimized]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    bringToFront();
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging || !panelRef.current) return;
    
    // Use requestAnimationFrame for smoother drag
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;
      
      // Keep panel within viewport with smooth boundaries
      const maxX = window.innerWidth - panelRef.current!.offsetWidth;
      const maxY = window.innerHeight - panelRef.current!.offsetHeight;
      
      // Apply smooth constraints
      const constrainedX = Math.max(0, Math.min(newX, maxX));
      const constrainedY = Math.max(0, Math.min(newY, maxY));
      
      setPosition({
        x: constrainedX,
        y: constrainedY,
      });
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartSize.current = { ...size };
    bringToFront();
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return;
    
    requestAnimationFrame(() => {
      const rect = panelRef.current!.getBoundingClientRect();
      const newWidth = Math.max(MIN_SIZE.width, Math.min(e.clientX - rect.left, maxSize.width));
      const newHeight = Math.max(MIN_SIZE.height, Math.min(e.clientY - rect.top, maxSize.height));
      
      setSize({
        width: newWidth,
        height: newHeight,
      });
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  const handleMinimize = () => {
    setChatPanelMinimized(!chatPanelMinimized);
  };

  const handleMaximize = () => {
    if (isMaximized && previousState) {
      // Restore previous state
      setPosition(previousState.position);
      setSize(previousState.size);
      setPreviousState(null);
    } else {
      // Save current state and maximize
      setPreviousState({ position, size });
      setPosition({ x: 0, y: 0 });
      setSize({ 
        width: window.innerWidth - 48, 
        height: window.innerHeight - 48 
      });
    }
    setIsMaximized(!isMaximized);
  };

  const bringToFront = () => {
    setZIndex(51);
  };

  const handlePanelClick = () => {
    if (zIndex < 51) {
      bringToFront();
    }
  };

  const handleHeaderDoubleClick = () => {
    handleMaximize();
  };

  // Handle open/close animations
  useEffect(() => {
    if (showChat) {
      setIsOpening(true);
      const timer = setTimeout(() => setIsOpening(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showChat]);

  // Handle close animation
  useEffect(() => {
    if (!showChat && isClosing) {
      const timer = setTimeout(() => {
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showChat, isClosing]);

  // Add event listeners for drag and resize
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }
    
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isDragging, isResizing]);

  // Handle close with animation
  const handleCloseWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowChat(false);
      setIsClosing(false);
    }, 280);
  };

  return (
    <>
      {/* Overlay for mobile - only show when chat is open */}
      {showChat && !isClosing && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden chat-backdrop chat-backdrop-opening"
          onClick={handleCloseWithAnimation}
        />
      )}

      {/* Floating Chat Window */}
      <div
        ref={panelRef}
        onClick={handlePanelClick}
        className={`
          fixed bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700 
          flex flex-col overflow-hidden chat-panel
          ${isOpening ? 'chat-panel-opening' : ''}
          ${isClosing ? 'chat-panel-closing' : ''}
          ${isDragging ? 'chat-panel-dragging' : ''}
          ${className}
        `}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: chatPanelMinimized ? `${MINIMIZED_HEIGHT}px` : `${size.height}px`,
          zIndex,
          cursor: isDragging ? 'grabbing' : 'auto',
          display: (showChat || isClosing) ? 'flex' : 'none',
        }}
      >
        {/* Drag Handle (invisible overlay on header) */}
        <div
          ref={dragHandleRef}
          className="absolute top-0 left-0 right-0 h-12 cursor-move z-10"
          onMouseDown={handleDragStart}
          onDoubleClick={handleHeaderDoubleClick}
        />

        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 cursor-move hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              StoryCore AI Assistant
            </h3>
          </div>
          <div className="flex items-center gap-2 z-20">
            {/* Shortcuts Toggle */}
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className={`p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors ${showShortcuts ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
              aria-label="Show keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <span className="text-xs font-semibold px-1">?</span>
            </button>
            {/* Maximize/Restore Button */}
            <button
              onClick={handleMaximize}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors"
              aria-label={isMaximized ? "Restore chat" : "Maximize chat"}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            {/* Minimize Button */}
            <button
              onClick={handleMinimize}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors"
              aria-label={chatPanelMinimized ? "Restore chat" : "Minimize chat"}
              title={chatPanelMinimized ? "Restore" : "Minimize"}
            >
              {chatPanelMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </button>
            {/* Close Button */}
            <button
              onClick={handleCloseWithAnimation}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors chat-btn"
              aria-label="Close chat"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Panel */}
        {showShortcuts && !chatPanelMinimized && (
          <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 text-xs">
            <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
              <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> Send</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Shift+Enter</kbd> New line</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Drag</kbd> Move panel</div>
              <div><kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Resize</kbd> Corner drag</div>
            </div>
          </div>
        )}

        {/* Chat Content */}
        {!chatPanelMinimized && (
          <div className="flex-1 overflow-hidden">
            <LandingChatBox 
              placeholder="Ask for modifications, ask questions about your project..."
              height={size.height - 48}
              context="project"
            />
          </div>
        )}

        {/* Resize Handle */}
        {!chatPanelMinimized && (
          <>
            <div
              ref={resizeHandleRef}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
              onMouseDown={handleResizeStart}
            />

            {/* Resize Handle Visual */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 hover:bg-blue-600 rounded-tl-lg cursor-nwse-resize transition-colors"
              onMouseDown={handleResizeStart}
            >
              <Grip className="w-3 h-3 text-white" />
            </div>
          </>
        )}
      </div>
    </>
  );
};