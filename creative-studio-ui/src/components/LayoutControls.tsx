import React from 'react';
import { PanelLeftClose, PanelLeftOpen, MessageSquare, RotateCcw } from 'lucide-react';
import { usePanelVisibility } from '@/hooks/usePanelVisibility';

interface LayoutControlsProps {
  className?: string;
}

export const LayoutControls: React.FC<LayoutControlsProps> = ({ className = '' }) => {
  const {
    showChat,
    toggleChat,
    toggleAssetLibrary,
    resetPanelSizes,
    isAssetLibraryVisible,
  } = usePanelVisibility();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Asset Library Toggle */}
      <button
        onClick={() => toggleAssetLibrary(!isAssetLibraryVisible)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isAssetLibraryVisible
            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={isAssetLibraryVisible ? 'Hide Asset Library' : 'Show Asset Library'}
        aria-label={isAssetLibraryVisible ? 'Hide Asset Library' : 'Show Asset Library'}
      >
        {isAssetLibraryVisible ? (
          <PanelLeftClose className="w-4 h-4" />
        ) : (
          <PanelLeftOpen className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">Assets</span>
      </button>

      {/* Chat Toggle */}
      <button
        onClick={toggleChat}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          showChat
            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title={showChat ? 'Hide Chat' : 'Show Chat'}
        aria-label={showChat ? 'Hide Chat' : 'Show Chat'}
      >
        <MessageSquare className="w-4 h-4" />
        <span className="text-sm font-medium">Chat</span>
      </button>

      {/* Reset Layout */}
      <button
        onClick={resetPanelSizes}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        title="Reset Layout"
        aria-label="Reset Layout"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="text-sm font-medium">Reset</span>
      </button>
    </div>
  );
};
