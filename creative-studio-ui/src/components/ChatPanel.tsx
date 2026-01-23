import React, { useState, useEffect, useRef } from 'react';
import { X, Minimize2, Move, Grip } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { ChatBox } from './ChatBox';

interface ChatPanelProps {
  className?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

const DEFAULT_POSITION = { x: 24, y: 24 };
const DEFAULT_SIZE = { width: 384, height: 500 };
const STORAGE_KEY = 'chatPanelState';

export const ChatPanel: React.FC<ChatPanelProps> = ({
  className = '',
  position: initialPosition,
  size: initialSize,
}) => {
  const { showChat, setShowChat } = useAppStore();
  const [position, setPosition] = useState(initialPosition || DEFAULT_POSITION);
  const [size, setSize] = useState(initialSize || DEFAULT_SIZE);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Load position and size from local storage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        setPosition(parsedState.position || position);
        setSize(parsedState.size || size);
      } catch (error) {
        console.error('Failed to parse saved chat panel state:', error);
      }
    }
  }, []);

  // Save position and size to local storage
  useEffect(() => {
    if (showChat) {
      const stateToSave = { position, size };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [position, size, showChat]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDragging || !panelRef.current) return;
    
    const newX = e.clientX - panelRef.current.offsetWidth / 2;
    const newY = e.clientY - panelRef.current.offsetHeight / 2;
    
    // Keep panel within viewport
    const maxX = window.innerWidth - panelRef.current.offsetWidth;
    const maxY = window.innerHeight - panelRef.current.offsetHeight;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return;
    
    const newWidth = Math.max(300, e.clientX - panelRef.current.getBoundingClientRect().left);
    const newHeight = Math.max(400, e.clientY - panelRef.current.getBoundingClientRect().top);
    
    setSize({
      width: newWidth,
      height: newHeight,
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

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
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isDragging, isResizing]);

  if (!showChat) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={() => setShowChat(false)}
      />

      {/* Floating Chat Window */}
      <div
        ref={panelRef}
        className={`fixed bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden ${className}`}
        style={
          {
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            cursor: isDragging ? 'grabbing' : 'auto',
          }
        }
      >
        {/* Drag Handle */}
        <div
          ref={dragHandleRef}
          className="absolute top-0 left-0 right-0 h-8 cursor-move z-10"
          onMouseDown={handleDragStart}
        />

        {/* Resize Handle */}
        <div
          ref={resizeHandleRef}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
          onMouseDown={handleResizeStart}
        />

        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Assistant
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(false)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              aria-label="Minimize chat"
              title="Minimize"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowChat(false)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
              aria-label="Close chat"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          <ChatBox className="h-full" />
        </div>

        {/* Resize Handle Visual */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-bl-lg cursor-nwse-resize"
          onMouseDown={handleResizeStart}
        >
          <Grip className="w-3 h-3 text-white" />
        </div>
      </div>
    </>
  );
};